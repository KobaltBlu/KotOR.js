import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptExpression, NWScriptExpressionType } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { NWScriptFunctionParameter } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import {
  inferActionReturnFromStoreCleanup,
  type JsrUserRoutineMeta,
} from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import type { DelayCommandThunkArg } from "@/nwscript/decompiler/NWScriptStoreStateThunkSkip";
import {
  getArithmeticTypeSignature,
  getBinaryResultDataType,
  getComparisonTypeSignature,
  getUnaryDataType,
  stackSlotsForByteSize,
  stackSlotsForDataType,
  toSignedInt32,
} from "@/nwscript/decompiler/NWScriptOpcodeSemantics";
import {
  OP_CONST, OP_ACTION, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MODII,
  OP_EQUAL, OP_NEQUAL, OP_GT, OP_GEQ, OP_LT, OP_LEQ,
  OP_LOGANDII, OP_LOGORII, OP_BOOLANDII, OP_INCORII, OP_EXCORII,
  OP_SHLEFTII, OP_SHRIGHTII, OP_USHRIGHTII,
  OP_NEG, OP_COMPI, OP_NOTI,
  OP_CPTOPBP, OP_CPTOPSP, OP_CPDOWNSP, OP_CPDOWNBP,
  OP_MOVSP, OP_DESTRUCT, OP_RSADD,
  OP_DECISP, OP_INCISP, OP_DECIBP, OP_INCIBP,
  OP_JSR, OP_JZ, OP_JNZ,
} from "@/nwscript/NWScriptOPCodes";
/**
 * Represents an item on the stack
 */
export interface StackItem {
  expression: NWScriptExpression;
  address: number; // Instruction address that created this item
  /** Number of physical four-byte NCS stack slots represented by this logical value. */
  slotWidth: number;
}

export interface NWScriptStackSnapshot {
  stack: StackItem[];
  stackPointer: number;
  basePointer: number;
}

export interface NWScriptGlobalAggregateLayout {
  name: string;
  dataType: NWScriptDataType.VECTOR | NWScriptDataType.STRUCTURE;
  fieldTypes: NWScriptDataType[];
}

/** Optional source identity for an RSADD-backed frame allocation. */
export interface NWScriptFrameVariableIdentity {
  name: string;
  dataType: NWScriptDataType;
  isGlobal?: boolean;
  structureFieldTypes?: NWScriptDataType[];
}

type ActionThunkArgument = NWScriptExpression | DelayCommandThunkArg;

export class NWScriptStackAnalysisError extends Error {
  readonly instructionAddress: number;

  constructor(instruction: NWScriptInstruction, message: string) {
    super(`0x${instruction.address.toString(16).padStart(8, '0')} ${instruction.codeName || `OP_${instruction.code}`}: ${message}`);
    this.name = 'NWScriptStackAnalysisError';
    this.instructionAddress = instruction.address;
  }
}

/**
 * Simulates the NWScript stack during decompilation.
 * Tracks stack pointer (SP) and stack contents accurately.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptStackSimulator.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptStackSimulator {
  /**
   * The stack (array of stack items)
   * Index 0 is the bottom of the stack, higher indices are closer to the top
   */
  private stack: StackItem[] = [];

  /**
   * Current stack pointer (SP) - points to the top of the stack
   * In NWScript, SP points to the next available slot
   */
  private stackPointer: number = 0;

  /**
   * Current base pointer (BP) - for global variable access
   */
  private basePointer: number = 0;

  /**
   * Function parameters (for mapping CPTOPBP offsets to parameter names)
   */
  private functionParameters: Map<
    number,
    {
      name: string;
      dataType: NWScriptDataType;
      stackSlots?: number;
      structureFieldTypes?: NWScriptDataType[];
    }
  > = new Map();

  /** CPTOPSP-only parameters: CPTOPSP signed offset operand → formal */
  private cptopspParameterOperands: Map<
    number,
    {
      name: string;
      dataType: NWScriptDataType;
      stackSlots?: number;
      structureFieldTypes?: NWScriptDataType[];
    }
  > = new Map();
  
  /**
   * Global variables (for mapping CPTOPBP positive offsets to global variable names)
   */
  private globalVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();

  /** First BP byte offset → whole source aggregate represented by flattened global slots. */
  private globalAggregateLayouts: Map<number, NWScriptGlobalAggregateLayout> = new Map();
  
  /**
   * Local variables (for mapping CPTOPSP offsets to local variable names)
   * This is a static mapping based on heuristics - kept for backward compatibility
   */
  private localVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  
  /**
   * Stack position to variable index mapping (for dynamic stack-aware variable resolution)
   * Key: stack position (absolute), Value: variable index
   * This is set by the converter and used for accurate CPTOPSP resolution
   */
  private variableStackPositions: Map<number, number> = new Map();

  /** RSADD instruction address to canonical `localVar_i` index. */
  private localVariableAllocationIndices: Map<number, number> = new Map();

  /** Source identities used when a non-local frame (notably pre-SAVEBP globals) uses SP access. */
  private frameVariableIdentities: Map<number, NWScriptFrameVariableIdentity> = new Map();

  /** Whole-value identities for flattened multi-slot allocations. */
  private frameAggregateIdentities: Map<number, NWScriptFrameVariableIdentity> = new Map();

  /** First allocation index for each three-slot local represented as one source vector. */
  private vectorLocalAllocationStarts: Set<number> = new Set();

  /** First allocation index → flattened fields for each synthesized local user struct. */
  private structureLocalLayouts: Map<number, NWScriptDataType[]> = new Map();

  /** Optional procedure-scoped sink for type evidence discovered at typed consumers. */
  private variableTypeObserver?: (name: string, dataType: NWScriptDataType) => void;
  
  /**
   * Local variable initializations (for looking up variable info by index)
   * Set by the converter to provide variable names and types
   */
  private localVariableInits: Array<{ offset: number, dataType: NWScriptDataType, hasInitializer: boolean, initialValue?: any }> = [];

  /** Callee entry PC → caller-side dword slots cleared when JSR returns (parameter spill). */
  private jsrCalleeArgSlotsByEntryPc: Map<number, number> = new Map();

  /** Callee entry PC → user subroutine (for JSR → {@link NWScriptExpression.functionCall}). */
  private jsrUserRoutineMetaByEntryPc: Map<number, JsrUserRoutineMeta> = new Map();

  /** ACTION instruction PC → source expression recovered from its STORE_STATE thunk. */
  private actionThunkArgumentByActionAddress: Map<number, ActionThunkArgument> = new Map();

  /** Recoverable warnings. Stack underflow and malformed widths throw instead. */
  private diagnostics: string[] = [];

  /** Logical values explicitly discarded by the most recently processed MOVSP. */
  private discardedExpressions: NWScriptExpression[] = [];

  setJsrCalleeArgSlotsByEntryPc(map: Map<number, number>): void {
    this.jsrCalleeArgSlotsByEntryPc = map;
  }

  setJsrUserRoutineMetaByEntryPc(map: Map<number, JsrUserRoutineMeta>): void {
    this.jsrUserRoutineMetaByEntryPc = map;
  }

  setDelayCommandThunkSecondArg(map: Map<number, ActionThunkArgument>): void {
    this.actionThunkArgumentByActionAddress = map;
  }

  setActionThunkArgumentByActionAddress(map: Map<number, ActionThunkArgument>): void {
    this.actionThunkArgumentByActionAddress = map;
  }

  /** Resolve DelayCommand thunk second arg (JSR callee or nested AssignCommand). */
  private resolveActionThunkArgument(arg: ActionThunkArgument): NWScriptExpression {
    if (arg instanceof NWScriptExpression) {
      return arg;
    }
    if (arg.type === "expression") {
      return arg.expression;
    }
    const objectExpr = this.expressionFromObjectSubjectInstr(arg.objectInstr);
    const nested = this.remapThunkScriptObjectArgsToSubject(arg.nestedScript, objectExpr);
    return NWScriptExpression.functionCall(
      "AssignCommand",
      [objectExpr, nested],
      NWScriptDataType.VOID
    );
  }

  /**
   * Replace local object variables inside a STORE_STATE thunk script with {@code subject}
   * (AssignCommand's oActionSubject). Thunk CPTOPSP -4 is the copy-frame top, not localVar_0.
   */
  private remapThunkScriptObjectArgsToSubject(
    expr: NWScriptExpression,
    subject: NWScriptExpression
  ): NWScriptExpression {
    if (expr.type === NWScriptExpressionType.FUNCTION_CALL) {
      const newArgs = (expr.arguments || []).map((arg) => {
        if (
          arg.type === NWScriptExpressionType.VARIABLE &&
          !arg.isGlobal &&
          arg.dataType === NWScriptDataType.OBJECT
        ) {
          return subject;
        }
        return this.remapThunkScriptObjectArgsToSubject(arg, subject);
      });
      return NWScriptExpression.functionCall(
        expr.functionName || "/*thunk*/",
        newArgs,
        expr.dataType ?? NWScriptDataType.VOID
      );
    }
    if (
      expr.type === NWScriptExpressionType.VARIABLE &&
      !expr.isGlobal &&
      expr.dataType === NWScriptDataType.OBJECT
    ) {
      return subject;
    }
    return expr;
  }

  /** Build object expression from CPTOP or CONST without mutating the live stack. */
  private expressionFromObjectSubjectInstr(instruction: NWScriptInstruction): NWScriptExpression {
    if (instruction.code === OP_CPTOPSP || instruction.code === OP_CPTOPBP) {
      // handleVariableRead pushes the read as a stack effect; undo it, this is only a name resolution.
      const expr = this.handleVariableRead(instruction);
      this.pop();
      return expr;
    }
    if (instruction.code === OP_CONST) {
      const typeCode = instruction.type ?? 0;
      if (typeCode === NWScriptDataType.OBJECT || typeCode === 0x06) {
        return NWScriptExpression.constant(
          instruction.object ?? instruction.integer ?? instruction.value ?? 0,
          NWScriptDataType.OBJECT
        );
      }
      return NWScriptExpression.constant(
        instruction.integer ?? instruction.value ?? 0,
        NWScriptDataType.OBJECT
      );
    }
    return NWScriptExpression.constant(0, NWScriptDataType.OBJECT);
  }

  /**
   * Seed the procedure-entry value stack from the NWScript calling convention.
   *
   * A non-void caller reserves the result first, then pushes formal arguments in reverse order;
   * therefore argument one is at TOS when the callee starts. Keeping those physical values in
   * the model lets the callee's tail MOVSP remove arguments without underflowing an otherwise
   * empty analysis stack.
   *
   * @returns entry SP relative to the bottom of this procedure frame, in bytes.
   */
  initializeFunctionFrame(
    returnType: NWScriptDataType,
    parameters: NWScriptFunctionParameter[],
    returnStackSlots = stackSlotsForDataType(returnType),
    returnStructureFieldTypes?: NWScriptDataType[]
  ): number {
    this.stack = [];
    this.stackPointer = 0;

    const returnSlots = returnStackSlots;
    if (returnSlots > 0) {
      const reservation = NWScriptExpression.unknown(
        'caller return-value reservation',
        returnType
      );
      reservation.structureFieldTypes = returnStructureFieldTypes ?? [];
      this.push(
        reservation,
        -1,
        returnSlots
      );
    }

    const formals = [...parameters].sort((left, right) => right.offset - left.offset);
    for (const parameter of formals.reverse()) {
      const slots = parameter.stackSlots ?? stackSlotsForDataType(parameter.dataType);
      if (slots === 0) continue;
      const expression = NWScriptExpression.variable(parameter.name, parameter.dataType);
      expression.structureFieldTypes = parameter.structureFieldTypes ?? [];
      this.push(
        expression,
        -1,
        slots
      );
    }

    return this.stackPointer;
  }

  /**
   * Track stack state at each instruction address (for debugging/analysis)
   * OPTIMIZATION: Only save snapshots when explicitly requested (e.g., for debugging)
   */
  private stackSnapshots: Map<number, StackItem[]> = new Map();
  private enableSnapshots: boolean = false; // Disabled by default for performance

  /**
   * Enable or disable stack snapshots (for debugging)
   */
  setSnapshotEnabled(enabled: boolean): void {
    this.enableSnapshots = enabled;
    if (!enabled) {
      this.stackSnapshots.clear();
    }
  }

  /**
   * Process an instruction and update the stack state
   */
  processInstruction(instruction: NWScriptInstruction): NWScriptExpression | null {
    this.discardedExpressions = [];
    // OPTIMIZATION: Only save snapshot if snapshots are enabled (for debugging)
    if (this.enableSnapshots) {
      this.saveSnapshot(instruction.address);
    }

    switch (instruction.code) {
      case OP_CONST:
        return this.handleConst(instruction);
      
      case OP_ADD:
      case OP_SUB:
      case OP_MUL:
      case OP_DIV:
      case OP_MODII:
        return this.handleBinaryOp(instruction);
      
      case OP_EQUAL:
      case OP_NEQUAL:
      case OP_GT:
      case OP_GEQ:
      case OP_LT:
      case OP_LEQ:
        return this.handleComparison(instruction);
      
      case OP_LOGANDII:
      case OP_LOGORII:
      case OP_BOOLANDII:
        return this.handleLogical(instruction);
      
      case OP_INCORII:
      case OP_EXCORII:
        return this.handleBitwise(instruction);
      
      case OP_SHLEFTII:
      case OP_SHRIGHTII:
      case OP_USHRIGHTII:
        return this.handleShiftOp(instruction);
      
      case OP_NEG:
      case OP_COMPI:
      case OP_NOTI:
        return this.handleUnaryOp(instruction);
      
      case OP_ACTION:
        return this.handleAction(instruction);

      case OP_JSR:
        return this.handleJsr(instruction);

      case OP_JZ:
      case OP_JNZ:
        return this.handleConditionalJump(instruction);
      
      case OP_CPTOPBP:
      case OP_CPTOPSP:
        return this.handleVariableRead(instruction);
      
      case OP_CPDOWNSP:
        return this.handleLocalWrite(instruction);
      
      case OP_CPDOWNBP:
        return this.handleGlobalWrite(instruction);
      
      case OP_MOVSP:
        this.handleMovsp(instruction);
        return null;
      
      case OP_DESTRUCT:
        this.handleDestruct(instruction);
        return null;
      
      case OP_RSADD:
        this.handleRsadd(instruction);
        return null;
      
      case OP_DECISP:
      case OP_INCISP:
        return this.handleLocalIncrement(instruction);
      
      case OP_DECIBP:
      case OP_INCIBP:
        return this.handleGlobalIncrement(instruction);
      
      default:
        // Other instructions don't affect the stack
        return null;
    }
  }

  /**
   * Handle CONST instruction (push constant onto stack)
   */
  private handleConst(instruction: NWScriptInstruction): NWScriptExpression {
    let value: any;
    let dataType: NWScriptDataType;

    switch (instruction.type) {
      case 3: // INTEGER
        if (typeof instruction.integer !== 'number' || !Number.isInteger(instruction.integer)) {
          throw new NWScriptStackAnalysisError(instruction, 'CONSTI is missing a finite integer payload');
        }
        value = instruction.integer;
        dataType = NWScriptDataType.INTEGER;
        break;
      case 4: // FLOAT
        if (typeof instruction.float !== 'number' || !Number.isFinite(instruction.float)) {
          throw new NWScriptStackAnalysisError(instruction, 'CONSTF is missing a finite float payload');
        }
        value = instruction.float;
        dataType = NWScriptDataType.FLOAT;
        break;
      case 5: // STRING
        if (typeof instruction.string !== 'string') {
          throw new NWScriptStackAnalysisError(instruction, 'CONSTS is missing its string payload');
        }
        value = instruction.string;
        dataType = NWScriptDataType.STRING;
        break;
      case 6: // OBJECT
        if (typeof instruction.object !== 'number' || !Number.isFinite(instruction.object)) {
          throw new NWScriptStackAnalysisError(instruction, 'CONSTO is missing a finite object payload');
        }
        value = instruction.object;
        dataType = NWScriptDataType.OBJECT;
        break;
      default:
        throw new NWScriptStackAnalysisError(instruction, `unsupported CONST type 0x${instruction.type.toString(16)}`);
    }

    const expr = NWScriptExpression.constant(value, dataType);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle binary arithmetic operations
   */
  private handleBinaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    const signature = getArithmeticTypeSignature(instruction.code, instruction.type);
    if (!signature) {
      throw new NWScriptStackAnalysisError(instruction, `unsupported binary type 0x${instruction.type.toString(16)}`);
    }

    const right = this.popTypedValue(signature.right, instruction, 'right operand');
    const left = this.popTypedValue(signature.left, instruction, 'left operand');
    const operator = this.getBinaryOperator(instruction.code);
    const dataType = getBinaryResultDataType(instruction.type);
    
    const expr = NWScriptExpression.binaryOp(operator, left, right, dataType);
    this.push(expr, instruction.address, stackSlotsForDataType(dataType));
    return expr;
  }

  /**
   * Handle comparison operations
   */
  private handleComparison(instruction: NWScriptInstruction): NWScriptExpression {
    let left: NWScriptExpression;
    let right: NWScriptExpression;
    if (instruction.type === NWScriptDataType.STRUCTURE) {
      const slots = stackSlotsForByteSize(instruction.sizeOfStructure, 'EQUAL/NEQUAL structure');
      right = this.popSlotsAsValue(slots, NWScriptDataType.STRUCTURE, instruction, 'right structure');
      left = this.popSlotsAsValue(slots, NWScriptDataType.STRUCTURE, instruction, 'left structure');
    } else {
      const signature = getComparisonTypeSignature(instruction.code, instruction.type);
      if (!signature) {
        throw new NWScriptStackAnalysisError(instruction, `unsupported comparison type 0x${instruction.type.toString(16)}`);
      }
      right = this.popTypedValue(signature.right, instruction, 'right operand');
      left = this.popTypedValue(signature.left, instruction, 'left operand');
    }
    const operator = this.getComparisonOperator(instruction.code);

    let expr: NWScriptExpression;
    if (
      instruction.type === NWScriptDataType.STRUCTURE &&
      left.components.length > 0 &&
      left.components.length === right.components.length
    ) {
      const comparisons = left.components.map((component, index) =>
        NWScriptExpression.comparison(operator, component, right.components[index])
      );
      expr = comparisons.slice(1).reduce(
        (combined, comparison) => NWScriptExpression.logical(
          instruction.code === OP_EQUAL ? '&&' : '||',
          combined,
          comparison
        ),
        comparisons[0]
      );
    } else {
      expr = NWScriptExpression.comparison(operator, left, right);
    }
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle logical operations
   */
  private handleLogical(instruction: NWScriptInstruction): NWScriptExpression {
    const right = this.popTypedValue(NWScriptDataType.INTEGER, instruction, 'right logical operand');
    const left = this.popTypedValue(NWScriptDataType.INTEGER, instruction, 'left logical operand');
    const operator = this.getLogicalOperator(instruction.code);
    
    const expr = NWScriptExpression.logical(operator, left, right);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle bitwise operations
   */
  private handleBitwise(instruction: NWScriptInstruction): NWScriptExpression {
    const right = this.popTypedValue(NWScriptDataType.INTEGER, instruction, 'right bitwise operand');
    const left = this.popTypedValue(NWScriptDataType.INTEGER, instruction, 'left bitwise operand');
    const operator = instruction.code === OP_INCORII ? '|' : '^';
    
    const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle shift operations
   */
  private handleShiftOp(instruction: NWScriptInstruction): NWScriptExpression {
    const right = this.popTypedValue(NWScriptDataType.INTEGER, instruction, 'shift count');
    const left = this.popTypedValue(NWScriptDataType.INTEGER, instruction, 'shift value');
    
    let operator: string;
    switch (instruction.code) {
      case OP_SHLEFTII: operator = '<<'; break;
      case OP_SHRIGHTII: operator = '>>'; break;
      case OP_USHRIGHTII: operator = '>>>'; break;
      default: operator = '?';
    }
    
    const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle unary operations
   */
  private handleUnaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    const operator = this.getUnaryOperator(instruction.code);
    const dataType = getUnaryDataType(instruction.type);
    if (
      dataType === null ||
      (instruction.code !== OP_NEG && dataType !== NWScriptDataType.INTEGER) ||
      (instruction.code === OP_NEG && dataType !== NWScriptDataType.INTEGER && dataType !== NWScriptDataType.FLOAT)
    ) {
      throw new NWScriptStackAnalysisError(
        instruction,
        `unsupported unary type 0x${instruction.type.toString(16)}`
      );
    }
    const operand = this.popTypedValue(dataType, instruction, 'unary operand');
    
    const expr = NWScriptExpression.unaryOp(operator, operand, dataType);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Caller-side JSR: callee MOVSP clears argument slots before RETN; pop them here so the
   * caller stack model matches real execution after return.
   */
  private handleJsr(instruction: NWScriptInstruction): NWScriptExpression | null {
    if (instruction.offset === undefined) {
      return null;
    }
    const targetPc = instruction.address + toSignedInt32(instruction.offset);
    const slots = this.jsrCalleeArgSlotsByEntryPc.get(targetPc) ?? 0;
    const meta = this.jsrUserRoutineMetaByEntryPc.get(targetPc);

    if (meta) {
      const args: NWScriptExpression[] = [];
      // A recovered user-routine signature is authoritative, including an empty
      // parameter list. The raw backward stack delta also sees local allocations and
      // return reservations; treating that fallback as arguments made calls such as
      // `sub3()` become `sub3(0)` whenever an unrelated RSADD preceded the JSR.
      for (const parameter of meta.parameters) {
        args.push(this.popTypedValue(
          parameter.dataType,
          instruction,
          `argument ${parameter.name}`,
          parameter.stackSlots
        ));
      }

      const expr = NWScriptExpression.functionCall(meta.name, args, meta.returnType);
      expr.structureFieldTypes = meta.returnStructureFieldTypes ?? [];
      if (meta.returnType !== NWScriptDataType.VOID) {
        // The caller reserves the result before pushing arguments. Replace those reserved
        // slots with the call expression instead of appending a second result value.
        this.discardSlots(
          meta.returnStackSlots,
          instruction,
          'JSR return reservation'
        );
        this.push(expr, instruction.address, meta.returnStackSlots);
      }
      return expr;
    }

    if (slots > 0) {
      this.discardSlots(slots, instruction, 'JSR arguments');
    }
    return null;
  }

  /**
   * Handle ACTION (function call)
   */
  private handleAction(instruction: NWScriptInstruction): NWScriptExpression | null {
    const actionDef = instruction.actionDefinition;
    const rawArgCount = instruction.argCount ?? 0;
    if (!Number.isInteger(rawArgCount) || rawArgCount < 0) {
      throw new NWScriptStackAnalysisError(instruction, `invalid ACTION argument count ${rawArgCount}`);
    }
    const argCount = rawArgCount;

    const storeResult = inferActionReturnFromStoreCleanup(instruction);

    if (!actionDef) {
      const returnType = storeResult?.dataType ?? NWScriptDataType.VOID;
      this.diagnostics.push(
        `0x${instruction.address.toString(16)}: ACTION ${instruction.action} has no signature; assuming ${argCount} scalar arguments` +
          (storeResult
            ? ` and a ${storeResult.stackSlots}-slot return from ACTION/CPDOWNSP/MOVSP store cleanup`
            : ' and void return')
      );
      const args = argCount > 0
        ? this.popScalarArgumentsBySlotCount(argCount, instruction, 'unknown ACTION arguments')
        : [];
      const expr = NWScriptExpression.functionCall(
        `__NCS_ACTION_${instruction.action}__`,
        args,
        returnType
      );
      if (storeResult) {
        this.push(expr, instruction.address, storeResult.stackSlots);
      }
      return expr;
    }

    const args: NWScriptExpression[] = [];

    if (argCount > actionDef.args.length) {
      throw new NWScriptStackAnalysisError(
        instruction,
        `ACTION declares ${argCount} arguments but ${actionDef.name} has only ${actionDef.args.length}`
      );
    }

    // The compiler pushes formal arguments in reverse order, so the first formal argument is
    // at TOS. Pop in signature order; VECTOR consumes three physical float slots.
    for (let i = 0; i < argCount; i++) {
      const dataType = actionDef.args[i];
      if (dataType === NWScriptDataType.ACTION) {
        const thunkArg = this.actionThunkArgumentByActionAddress.get(instruction.address);
        args.push(
          thunkArg
            ? this.resolveActionThunkArgument(thunkArg)
            : NWScriptExpression.unknown(`ACTION thunk argument ${i + 1}`, NWScriptDataType.ACTION)
        );
      } else {
        args.push(this.popTypedValue(dataType, instruction, `argument ${i + 1} of ${actionDef.name}`));
      }
    }

    const functionName = actionDef.name || `Action_${instruction.action}`;
    const returnType =
      storeResult &&
      (actionDef.type === NWScriptDataType.VOID || actionDef.type === NWScriptDataType.ACTION)
        ? storeResult.dataType
        : (actionDef.type || NWScriptDataType.VOID);

    const expr = NWScriptExpression.functionCall(functionName, args, returnType);

    if (returnType !== NWScriptDataType.VOID) {
      this.push(
        expr,
        instruction.address,
        storeResult?.stackSlots ?? stackSlotsForDataType(returnType)
      );
    }

    return expr;
  }

  private handleConditionalJump(instruction: NWScriptInstruction): NWScriptExpression {
    return this.popTypedValue(NWScriptDataType.INTEGER, instruction, 'branch condition');
  }

  /**
   * Handle variable read (CPTOPBP/CPTOPSP)
   */
  private handleVariableRead(instruction: NWScriptInstruction): NWScriptExpression {
    const isGlobal = instruction.code === OP_CPTOPBP;
    const width = instruction.size === undefined
      ? 1
      : stackSlotsForByteSize(instruction.size, instruction.codeName || 'CPTOP');
    let expressionIsGlobal = isGlobal;
    let varName: string;
    let dataType: NWScriptDataType;
    
    if (isGlobal && instruction.offset !== undefined) {
      // Check if this is a function parameter (negative offset)
      const offset = instruction.offset;
      const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;

      if (offsetSigned < 0 && this.functionParameters.has(offsetSigned)) {
        const parameter = this.functionParameters.get(offsetSigned)!;
        const expression = NWScriptExpression.variable(
          parameter.name,
          parameter.dataType
        );
        expression.structureFieldTypes = parameter.structureFieldTypes ?? [];
        this.push(expression, instruction.address, width);
        return expression;
      }

      if (width > 1) {
        return this.copyGlobalFrameRange(offsetSigned, width, instruction);
      }

      if (this.globalVariables.has(offsetSigned)) {
        const globalVar = this.globalVariables.get(offsetSigned)!;
        varName = globalVar.name;
        dataType = globalVar.dataType;
      } else {
        // Unknown - stable label from signed stack offset operand
        varName = this.generateVariableName(true, offsetSigned);
        dataType = NWScriptDataType.INTEGER; // Default, could be improved
      }
    } else {
      const offset = instruction.offset ?? 0;
      const offsetSigned = toSignedInt32(offset);
      
      // Calculate the actual stack position this instruction reads from
      const sourceStackPos = this.stackPointer + offsetSigned;

      if (width > 1) {
        // Parameters and return reservations are seeded as logical multi-slot values rather than
        // RSADD-backed locals. Prefer a proven local-frame identity when one exists; otherwise
        // copy the represented logical value so a vector formal remains `vectorParamN` instead
        // of becoming three unresolved local fields.
        if (this.getLocalVariableIndexAtStackPosition(sourceStackPos) === undefined) {
          const representedValue = this.readRepresentedStackValue(
            sourceStackPos,
            width,
            this.dataTypeForCopyWidth(instruction.size),
            instruction
          );
          if (representedValue) {
            this.push(representedValue, instruction.address, width);
            return representedValue;
          }
        }
        return this.copyLocalFrameRange(sourceStackPos, width, instruction);
      }
      
      // First, try to resolve using the dynamic stack position map (stack-aware)
      const varIndex = this.getLocalVariableIndexAtStackPosition(sourceStackPos);
      if (varIndex !== undefined) {
        // RSADD-registered slot: analyzer may have no NWScriptLocalInit row (non −8 CPDOWNSP patterns).
        const init = this.localVariableInits[varIndex];
        const identity = this.frameVariableIdentities.get(varIndex);
        varName = identity?.name ?? `localVar_${varIndex}`;
        dataType = identity?.dataType ?? (width === 3
          ? NWScriptDataType.VECTOR
          : init?.dataType ?? NWScriptDataType.INTEGER);
        expressionIsGlobal = identity?.isGlobal ?? false;
      } else {
        const spParam = this.cptopspParameterOperands.get(offsetSigned);
        const staticLocal = this.localVariables.get(offsetSigned) ?? this.localVariables.get(offset >>> 0);
        // Raw CPTOPSP operands are relative to the *current* SP and are reused for parameters,
        // locals, and temporaries as the stack changes. Prefer the represented physical frame;
        // an offset-only local map is merely a fallback for partial expression probes.
        const copiedValue = this.readRepresentedStackValue(
          sourceStackPos,
          width,
          this.dataTypeForCopyWidth(instruction.size),
          instruction
        );
        if (copiedValue) {
          this.push(copiedValue, instruction.address, width);
          return copiedValue;
        }
        if (staticLocal) {
          varName = staticLocal.name;
          dataType = staticLocal.dataType;
        } else {
          if (spParam) {
            // Compatibility fallback for expression probes that do not have a seeded frame.
            varName = spParam.name;
            dataType = spParam.dataType;
          } else {
            varName = this.generateVariableName(false, offsetSigned);
            dataType = this.dataTypeForCopyWidth(instruction.size);
            this.diagnostics.push(
              `0x${instruction.address.toString(16)}: no exact local mapping for SP ${sourceStackPos} (${offsetSigned >= 0 ? '+' : ''}${offsetSigned})`
            );
          }
        }
      }
    }
    
    const expr = NWScriptExpression.variable(varName, dataType, expressionIsGlobal);
    this.push(expr, instruction.address, width);
    return expr;
  }

  /**
   * Preserve each physical field of a multi-slot SP copy. User-struct fields and vector
   * components are compiled as a whole-frame CPTOPSP followed by DESTRUCT; retaining scalar
   * StackItems lets that DESTRUCT select the actual local instead of cutting through an opaque
   * aggregate value.
   */
  private copyLocalFrameRange(
    startPosition: number,
    width: number,
    instruction: NWScriptInstruction
  ): NWScriptExpression {
    const allocationIndices = Array.from({ length: width }, (_, slot) =>
      this.getLocalVariableIndexAtStackPosition(startPosition + slot * 4) ?? -1
    );
    const vectorStart = allocationIndices[0];
    if (
      width === 3 &&
      vectorStart >= 0 &&
      this.vectorLocalAllocationStarts.has(vectorStart) &&
      allocationIndices.every((index, component) => index === vectorStart + component)
    ) {
      const identity = this.frameAggregateIdentities.get(vectorStart) ??
        this.frameVariableIdentities.get(vectorStart);
      const expression = NWScriptExpression.variable(
        identity?.name ?? `localVar_${vectorStart}`,
        NWScriptDataType.VECTOR,
        identity?.isGlobal ?? false
      );
      this.push(expression, instruction.address, 3);
      return expression;
    }

    const structureStart = allocationIndices[0];
    const structureFields = this.structureLocalLayouts.get(structureStart);
    if (
      structureStart >= 0 &&
      structureFields?.length === width &&
      allocationIndices.every((index, field) => index === structureStart + field)
    ) {
      const identity = this.frameAggregateIdentities.get(structureStart) ??
        this.frameVariableIdentities.get(structureStart);
      const expression = NWScriptExpression.variable(
        identity?.name ?? `localVar_${structureStart}`,
        NWScriptDataType.STRUCTURE,
        identity?.isGlobal ?? false
      );
      expression.structureFieldTypes = structureFields;
      this.push(expression, instruction.address, width);
      return expression;
    }

    const copied: NWScriptExpression[] = [];
    for (let slot = 0; slot < width; slot += 1) {
      const rawAllocationIndex = allocationIndices[slot];
      const allocationIndex = rawAllocationIndex >= 0 ? rawAllocationIndex : undefined;

      let expression: NWScriptExpression;
      const vectorStart = allocationIndex === undefined
        ? undefined
        : Array.from(this.vectorLocalAllocationStarts).find(
            start => allocationIndex >= start && allocationIndex < start + 3
          );
      const structureEntry = allocationIndex === undefined
        ? undefined
        : Array.from(this.structureLocalLayouts.entries()).find(
            ([start, fields]) =>
              allocationIndex >= start && allocationIndex < start + fields.length
          );
      if (allocationIndex === undefined) {
        expression = NWScriptExpression.unknown(
          `unresolved local frame field at SP ${startPosition + slot * 4}`
        );
      } else if (this.frameVariableIdentities.has(allocationIndex)) {
        const identity = this.frameVariableIdentities.get(allocationIndex)!;
        expression = NWScriptExpression.variable(
          identity.name,
          identity.dataType,
          identity.isGlobal ?? false
        );
        expression.structureFieldTypes = identity.structureFieldTypes ?? [];
      } else if (vectorStart !== undefined) {
        const component = ['x', 'y', 'z'][allocationIndex - vectorStart];
        expression = NWScriptExpression.variable(
          `localVar_${vectorStart}.${component}`,
          NWScriptDataType.FLOAT
        );
      } else if (structureEntry !== undefined) {
        const [start, fields] = structureEntry;
        const field = allocationIndex - start;
        expression = NWScriptExpression.variable(
          `localVar_${start}.field_${field}`,
          fields[field] ?? NWScriptDataType.INTEGER
        );
      } else {
        expression = NWScriptExpression.variable(
          `localVar_${allocationIndex}`,
          this.localVariableInits[allocationIndex]?.dataType ?? NWScriptDataType.INTEGER
        );
      }
      this.push(expression, instruction.address, 1);
      copied.push(expression);
    }

    return NWScriptExpression.unknown(
      `multi-slot local frame copy retained as ${copied.length} scalar fields`,
      NWScriptDataType.STRUCTURE
    );
  }

  /**
   * Preserve the scalar fields of a multi-slot BP copy. The compiler implements user-struct
   * field reads as CPTOPBP of the whole struct followed by DESTRUCT of all but one field. The
   * global analyzer already exposes that frame as flattened scalar globals, so keeping one
   * StackItem per field lets DESTRUCT select the actual source variable instead of an unknown.
   */
  private copyGlobalFrameRange(
    startOffset: number,
    width: number,
    instruction: NWScriptInstruction
  ): NWScriptExpression {
    const aggregate = this.globalAggregateLayouts.get(startOffset);
    if (aggregate?.fieldTypes.length === width) {
      const expression = NWScriptExpression.variable(
        aggregate.name,
        aggregate.dataType,
        true
      );
      expression.structureFieldTypes = aggregate.dataType === NWScriptDataType.STRUCTURE
        ? aggregate.fieldTypes
        : [];
      this.push(expression, instruction.address, width);
      return expression;
    }

    const copied: NWScriptExpression[] = [];
    let slot = 0;
    while (slot < width) {
      const offset = startOffset + slot * 4;
      const global = this.globalVariables.get(offset);
      if (!global) {
        const expression = NWScriptExpression.unknown(
          `unresolved global frame field at BP ${offset}`
        );
        this.push(expression, instruction.address, 1);
        copied.push(expression);
        slot++;
        continue;
      }

      if (global.dataType === NWScriptDataType.VECTOR && slot + 3 <= width) {
        for (const component of ['x', 'y', 'z']) {
          const expression = NWScriptExpression.variable(
            `${global.name}.${component}`,
            NWScriptDataType.FLOAT,
            true
          );
          this.push(expression, instruction.address, 1);
          copied.push(expression);
        }
        slot += 3;
        continue;
      }

      const expression = NWScriptExpression.variable(
        global.name,
        global.dataType,
        true
      );
      this.push(expression, instruction.address, 1);
      copied.push(expression);
      slot++;
    }

    if (
      width === 3 &&
      copied.length === 3 &&
      copied.every(expression => expression.dataType === NWScriptDataType.FLOAT)
    ) {
      return NWScriptExpression.vector(copied);
    }
    return NWScriptExpression.unknown(
      `multi-slot global frame copy retained as ${copied.length} scalar fields`,
      NWScriptDataType.STRUCTURE
    );
  }

  /** Recover CPTOPSP copies of represented temporaries before inventing an `sp_*` variable. */
  private readRepresentedStackValue(
    sourceStackPosition: number,
    slots: number,
    dataType: NWScriptDataType,
    instruction: NWScriptInstruction
  ): NWScriptExpression | null {
    const representedSlots = this.getStackSlotCount();
    const representedBasePosition = this.stackPointer - representedSlots * 4;
    const relativeBytes = sourceStackPosition - representedBasePosition;
    if (
      relativeBytes < 0 ||
      relativeBytes % 4 !== 0 ||
      relativeBytes / 4 + slots > representedSlots
    ) {
      return null;
    }

    const items = this.sliceLogicalItemsBySlots(
      this.stack,
      relativeBytes / 4,
      slots,
      instruction
    );
    if (items.length === 1 && items[0].slotWidth === slots) {
      return items[0].expression;
    }
    if (
      dataType === NWScriptDataType.VECTOR &&
      items.length === 3 &&
      items.every(item => item.slotWidth === 1)
    ) {
      return NWScriptExpression.vector(items.map(item => item.expression));
    }
    if (slots === 1 && items.length === 1) {
      return items[0].expression;
    }
    return NWScriptExpression.unknown(
      `CPTOPSP copied an unrecoverable ${slots}-slot aggregate`,
      dataType
    );
  }

  /**
   * Handle local variable write (CPDOWNSP)
   */
  private handleLocalWrite(instruction: NWScriptInstruction): NWScriptExpression | null {
    const slots = stackSlotsForByteSize(instruction.size ?? 4, 'CPDOWNSP');
    const targetIndex = this.getLocalVariableIndexAtStackPosition(
      this.stackPointer + toSignedInt32(instruction.offset)
    );
    const identity = targetIndex === undefined
      ? undefined
      : this.frameVariableIdentities.get(targetIndex);
    const dataType = identity?.dataType ?? (slots === 3 && targetIndex !== undefined &&
      this.vectorLocalAllocationStarts.has(targetIndex)
      ? NWScriptDataType.VECTOR
      : slots > 1
        ? NWScriptDataType.STRUCTURE
        : this.localVariableInits[targetIndex ?? -1]?.dataType ?? NWScriptDataType.INTEGER);
    return this.peekSlotsAsValue(slots, dataType, instruction, 'CPDOWNSP value');
  }

  /**
   * Handle global variable write (CPDOWNBP)
   */
  private handleGlobalWrite(instruction: NWScriptInstruction): NWScriptExpression | null {
    const offsetSigned = toSignedInt32(instruction.offset);
    const global = this.globalVariables.get(offsetSigned);
    const slots = stackSlotsForByteSize(instruction.size ?? 4, 'CPDOWNBP');
    const dataType = slots === 3 && global?.dataType === NWScriptDataType.VECTOR
      ? NWScriptDataType.VECTOR
      : slots > 1
        ? NWScriptDataType.STRUCTURE
        : global?.dataType ?? NWScriptDataType.INTEGER;
    const value = this.peekSlotsAsValue(
      slots,
      dataType,
      instruction,
      'CPDOWNBP value'
    );
    const aggregate = this.globalAggregateLayouts.get(offsetSigned);
    if (aggregate?.fieldTypes.length === slots) {
      const target = NWScriptExpression.variable(
        aggregate.name,
        aggregate.dataType,
        true
      );
      target.structureFieldTypes = aggregate.dataType === NWScriptDataType.STRUCTURE
        ? aggregate.fieldTypes
        : [];
      return NWScriptExpression.assignment(target, value);
    }
    if (slots > 1 && value.type === NWScriptExpressionType.AGGREGATE) {
      const assignments = value.components.map((component, slot) => {
        const targetGlobal = this.globalVariables.get(offsetSigned + slot * 4);
        const target = NWScriptExpression.variable(
          targetGlobal?.name ?? this.generateVariableName(true, offsetSigned + slot * 4),
          targetGlobal?.dataType ?? component.dataType,
          true
        );
        return NWScriptExpression.assignment(target, component);
      });
      return NWScriptExpression.aggregate(assignments);
    }
    const target = NWScriptExpression.variable(
      global?.name ?? this.generateVariableName(true, offsetSigned),
      global?.dataType ?? value.dataType,
      true
    );
    if (!global) {
      this.diagnostics.push(`0x${instruction.address.toString(16)}: unresolved BP write at offset ${offsetSigned}`);
    }
    return NWScriptExpression.assignment(target, value);
  }

  /**
   * Handle MOVSP (move stack pointer)
   */
  private handleMovsp(instruction: NWScriptInstruction): void {
    const offset = toSignedInt32(instruction.offset);
    const slots = stackSlotsForByteSize(Math.abs(offset), 'MOVSP');

    if (offset < 0) {
      this.discardedExpressions = this.discardSlots(
        slots,
        instruction,
        'MOVSP cleanup'
      ).map(item => item.expression);
      return;
    }

    for (let i = 0; i < slots; i++) {
      this.push(
        NWScriptExpression.unknown(`MOVSP reserved slot ${i + 1}/${slots}`),
        instruction.address,
        1
      );
    }
  }

  /**
   * Handle DESTRUCT (destructure operation)
   * 
   * DESTRUCT removes sizeToDestroy bytes from the top of the stack,
   * but saves sizeOfElementToSave bytes starting at offsetToSaveElement
   * from the start of that region. The saved element(s) remain on the stack.
   * 
   * SP is decremented by sizeToDestroy
   */
  private handleDestruct(instruction: NWScriptInstruction): void {
    const destroySlots = stackSlotsForByteSize(instruction.sizeToDestroy, 'DESTRUCT destroy');
    const saveOffsetSlots = stackSlotsForByteSize(instruction.offsetToSaveElement, 'DESTRUCT save offset');
    const saveSlots = stackSlotsForByteSize(instruction.sizeOfElementToSave, 'DESTRUCT save size');
    if (saveOffsetSlots + saveSlots > destroySlots) {
      throw new NWScriptStackAnalysisError(instruction, 'saved range lies outside the destroyed region');
    }

    const representedSlots = this.getStackSlotCount();
    if (destroySlots > representedSlots) {
      throw new NWScriptStackAnalysisError(
        instruction,
        `needs ${destroySlots} represented slots but only ${representedSlots} are available`
      );
    }

    const regionStartSlot = representedSlots - destroySlots;
    const regionStartIndex = this.findItemBoundaryAtSlot(regionStartSlot, instruction);
    const regionItems = this.stack.slice(regionStartIndex);
    const savedItems = this.sliceLogicalItemsBySlots(
      regionItems,
      saveOffsetSlots,
      saveSlots,
      instruction
    );

    this.stack = this.stack.slice(0, regionStartIndex).concat(savedItems);
    this.stackPointer -= (destroySlots - saveSlots) * 4;
  }

  /**
   * Handle RSADD (reserve space on stack)
   */
  private handleRsadd(instruction: NWScriptInstruction): void {
    // RSADD actually pushes a default value onto the stack (0, 0.0, '', etc.)
    // This matches the runtime behavior where RSADD pushes a value
    // The variable will live at this stack position
    
    const dataType = getUnaryDataType(instruction.type);
    if (
      dataType === null ||
      dataType === NWScriptDataType.VECTOR ||
      dataType === NWScriptDataType.STRUCTURE
    ) {
      throw new NWScriptStackAnalysisError(instruction, `unsupported RSADD type 0x${instruction.type.toString(16)}`);
    }
    const expr = dataType === NWScriptDataType.INTEGER || dataType === NWScriptDataType.FLOAT
      ? NWScriptExpression.constant(0, dataType)
      : dataType === NWScriptDataType.STRING
        ? NWScriptExpression.constant('', dataType)
        : dataType === NWScriptDataType.OBJECT
          ? NWScriptExpression.constant(1, dataType)
          : NWScriptExpression.unknown(
              `uninitialized ${NWScriptDataType[dataType]} RSADD value`,
              dataType
            );

    // Push the VM default. Opaque engine values remain explicit unknowns rather than the
    // invalid NSS token `undefined`; an object reservation is the VM's OBJECT_INVALID value.
    this.push(expr, instruction.address);
  }

  /**
   * Handle local variable increment/decrement
   */
  private handleLocalIncrement(instruction: NWScriptInstruction): NWScriptExpression {
    const offsetSigned = toSignedInt32(instruction.offset);
    const targetPosition = this.stackPointer + offsetSigned;
    const variableIndex = this.getLocalVariableIndexAtStackPosition(targetPosition);
    const init = variableIndex === undefined ? undefined : this.localVariableInits[variableIndex];
    const target = NWScriptExpression.variable(
      variableIndex === undefined ? this.generateVariableName(false, offsetSigned) : `localVar_${variableIndex}`,
      init?.dataType ?? NWScriptDataType.INTEGER,
      false
    );
    return this.buildIncrementAssignment(instruction, target);
  }

  /**
   * Handle global variable increment/decrement
   */
  private handleGlobalIncrement(instruction: NWScriptInstruction): NWScriptExpression {
    const offsetSigned = toSignedInt32(instruction.offset);
    const global = this.globalVariables.get(offsetSigned);
    const target = NWScriptExpression.variable(
      global?.name ?? this.generateVariableName(true, offsetSigned),
      global?.dataType ?? NWScriptDataType.INTEGER,
      true
    );
    return this.buildIncrementAssignment(instruction, target);
  }

  private buildIncrementAssignment(
    instruction: NWScriptInstruction,
    target: NWScriptExpression
  ): NWScriptExpression {
    if (target.dataType !== NWScriptDataType.INTEGER) {
      throw new NWScriptStackAnalysisError(instruction, 'INC/DEC target is not an integer');
    }
    const isIncrement = instruction.code === OP_INCISP || instruction.code === OP_INCIBP;
    return NWScriptExpression.unaryOp(
      isIncrement ? 'post++' : 'post--',
      target,
      NWScriptDataType.INTEGER
    );
  }

  private popRequired(instruction: NWScriptInstruction, context: string): StackItem {
    const item = this.pop();
    if (!item) {
      throw new NWScriptStackAnalysisError(instruction, `stack underflow while reading ${context}`);
    }
    return item;
  }

  private popTypedValue(
    dataType: NWScriptDataType,
    instruction: NWScriptInstruction,
    context: string,
    stackSlots?: number
  ): NWScriptExpression {
    return this.popSlotsAsValue(
      Math.max(1, stackSlots ?? stackSlotsForDataType(dataType)),
      dataType,
      instruction,
      context
    );
  }

  private popSlotsAsValue(
    slots: number,
    dataType: NWScriptDataType,
    instruction: NWScriptInstruction,
    context: string
  ): NWScriptExpression {
    if (slots <= 0) {
      return NWScriptExpression.unknown(`${context} does not live on the value stack`, dataType);
    }

    const top = this.peek();
    if (top && top.slotWidth === slots) {
      const item = this.popRequired(instruction, context);
      if (
        item.expression.type === NWScriptExpressionType.VARIABLE &&
        dataType !== NWScriptDataType.STRUCTURE
      ) {
        item.expression.dataType = dataType;
        this.variableTypeObserver?.(item.expression.variableName, dataType);
      }
      if (
        item.expression.dataType !== dataType &&
        item.expression.dataType !== NWScriptDataType.STRUCTURE &&
        dataType !== NWScriptDataType.STRUCTURE
      ) {
        this.diagnostics.push(
          `0x${instruction.address.toString(16)}: ${context} expected ${NWScriptDataType[dataType]}, found ${NWScriptDataType[item.expression.dataType]}`
        );
      }
      return item.expression;
    }

    const popped: StackItem[] = [];
    let consumed = 0;
    while (consumed < slots) {
      const item = this.popRequired(instruction, context);
      consumed += item.slotWidth;
      if (consumed > slots) {
        throw new NWScriptStackAnalysisError(
          instruction,
          `${context} cuts through a ${item.slotWidth}-slot logical value`
        );
      }
      popped.push(item);
    }

    if (dataType === NWScriptDataType.VECTOR && popped.length === 3 && popped.every(item => item.slotWidth === 1)) {
      return NWScriptExpression.vector(popped.reverse().map(item => item.expression));
    }

    if (dataType === NWScriptDataType.STRUCTURE && popped.every(item => item.slotWidth === 1)) {
      return NWScriptExpression.aggregate(popped.reverse().map(item => item.expression));
    }

    if (slots === 1 && popped.length === 1) {
      return popped[0].expression;
    }

    const diagnostic = `${context} is a ${slots}-slot aggregate whose source fields are unavailable`;
    this.diagnostics.push(`0x${instruction.address.toString(16)}: ${diagnostic}`);
    return NWScriptExpression.unknown(diagnostic, dataType);
  }

  private popScalarArgumentsBySlotCount(
    slots: number,
    instruction: NWScriptInstruction,
    context: string
  ): NWScriptExpression[] {
    const args: NWScriptExpression[] = [];
    let consumed = 0;
    while (consumed < slots) {
      const item = this.popRequired(instruction, context);
      consumed += item.slotWidth;
      if (consumed > slots) {
        throw new NWScriptStackAnalysisError(instruction, `${context} ends inside a logical value`);
      }
      args.push(item.expression);
    }
    return args;
  }

  private discardSlots(slots: number, instruction: NWScriptInstruction, context: string): StackItem[] {
    const removed: StackItem[] = [];
    let discarded = 0;
    while (discarded < slots) {
      const item = this.popRequired(instruction, context);
      discarded += item.slotWidth;
      if (discarded > slots) {
        throw new NWScriptStackAnalysisError(
          instruction,
          `${context} removes ${slots} slots through a ${item.slotWidth}-slot logical value`
        );
      }
      removed.push(item);
    }
    return removed;
  }

  private peekSlotsAsValue(
    slots: number,
    dataType: NWScriptDataType,
    instruction: NWScriptInstruction,
    context: string
  ): NWScriptExpression {
    const snapshot = this.takeStackSnapshot();
    try {
      return this.popSlotsAsValue(slots, dataType, instruction, context);
    } finally {
      this.restoreStackSnapshot(snapshot);
    }
  }

  private findItemBoundaryAtSlot(slot: number, instruction: NWScriptInstruction): number {
    let cursor = 0;
    for (let i = 0; i < this.stack.length; i++) {
      if (cursor === slot) {
        return i;
      }
      cursor += this.stack[i].slotWidth;
      if (cursor > slot) {
        throw new NWScriptStackAnalysisError(instruction, 'DESTRUCT starts inside a logical aggregate');
      }
    }
    if (cursor === slot) {
      return this.stack.length;
    }
    throw new NWScriptStackAnalysisError(instruction, `DESTRUCT slot ${slot} lies outside represented stack`);
  }

  private sliceLogicalItemsBySlots(
    items: StackItem[],
    offsetSlots: number,
    sizeSlots: number,
    instruction: NWScriptInstruction
  ): StackItem[] {
    if (sizeSlots === 0) {
      return [];
    }

    let cursor = 0;
    let startIndex = -1;
    let endIndex = -1;
    for (let i = 0; i <= items.length; i++) {
      if (cursor === offsetSlots && startIndex < 0) {
        startIndex = i;
      }
      if (cursor === offsetSlots + sizeSlots) {
        endIndex = i;
        break;
      }
      if (i < items.length) {
        cursor += items[i].slotWidth;
      }
    }

    if (startIndex >= 0 && endIndex >= startIndex) {
      return items.slice(startIndex, endIndex).map(item => ({ ...item }));
    }

    const expanded = items.flatMap(item => {
      let components: NWScriptExpression[] | undefined;
      if (item.slotWidth === 3 && item.expression.dataType === NWScriptDataType.VECTOR) {
        components = item.expression.components.length === 3
          ? item.expression.components
          : ['x', 'y', 'z'].map(component => NWScriptExpression.variable(
              `${item.expression.toNSS()}.${component}`,
              NWScriptDataType.FLOAT,
              item.expression.isGlobal
            ));
      } else if (
        item.expression.dataType === NWScriptDataType.STRUCTURE &&
        item.expression.structureFieldTypes.length === item.slotWidth
      ) {
        components = item.expression.structureFieldTypes.map((dataType, field) =>
          NWScriptExpression.variable(
            `${item.expression.toNSS()}.field_${field}`,
            dataType,
            item.expression.isGlobal
          )
        );
      }
      if (!components) return [{ ...item }];
      return components.map(expression => ({
        expression,
        address: item.address,
        slotWidth: 1,
      }));
    });
    if (
      expanded.length !== items.length ||
      expanded.some((item, index) => item.slotWidth !== items[index]?.slotWidth)
    ) {
      return this.sliceLogicalItemsBySlots(
        expanded,
        offsetSlots,
        sizeSlots,
        instruction
      );
    }

    const dataType = sizeSlots === 3 ? NWScriptDataType.VECTOR : NWScriptDataType.STRUCTURE;
    const diagnostic = `DESTRUCT preserves ${sizeSlots} slots from inside an aggregate`;
    this.diagnostics.push(`0x${instruction.address.toString(16)}: ${diagnostic}`);
    return [{
      expression: NWScriptExpression.unknown(diagnostic, dataType),
      address: instruction.address,
      slotWidth: sizeSlots,
    }];
  }

  private dataTypeForCopyWidth(size: number | undefined): NWScriptDataType {
    if (size === 12) {
      return NWScriptDataType.VECTOR;
    }
    if (size !== undefined && size > 4) {
      return NWScriptDataType.STRUCTURE;
    }
    return NWScriptDataType.INTEGER;
  }

  /**
   * Push an expression onto the stack
   */
  push(expression: NWScriptExpression, address: number, slotWidth: number = Math.max(1, stackSlotsForDataType(expression.dataType))): void {
    if (!Number.isInteger(slotWidth) || slotWidth <= 0) {
      throw new Error(`Invalid stack slot width ${slotWidth}`);
    }
    this.stack.push({ expression, address, slotWidth });
    this.stackPointer += slotWidth * 4;
  }

  /**
   * Pop an expression from the stack
   */
  pop(): StackItem | null {
    if (this.stack.length === 0) {
      return null;
    }
    const item = this.stack.pop()!;
    this.stackPointer -= item.slotWidth * 4;
    return item;
  }

  /**
   * Peek at the top of the stack without popping
   */
  peek(): StackItem | null {
    if (this.stack.length === 0) {
      return null;
    }
    return this.stack[this.stack.length - 1];
  }

  /**
   * Get the current stack size (number of items)
   */
  getStackSize(): number {
    return this.stack.length;
  }

  /** Number of physical four-byte slots represented by the logical stack. */
  getStackSlotCount(): number {
    return this.stack.reduce((sum, item) => sum + item.slotWidth, 0);
  }

  /**
   * Resolve a local from the RSADD value physically present at a stack position. This remains
   * path-sensitive when sibling scopes reuse the same numeric SP position; the position map is
   * retained only as a fallback for partial simulations that do not carry the whole frame.
   */
  getLocalVariableIndexAtStackPosition(stackPosition: number): number | undefined {
    const representedSlots = this.getStackSlotCount();
    let cursor = this.stackPointer - representedSlots * 4;
    for (const item of this.stack) {
      const end = cursor + item.slotWidth * 4;
      if (stackPosition >= cursor && stackPosition < end) {
        const allocationIndex = this.localVariableAllocationIndices.get(item.address);
        if (allocationIndex !== undefined) return allocationIndex;
        break;
      }
      cursor = end;
    }
    return this.variableStackPositions.get(stackPosition);
  }

  getDiagnostics(): readonly string[] {
    return this.diagnostics;
  }

  getDiscardedExpressions(): readonly NWScriptExpression[] {
    return this.discardedExpressions;
  }

  /**
   * Get the current stack pointer value
   */
  getStackPointer(): number {
    return this.stackPointer;
  }

  /**
   * Set SP to the bytecode depth at subroutine entry (e.g. SP at the JSR that calls main).
   * RSADD records variable homes using this pointer; CPTOPSP uses SP+offset — they must share the same origin.
   */
  setProgramStackPointer(sp: number): void {
    this.stackPointer = sp;
  }
  
  /**
   * Get global variables map (for passing to other components)
   */
  getGlobalVariables(): Map<number, { name: string, dataType: NWScriptDataType }> {
    return this.globalVariables;
  }

  getGlobalAggregateLayouts(): Map<number, NWScriptGlobalAggregateLayout> {
    return this.globalAggregateLayouts;
  }
  
  /**
   * Get local variables map (for passing to other components)
   */
  getLocalVariables(): Map<number, { name: string, dataType: NWScriptDataType }> {
    return this.localVariables;
  }

  /**
   * Get the current base pointer value
   */
  getBasePointer(): number {
    return this.basePointer;
  }

  /**
   * Set the base pointer
   */
  setBasePointer(bp: number): void {
    this.basePointer = bp;
  }

  /**
   * Clear the stack
   */
  clear(): void {
    this.stack = [];
    this.stackPointer = 0;
    this.basePointer = 0;
    this.stackSnapshots.clear();
    this.diagnostics = [];
    this.discardedExpressions = [];
    this.functionParameters.clear();
    this.cptopspParameterOperands.clear();
    // These maps may have been supplied by the converter and remain its canonical metadata.
    // Detach rather than mutating them through a shared reference.
    this.variableStackPositions = new Map();
    this.localVariableAllocationIndices = new Map();
    this.vectorLocalAllocationStarts = new Set();
    this.structureLocalLayouts = new Map();
    this.localVariableInits = [];
    this.variableTypeObserver = undefined;
  }

  /** Save stack depth/SP/BP for re-entrant probing (e.g. switch discriminant extraction). */
  takeStackSnapshot(): NWScriptStackSnapshot {
    return {
      stack: this.stack.slice(),
      stackPointer: this.stackPointer,
      basePointer: this.basePointer,
    };
  }

  restoreStackSnapshot(snapshot: NWScriptStackSnapshot): void {
    this.stack = snapshot.stack.slice();
    this.stackPointer = snapshot.stackPointer;
    this.basePointer = snapshot.basePointer;
  }

  /**
   * Merge mutually-exclusive control-flow exits without leaking the state of whichever branch
   * happened to be converted last. Valid NCS joins have the same physical stack shape on every
   * incoming edge. Values that differ at an otherwise-compatible join become explicit unknowns;
   * a malformed shape falls back to the supplied entry state and records a diagnostic.
   */
  mergeStackSnapshots(
    snapshots: NWScriptStackSnapshot[],
    context: string,
    fallback: NWScriptStackSnapshot = this.takeStackSnapshot()
  ): NWScriptStackSnapshot {
    if (snapshots.length === 0) {
      return this.cloneStackSnapshot(fallback);
    }

    const reference = snapshots[0];
    const compatible = snapshots.every(snapshot =>
      snapshot.stackPointer === reference.stackPointer &&
      snapshot.basePointer === reference.basePointer &&
      snapshot.stack.length === reference.stack.length &&
      snapshot.stack.every((item, index) => item.slotWidth === reference.stack[index].slotWidth)
    );

    if (!compatible) {
      this.diagnostics.push(`${context}: incoming control-flow edges have incompatible stack shapes`);
      return this.cloneStackSnapshot(fallback);
    }

    const stack = reference.stack.map((item, index) => {
      const alternatives = snapshots.map(snapshot => snapshot.stack[index]);
      const equivalent = alternatives.every(alternative =>
        alternative.expression.dataType === item.expression.dataType &&
        alternative.expression.equals(item.expression)
      );
      if (equivalent) {
        return { ...item };
      }

      return {
        expression: NWScriptExpression.unknown(
          `${context}: value differs across incoming control-flow edges`,
          item.expression.dataType
        ),
        address: item.address,
        slotWidth: item.slotWidth,
      };
    });

    return {
      stack,
      stackPointer: reference.stackPointer,
      basePointer: reference.basePointer,
    };
  }

  private cloneStackSnapshot(snapshot: NWScriptStackSnapshot): NWScriptStackSnapshot {
    return {
      stack: snapshot.stack.slice(),
      stackPointer: snapshot.stackPointer,
      basePointer: snapshot.basePointer,
    };
  }

  /**
   * Set function parameters for parameter name mapping
   */
  setFunctionParameters(parameters: NWScriptFunctionParameter[]): void {
    this.functionParameters.clear();
    this.cptopspParameterOperands.clear();
    for (const param of parameters) {
      if (param.resolvedViaSpOperand) {
        this.cptopspParameterOperands.set(param.offset, {
          name: param.name,
          dataType: param.dataType,
          stackSlots: param.stackSlots,
          structureFieldTypes: param.structureFieldTypes,
        });
      } else {
        this.functionParameters.set(param.offset, {
          name: param.name,
          dataType: param.dataType,
          stackSlots: param.stackSlots,
          structureFieldTypes: param.structureFieldTypes,
        });
      }
    }
  }
  
  /**
   * Set global variables for variable name mapping
   * Maps BP offsets (positive) to global variable names
   */
  setGlobalVariables(globalVars: Map<number, { name: string, dataType: NWScriptDataType }>): void {
    this.globalVariables = globalVars;
  }

  setGlobalAggregateLayouts(layouts: Map<number, NWScriptGlobalAggregateLayout>): void {
    this.globalAggregateLayouts = layouts;
  }
  
  /**
   * Set local variables for variable name mapping
   * Maps SP offsets to local variable names
   */
  setLocalVariables(localVars: Map<number, { name: string, dataType: NWScriptDataType }>): void {
    this.localVariables = localVars;
  }
  
  /**
   * Set the stack position to variable index mapping for dynamic variable resolution
   * This allows CPTOPSP to resolve variables based on actual stack state, not static offsets
   */
  setVariableStackPositions(positions: Map<number, number>): void {
    this.variableStackPositions = positions;
  }

  setLocalVariableAllocationIndices(indices: Map<number, number>): void {
    this.localVariableAllocationIndices = indices;
  }

  setFrameVariableIdentities(identities: Map<number, NWScriptFrameVariableIdentity>): void {
    this.frameVariableIdentities = identities;
  }

  setFrameAggregateIdentities(identities: Map<number, NWScriptFrameVariableIdentity>): void {
    this.frameAggregateIdentities = identities;
  }

  setVectorLocalAllocationStarts(starts: Set<number>): void {
    this.vectorLocalAllocationStarts = starts;
  }

  setStructureLocalLayouts(layouts: Map<number, NWScriptDataType[]>): void {
    this.structureLocalLayouts = layouts;
  }

  setVariableTypeObserver(
    observer?: (name: string, dataType: NWScriptDataType) => void
  ): void {
    this.variableTypeObserver = observer;
  }
  
  /**
   * Set local variable initializations for variable info lookup
   */
  setLocalVariableInits(inits: Array<{ offset: number, dataType: NWScriptDataType, hasInitializer: boolean, initialValue?: any }>): void {
    this.localVariableInits = inits;
  }

  /**
   * Save a snapshot of the stack state
   */
  private saveSnapshot(address: number): void {
    // Deep copy the stack
    this.stackSnapshots.set(address, this.stack.map(item => ({ ...item })));
  }

  /**
   * Get a stack snapshot at a specific address
   */
  getSnapshot(address: number): StackItem[] | null {
    return this.stackSnapshots.get(address) || null;
  }

  /**
   * Get binary operator string
   */
  private getBinaryOperator(opCode: number): string {
    switch (opCode) {
      case OP_ADD: return '+';
      case OP_SUB: return '-';
      case OP_MUL: return '*';
      case OP_DIV: return '/';
      case OP_MODII: return '%';
      default: return '?';
    }
  }

  /**
   * Get comparison operator string
   */
  private getComparisonOperator(opCode: number): string {
    switch (opCode) {
      case OP_EQUAL: return '==';
      case OP_NEQUAL: return '!=';
      case OP_GT: return '>';
      case OP_GEQ: return '>=';
      case OP_LT: return '<';
      case OP_LEQ: return '<=';
      default: return '?';
    }
  }

  /**
   * Get logical operator string
   */
  private getLogicalOperator(opCode: number): string {
    switch (opCode) {
      case OP_LOGANDII: return '&&';
      case OP_LOGORII: return '||';
      case OP_BOOLANDII: return '&';
      default: return '?';
    }
  }

  /**
   * Get unary operator string
   */
  private getUnaryOperator(opCode: number): string {
    switch (opCode) {
      case OP_NEG: return '-';
      case OP_COMPI: return '~';
      case OP_NOTI: return '!';
      default: return '?';
    }
  }

  /**
   * Generate a variable name
   */
  private generateVariableName(isGlobal: boolean, offsetSigned: number): string {
    if (isGlobal) {
      return `g_bp_${offsetSigned}`;
    }
    return `sp_${offsetSigned}`;
  }
}
