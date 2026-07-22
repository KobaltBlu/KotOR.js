import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptExpression, NWScriptExpressionType } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { NWScriptFunctionParameter } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import type { JsrUserRoutineMeta } from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import { orderActionArgsTopFirst } from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import type { DelayCommandThunkArg } from "@/nwscript/decompiler/NWScriptStoreStateThunkSkip";
import {
  OP_CONST, OP_ACTION, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MODII,
  OP_EQUAL, OP_NEQUAL, OP_GT, OP_GEQ, OP_LT, OP_LEQ,
  OP_LOGANDII, OP_LOGORII, OP_BOOLANDII, OP_INCORII, OP_EXCORII,
  OP_SHLEFTII, OP_SHRIGHTII, OP_USHRIGHTII,
  OP_NEG, OP_COMPI, OP_NOTI,
  OP_CPTOPBP, OP_CPTOPSP, OP_CPDOWNSP, OP_CPDOWNBP,
  OP_MOVSP, OP_DESTRUCT, OP_RSADD,
  OP_DECISP, OP_INCISP, OP_DECIBP, OP_INCIBP,
  OP_JSR,
} from "@/nwscript/NWScriptOPCodes";
/**
 * Represents an item on the stack
 */
interface StackItem {
  expression: NWScriptExpression;
  address: number; // Instruction address that created this item
  /** Stack footprint in bytes (4 for scalars, 12 for vector, 8 for two-int struct, …) */
  byteSize: number;
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
  private functionParameters: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();

  /** CPTOPSP operand → formal (SP-relative formals). */
  private cptopspParameterOperands: Map<number, { name: string; dataType: NWScriptDataType }> = new Map();
  /** Absolute stack position at function entry → formal (SP may grow; operand changes). */
  private cptopspParamByAbsolutePosition: Map<number, { name: string; dataType: NWScriptDataType }> = new Map();
  
  /**
   * Global variables (for mapping CPTOPBP positive offsets to global variable names)
   */
  private globalVariables: Map<number, { name: string, dataType: NWScriptDataType }> = new Map();
  
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

  /**
   * Declared local slot types (index → type), including coalesced vector/struct slots.
   */
  private localSlotTypes: NWScriptDataType[] = [];

  /**
   * Stack position → member name (`x`/`y`/`z`) for coalesced aggregate component slots.
   */
  private slotMemberNames: Map<number, string> = new Map();
  
  /**
   * Local variable initializations (for looking up variable info by index)
   * Set by the converter to provide variable names and types
   */
  private localVariableInits: Array<{ offset: number, dataType: NWScriptDataType, hasInitializer: boolean, initialValue?: any }> = [];

  /** Callee entry PC → caller-side dword slots cleared when JSR returns (parameter spill). */
  private jsrCalleeArgSlotsByEntryPc: Map<number, number> = new Map();

  /** Callee entry PC → user subroutine (for JSR → {@link NWScriptExpression.functionCall}). */
  private jsrUserRoutineMetaByEntryPc: Map<number, JsrUserRoutineMeta> = new Map();

  /** DelayCommand ACTION PC → recovered second argument (STORE_STATE thunk). */
  private delayCommandThunkSecondArg: Map<number, DelayCommandThunkArg> = new Map();

  /** ActionDoCommand ACTION PC → recovered action argument (STORE_STATE thunk). */
  private actionDoCommandThunkArg: Map<number, NWScriptExpression> = new Map();

  /** AssignCommand ACTION PC → recovered action argument (STORE_STATE thunk). */
  private assignCommandThunkArg: Map<number, NWScriptExpression> = new Map();

  setJsrCalleeArgSlotsByEntryPc(map: Map<number, number>): void {
    this.jsrCalleeArgSlotsByEntryPc = map;
  }

  setJsrUserRoutineMetaByEntryPc(map: Map<number, JsrUserRoutineMeta>): void {
    this.jsrUserRoutineMetaByEntryPc = map;
  }

  setDelayCommandThunkSecondArg(map: Map<number, DelayCommandThunkArg>): void {
    this.delayCommandThunkSecondArg = map;
  }

  setActionDoCommandThunkArg(map: Map<number, NWScriptExpression>): void {
    this.actionDoCommandThunkArg = map;
  }

  setAssignCommandThunkArg(map: Map<number, NWScriptExpression>): void {
    this.assignCommandThunkArg = map;
  }

  getDelayCommandThunkSecondArg(): Map<number, DelayCommandThunkArg> {
    return this.delayCommandThunkSecondArg;
  }

  getActionDoCommandThunkArg(): Map<number, NWScriptExpression> {
    return this.actionDoCommandThunkArg;
  }

  getAssignCommandThunkArg(): Map<number, NWScriptExpression> {
    return this.assignCommandThunkArg;
  }

  /** Resolve DelayCommand thunk second arg (JSR callee or nested AssignCommand). */
  private resolveDelayCommandThunkArg(arg: DelayCommandThunkArg): NWScriptExpression {
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
      // handleVariableRead pushes the read as a stack effect — undo it, this is only a
      // name resolution (a leaked slot skews every later SP-relative read in the block).
      const expr = this.handleVariableRead(instruction);
      this.pop();
      return expr;
    }
    if (instruction.code === OP_CONST) {
      // Mirror object CONST ABI used by handleConst (0 → SELF, 1 / 0x7f000000 → INVALID)
      const typeCode = instruction.type ?? 0;
      if (typeCode === NWScriptDataType.OBJECT || typeCode === 0x06) {
        const raw =
          instruction.object ??
          instruction.integer ??
          instruction.value ??
          0;
        if (raw === 0) {
          return NWScriptExpression.constant("OBJECT_SELF", NWScriptDataType.OBJECT);
        }
        if (raw === 1 || raw === 0x7f000000) {
          return NWScriptExpression.constant("OBJECT_INVALID", NWScriptDataType.OBJECT);
        }
        return NWScriptExpression.constant(raw, NWScriptDataType.OBJECT);
      }
      return NWScriptExpression.constant(
        instruction.integer ?? instruction.value ?? 0,
        NWScriptDataType.OBJECT
      );
    }
    return NWScriptExpression.constant("OBJECT_SELF", NWScriptDataType.OBJECT);
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
        return this.handleLogical(instruction);
      
      case OP_BOOLANDII:
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
        this.handleLocalIncrement(instruction);
        return null;
      
      case OP_DECIBP:
      case OP_INCIBP:
        this.handleGlobalIncrement(instruction);
        return null;
      
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
        value = instruction.integer;
        dataType = NWScriptDataType.INTEGER;
        break;
      case 4: // FLOAT
        value = instruction.float;
        dataType = NWScriptDataType.FLOAT;
        break;
      case 5: // STRING
        value = instruction.string;
        dataType = NWScriptDataType.STRING;
        break;
      case 6: // OBJECT
        value = instruction.object;
        dataType = NWScriptDataType.OBJECT;
        break;
      default:
        value = 0;
        dataType = NWScriptDataType.INTEGER;
    }

    const expr = NWScriptExpression.constant(value, dataType);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle binary arithmetic operations
   */
  private handleBinaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    const typeCode = instruction.type ?? 0;
    // VV / vector arithmetic: two size-12 values → one size-12 result
    if (typeCode === 0x3a) {
      return this.handleVectorBinaryOp(instruction);
    }

    if (this.stack.length < 2) {
      // Not enough operands - create placeholder
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = this.getBinaryOperator(instruction.code);
      const dataType = this.getResultType(instruction.type);
      const expr = NWScriptExpression.binaryOp(operator, left, right, dataType);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    const operator = this.getBinaryOperator(instruction.code);
    const dataType = this.getResultType(instruction.type);
    
    const expr = NWScriptExpression.binaryOp(operator, left.expression, right.expression, dataType);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * ADD/SUB/MUL/DIV with type 0x3A (VV): pop two vectors (12 bytes each), push one vector.
   */
  private handleVectorBinaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    const operator = this.getBinaryOperator(instruction.code);
    const right = this.popVectorOperand();
    const left = this.popVectorOperand();
    const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.VECTOR);
    this.push(expr, instruction.address, 12);
    return expr;
  }

  /** Pop a vector expression — either one size-12 item or three float slots. */
  private popVectorOperand(): NWScriptExpression {
    const top = this.peek();
    if (top && (top.byteSize === 12 || top.expression.dataType === NWScriptDataType.VECTOR)) {
      return this.pop()!.expression;
    }
    // Three scalar floats on the stack (z then y then x from top)
    const z = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.FLOAT);
    const y = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.FLOAT);
    const x = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.FLOAT);
    // Prefer a single variable if all three name the same vector local
    if (
      x.type === NWScriptExpressionType.VARIABLE &&
      y.type === NWScriptExpressionType.VARIABLE &&
      z.type === NWScriptExpressionType.VARIABLE &&
      x.variableName &&
      x.variableName === y.variableName &&
      x.variableName === z.variableName
    ) {
      return NWScriptExpression.variable(x.variableName, NWScriptDataType.VECTOR, x.isGlobal);
    }
    return NWScriptExpression.vectorLiteral(x, y, z);
  }

  /**
   * Handle comparison operations
   */
  private handleComparison(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 2) {
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = this.getComparisonOperator(instruction.code);
      const expr = NWScriptExpression.comparison(operator, left, right);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    const operator = this.getComparisonOperator(instruction.code);
    
    const expr = NWScriptExpression.comparison(operator, left.expression, right.expression);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle logical operations
   */
  private handleLogical(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 2) {
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const operator = this.getLogicalOperator(instruction.code);
      const expr = NWScriptExpression.logical(operator, left, right);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    const operator = this.getLogicalOperator(instruction.code);
    
    const expr = NWScriptExpression.logical(operator, left.expression, right.expression);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle bitwise operations
   */
  private handleBitwise(instruction: NWScriptInstruction): NWScriptExpression {
    const operator =
      instruction.code === OP_INCORII
        ? "|"
        : instruction.code === OP_BOOLANDII
          ? "&"
          : "^";

    if (this.stack.length < 2) {
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
      const expr = NWScriptExpression.binaryOp(operator, left, right, NWScriptDataType.INTEGER);
      this.push(expr, instruction.address);
      return expr;
    }

    const right = this.pop()!;
    const left = this.pop()!;
    
    const expr = NWScriptExpression.binaryOp(operator, left.expression, right.expression, NWScriptDataType.INTEGER);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle shift operations
   */
  private handleShiftOp(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 2) {
      const right = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const left = this.pop()?.expression || NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      
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

    const right = this.pop()!;
    const left = this.pop()!;
    
    let operator: string;
    switch (instruction.code) {
      case OP_SHLEFTII: operator = '<<'; break;
      case OP_SHRIGHTII: operator = '>>'; break;
      case OP_USHRIGHTII: operator = '>>>'; break;
      default: operator = '?';
    }
    
    const expr = NWScriptExpression.binaryOp(operator, left.expression, right.expression, NWScriptDataType.INTEGER);
    this.push(expr, instruction.address);
    return expr;
  }

  /**
   * Handle unary operations
   */
  private handleUnaryOp(instruction: NWScriptInstruction): NWScriptExpression {
    if (this.stack.length < 1) {
      const operand = NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
      const operator = this.getUnaryOperator(instruction.code);
      const dataType = instruction.type === 0x03 ? NWScriptDataType.INTEGER : NWScriptDataType.FLOAT;
      const expr = NWScriptExpression.unaryOp(operator, operand, dataType);
      this.push(expr, instruction.address);
      return expr;
    }

    const item = this.pop()!;
    const operator = this.getUnaryOperator(instruction.code);
    const dataType = instruction.type === 0x03 ? NWScriptDataType.INTEGER : NWScriptDataType.FLOAT;
    
    const expr = NWScriptExpression.unaryOp(operator, item.expression, dataType);
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
    const targetPc = instruction.address + instruction.offset;
    const slots = this.jsrCalleeArgSlotsByEntryPc.get(targetPc) ?? 0;
    const meta = this.jsrUserRoutineMetaByEntryPc.get(targetPc);

    if (meta) {
      const args: NWScriptExpression[] = [];
      let n = Math.min(slots, this.stack.length);
      while (n > 0) {
        const item = this.pop();
        if (item) {
          args.unshift(item.expression);
        }
        n--;
      }
      args.reverse();
      const expr = NWScriptExpression.functionCall(meta.name, args, meta.returnType);
      if (meta.returnType !== NWScriptDataType.VOID) {
        // Caller pre-reserved the return with RSADD below the args. After popping args,
        // replace that slot — do not push (extra +4 desyncs SP; breaks later RSADD reuse).
        const top = this.peek();
        if (top) {
          top.expression = expr;
          top.address = instruction.address;
        } else {
          this.push(expr, instruction.address);
        }
      }
      return expr;
    }

    let n = Math.min(slots, this.stack.length);
    while (n > 0) {
      this.pop();
      n--;
    }
    return null;
  }

  /**
   * Handle ACTION (function call)
   */
  private handleAction(instruction: NWScriptInstruction): NWScriptExpression | null {
    const actionDef = instruction.actionDefinition;
    const rawArgCount = instruction.argCount ?? 0;
    const argCount = Math.min(Math.max(rawArgCount, 0), 48);

    if (!actionDef) {
      for (let i = 0; i < argCount && this.stack.length > 0; i++) {
        this.pop();
      }
      return null;
    }

    // Action-type args (0xff) travel via STORE_STATE, not the stack — popping for them
    // would swallow an unrelated value and skew SP for every later read.
    const defArgTypes: number[] = Array.isArray(actionDef.args) ? actionDef.args : [];
    let popCount = 0;
    for (let i = 0; i < argCount; i++) {
      if (defArgTypes[i] !== 0xff) {
        popCount++;
      }
    }

    // Pop top-first. Default NWScript is R-to-L (top = first formal). Retail sometimes
    // pushes L-to-R with repeated CPTOP offsets (SetLocalBoolean triple −16) — detect via
    // top matching the last formal type when first≠last.
    const popped: NWScriptExpression[] = [];
    for (let i = 0; i < popCount && this.stack.length > 0; i++) {
      const item = this.pop();
      if (item) {
        popped.push(item.expression);
      }
    }
    const args = orderActionArgsTopFirst(popped, defArgTypes);

    const functionName = actionDef.name || `Action_${instruction.action}`;
    const returnType = actionDef.type || NWScriptDataType.VOID;

    const isDelayCommand =
      functionName === "DelayCommand" || instruction.action === 7;
    const isActionDoCommand =
      functionName === "ActionDoCommand" || instruction.action === 294;
    const isAssignCommand =
      functionName === "AssignCommand" || instruction.action === 6;

    const thunkReplace =
      isDelayCommand
        ? this.delayCommandThunkSecondArg.get(instruction.address)
        : undefined;
    if (thunkReplace) {
      const secondArg = this.resolveDelayCommandThunkArg(thunkReplace);
      if (args.length === 0) {
        args.push(NWScriptExpression.constant(0, NWScriptDataType.FLOAT));
      }
      if (args.length === 1) {
        args.push(secondArg);
      } else {
        args[args.length - 1] = secondArg;
      }
    }

    const actionDoReplace =
      isActionDoCommand
        ? this.actionDoCommandThunkArg.get(instruction.address)
        : undefined;
    if (actionDoReplace) {
      if (args.length === 0) {
        args.push(actionDoReplace);
      } else {
        args[0] = actionDoReplace;
      }
    }

    const assignReplace =
      isAssignCommand
        ? this.assignCommandThunkArg.get(instruction.address)
        : undefined;
    if (assignReplace) {
      if (args.length === 0) {
        args.push(
          NWScriptExpression.constant("OBJECT_SELF", NWScriptDataType.OBJECT)
        );
      }
      // STORE_STATE thunk CPTOPSP -4 is the copy top, not caller localVar_0 — bind
      // ActionOpenDoor(o) etc. to the same subject already on the stack (k_act_com31).
      const subject = args[0];
      const remapped = this.remapThunkScriptObjectArgsToSubject(assignReplace, subject);
      if (args.length === 1) {
        args.push(remapped);
      } else {
        args[args.length - 1] = remapped;
      }
    }
    
    const expr = NWScriptExpression.functionCall(functionName, args, returnType);
    
    // Push return value if not void
    if (returnType !== NWScriptDataType.VOID) {
      this.push(expr, instruction.address);
    }
    
    return expr;
  }

  /**
   * Handle variable read (CPTOPBP/CPTOPSP)
   */
  private handleVariableRead(instruction: NWScriptInstruction): NWScriptExpression {
    const isGlobal = instruction.code === OP_CPTOPBP;
    const copySize = instruction.size || 4;
    let varName: string;
    let dataType: NWScriptDataType;
    
    if (isGlobal && instruction.offset !== undefined) {
      // Check if this is a function parameter (negative offset)
      const offset = instruction.offset;
      const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
      
      if (offsetSigned < 0 && this.functionParameters.has(offsetSigned)) {
        // This is a function parameter (negative offset relative to BP)
        const param = this.functionParameters.get(offsetSigned)!;
        varName = param.name;
        dataType = param.dataType;
      } else if (offsetSigned < 0 && this.globalVariables.has(offsetSigned)) {
        // This is a global variable (negative offset relative to BP)
        // ALL stack offsets are negative - we're always looking down from the top
        const globalVar = this.globalVariables.get(offsetSigned)!;
        varName = globalVar.name;
        dataType = globalVar.dataType;
      } else {
        // Unknown - stable label from signed stack offset operand
        varName = this.generateVariableName(true, offsetSigned);
        dataType = NWScriptDataType.INTEGER; // Default, could be improved
      }
    } else {
      // Local variable (CPTOPSP)
      // CRITICAL: CPTOPSP reads from stack[SP + offset] where SP is the CURRENT stack pointer
      // We should resolve this dynamically using the actual stack state, not static offsets
      const offset = instruction.offset || 0;
      const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;

      // Prefer formals by absolute stack position (after RSADD, CPTOPSP operand changes
      // but the param slot's absolute address stays fixed).
      const sourceStackPos = this.stackPointer + offsetSigned;
      const spParamByAbs = this.cptopspParamByAbsolutePosition.get(sourceStackPos);
      if (spParamByAbs) {
        const expr = NWScriptExpression.variable(
          spParamByAbs.name,
          spParamByAbs.dataType,
          false
        );
        this.push(expr, instruction.address, copySize > 4 ? copySize : 4);
        return expr;
      }
      // Fallback: operand match only when no absolute frame was recorded (temps).
      const spParamEarly = this.cptopspParameterOperands.get(offsetSigned);
      if (spParamEarly && this.cptopspParamByAbsolutePosition.size === 0) {
        const expr = NWScriptExpression.variable(
          spParamEarly.name,
          spParamEarly.dataType,
          false
        );
        this.push(expr, instruction.address, copySize > 4 ? copySize : 4);
        return expr;
      }
      // First, try to resolve using the dynamic stack position map (stack-aware)
      const varIndex = this.variableStackPositions.get(sourceStackPos);
      if (varIndex !== undefined) {
        // RSADD-registered slot: analyzer may have no NWScriptLocalInit row (non −8 CPDOWNSP patterns).
        const init = this.localVariableInits[varIndex];
        varName = `localVar_${varIndex}`;
        dataType = init?.dataType ?? this.localSlotTypes[varIndex] ?? NWScriptDataType.INTEGER;
      } else {
        // Stack-aware fallback: Check all variable positions with tolerance
        // The stack may have grown between RSADD and CPTOPSP, so check all recorded positions
        let foundVar = false;
        let tolBestIdx: number | undefined;
        let tolBestDist = Number.POSITIVE_INFINITY;
        for (const [varPos, idx] of this.variableStackPositions.entries()) {
          const distance = Math.abs(sourceStackPos - varPos);
          if (distance > 28) {
            continue;
          }
          if (
            tolBestIdx === undefined ||
            distance < tolBestDist ||
            (distance === tolBestDist && idx < tolBestIdx)
          ) {
            tolBestDist = distance;
            tolBestIdx = idx;
          }
        }
        if (tolBestIdx !== undefined) {
          const init = this.localVariableInits[tolBestIdx];
          varName = `localVar_${tolBestIdx}`;
          dataType = init?.dataType ?? this.localSlotTypes[tolBestIdx] ?? NWScriptDataType.INTEGER;
          foundVar = true;
        }
        
        if (!foundVar) {
          // Last resort: pick closest mapped local by stack position (frame phases can drift > 28 bytes
          // when MOVSP reserves without mirroring array length).
          let bestIdx: number | undefined;
          let bestDist = Number.POSITIVE_INFINITY;
          for (const [varPos, idx] of this.variableStackPositions.entries()) {
            const d = Math.abs(sourceStackPos - varPos);
            if (bestIdx === undefined || d < bestDist || (d === bestDist && idx < bestIdx)) {
              bestDist = d;
              bestIdx = idx;
            }
          }
          if (bestIdx !== undefined && bestDist <= 512) {
            const init = this.localVariableInits[bestIdx];
            varName = `localVar_${bestIdx}`;
            dataType = init?.dataType ?? this.localSlotTypes[bestIdx] ?? NWScriptDataType.INTEGER;
            foundVar = true;
          }
        }

        if (!foundVar) {
          // Last resort: Fallback to static offset-based mapping (for backward compatibility)
          const offsetUnsigned = offset < 0 ? offset + 0x100000000 : offset;
          if (this.localVariables.has(offsetUnsigned)) {
            const localVar = this.localVariables.get(offsetUnsigned)!;
            varName = localVar.name;
            dataType = localVar.dataType;
          } else {
            varName = this.generateVariableName(false, offsetSigned);
            dataType = NWScriptDataType.INTEGER;
          }
        }
      }

      // Member slot (struct/vector component) — converter may register `localVar_N.x`
      const member = this.slotMemberNames.get(sourceStackPos);
      if (member && copySize <= 4) {
        varName = `${varName}.${member}`;
        if (dataType === NWScriptDataType.VECTOR) {
          dataType = NWScriptDataType.FLOAT;
        } else if (dataType === NWScriptDataType.STRUCTURE) {
          dataType = NWScriptDataType.INTEGER;
        }
      } else if (copySize === 12) {
        dataType = NWScriptDataType.VECTOR;
      } else if (copySize === 8 && (dataType === NWScriptDataType.STRUCTURE || dataType === NWScriptDataType.INTEGER)) {
        dataType = NWScriptDataType.STRUCTURE;
      }
    }
    
    const expr = NWScriptExpression.variable(varName, dataType, isGlobal);
    this.push(expr, instruction.address, copySize > 4 ? copySize : 4);
    return expr;
  }

  /**
   * Handle local variable write (CPDOWNSP)
   */
  private handleLocalWrite(instruction: NWScriptInstruction): NWScriptExpression | null {
    if (this.stack.length === 0) {
      return null;
    }

    const copySize = instruction.size || 4;
    if (copySize === 12) {
      const top = this.peek();
      if (top && (top.byteSize === 12 || top.expression.dataType === NWScriptDataType.VECTOR)) {
        return top.expression;
      }
      const comps = this.peekTopExpressions(3);
      if (comps.length === 3) {
        return NWScriptExpression.vectorLiteral(comps[0], comps[1], comps[2]);
      }
    }

    // CPDOWNSP copies from top of stack to a location down the stack
    // The value remains on the stack
    const topItem = this.peek();
    if (!topItem) {
      return null;
    }

    // Mirror the write into the expression stack so later CPTOPSP of that slot
    // sees the new value when the destination is still a live StackItem.
    let offset = instruction.offset || 0;
    if (offset > 0x7FFFFFFF) {
      offset -= 0x100000000;
    }
    const targetAbs = this.stackPointer + offset;
    let abs = this.stackPointer;
    for (let i = this.stack.length - 1; i >= 0; i--) {
      abs -= this.stack[i].byteSize || 4;
      if (abs === targetAbs) {
        this.stack[i].expression = topItem.expression;
        break;
      }
    }

    return topItem.expression;
  }

  /**
   * Handle global variable write (CPDOWNBP)
   */
  private handleGlobalWrite(instruction: NWScriptInstruction): NWScriptExpression | null {
    if (this.stack.length === 0) {
      return null;
    }

    // CPDOWNBP copies from top of stack to a global variable
    // The value remains on the stack
    const topItem = this.peek();
    if (topItem) {
      // The actual write is tracked by NWScriptVariableTracker
      return topItem.expression;
    }
    return null;
  }

  /**
   * Handle MOVSP (move stack pointer)
   */
  private handleMovsp(instruction: NWScriptInstruction): void {
    let offset = instruction.offset || 0;
    if (offset > 0x7FFFFFFF) {
      offset -= 0x100000000;
    }

    if (offset < 0) {
      // Shrink: remove values from the expression stack (cleanup after CPDOWN)
      let remaining = -offset;
      while (remaining > 0 && this.stack.length > 0) {
        const top = this.peek()!;
        const sz = top.byteSize || 4;
        if (sz > remaining) {
          break;
        }
        this.pop();
        remaining -= sz;
      }
      if (remaining > 0) {
        this.stackPointer -= remaining;
      }
    } else if (offset > 0) {
      this.stackPointer += offset;
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
    const sizeToDestroy = instruction.sizeToDestroy || 0;
    const offsetToSaveElement = instruction.offsetToSaveElement || 0;
    const sizeOfElementToSave = instruction.sizeOfElementToSave || 0;

    // Aggregate on top (struct/vector copy): extract member by byte offset
    const top = this.peek();
    if (
      top &&
      top.byteSize === sizeToDestroy &&
      (top.expression.dataType === NWScriptDataType.STRUCTURE ||
        top.expression.dataType === NWScriptDataType.VECTOR ||
        (top.expression.type === NWScriptExpressionType.VARIABLE && sizeToDestroy >= 8))
    ) {
      const base = this.pop()!;
      const member =
        offsetToSaveElement === 0
          ? "x"
          : offsetToSaveElement === 4
            ? "y"
            : offsetToSaveElement === 8
              ? "z"
              : `f${offsetToSaveElement / 4}`;
      let memberExpr: NWScriptExpression;
      if (base.expression.type === NWScriptExpressionType.VARIABLE && base.expression.variableName) {
        const baseName = base.expression.variableName.replace(/\.[xyz]$/, "");
        const fieldType =
          base.expression.dataType === NWScriptDataType.VECTOR
            ? NWScriptDataType.FLOAT
            : NWScriptDataType.INTEGER;
        memberExpr = NWScriptExpression.variable(`${baseName}.${member}`, fieldType, base.expression.isGlobal);
      } else {
        memberExpr = base.expression;
      }
      this.push(memberExpr, instruction.address, sizeOfElementToSave || 4);
      return;
    }
    
    // Convert bytes to number of items (each item is 4 bytes)
    const totalItemsToRemove = Math.floor(sizeToDestroy / 4);
    const offsetItems = Math.floor(offsetToSaveElement / 4);
    const itemsToSave = Math.floor(sizeOfElementToSave / 4);
    
    if (totalItemsToRemove === 0 || this.stack.length === 0) {
      console.warn('DESTRUCT', sizeToDestroy, offsetToSaveElement, sizeOfElementToSave, this.stack.length);
      return;
    }
    
    const saveStartFromTop = offsetItems;
    const saveEndFromTop = saveStartFromTop + itemsToSave;
    
    const savedItems: StackItem[] = [];
    if (itemsToSave > 0 && this.stack.length >= saveEndFromTop) {
      const saveStartIndex = this.stack.length - saveEndFromTop;
      const saveEndIndex = this.stack.length - saveStartFromTop;
      
      for (let i = saveStartIndex; i < saveEndIndex; i++) {
        savedItems.push(this.stack[i]);
      }
    }
    
    for (let i = 0; i < totalItemsToRemove && this.stack.length > 0; i++) {
      this.pop();
    }
    
    for (const item of savedItems) {
      this.push(item.expression, item.address, item.byteSize || 4);
    }
    // pop/push already adjusted SP — do not subtract sizeToDestroy again
  }

  /**
   * Handle RSADD (reserve space on stack)
   */
  private handleRsadd(instruction: NWScriptInstruction): void {
    // RSADD actually pushes a default value onto the stack (0, 0.0, '', etc.)
    // This matches the runtime behavior where RSADD pushes a value
    // The variable will live at this stack position
    
    // Determine the default value based on instruction type
    let defaultValue: any;
    let dataType: NWScriptDataType;
    
    switch (instruction.type) {
      case 3: // INTEGER
        defaultValue = 0;
        dataType = NWScriptDataType.INTEGER;
        break;
      case 4: // FLOAT
        defaultValue = 0.0;
        dataType = NWScriptDataType.FLOAT;
        break;
      case 5: // STRING
        defaultValue = '';
        dataType = NWScriptDataType.STRING;
        break;
      case 6: // OBJECT
        defaultValue = undefined;
        dataType = NWScriptDataType.OBJECT;
        break;
      case 16: // EFFECT
        defaultValue = undefined;
        dataType = NWScriptDataType.EFFECT;
        break;
      case 17: // EVENT
        defaultValue = undefined;
        dataType = NWScriptDataType.EVENT;
        break;
      case 18: // LOCATION
        defaultValue = undefined;
        dataType = NWScriptDataType.LOCATION;
        break;
      case 19: // TALENT
        defaultValue = undefined;
        dataType = NWScriptDataType.TALENT;
        break;
      default:
        // Default to integer
        defaultValue = 0;
        dataType = NWScriptDataType.INTEGER;
        break;
    }
    
    // Push the default value onto the stack
    // This creates a stack item that represents the variable's initial value
    const expr = NWScriptExpression.constant(defaultValue, dataType);
    this.push(expr, instruction.address);
  }

  /**
   * Handle local variable increment/decrement
   */
  private handleLocalIncrement(instruction: NWScriptInstruction): void {
    // DECISP/INCISP modify a local variable
    // They don't directly affect the stack, but the variable tracker handles this
  }

  /**
   * Handle global variable increment/decrement
   */
  private handleGlobalIncrement(instruction: NWScriptInstruction): void {
    // DECIBP/INCIBP modify a global variable
    // They don't directly affect the stack, but the variable tracker handles this
  }

  /**
   * Push an expression onto the stack
   */
  push(expression: NWScriptExpression, address: number, byteSize: number = 4): void {
    const size = byteSize > 0 ? byteSize : 4;
    this.stack.push({ expression, address, byteSize: size });
    this.stackPointer += size;
  }

  /**
   * Pop an expression from the stack
   */
  pop(): StackItem | null {
    if (this.stack.length === 0) {
      return null;
    }
    const item = this.stack.pop()!;
    this.stackPointer -= item.byteSize || 4;
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
   * Expressions at the top of the stack (oldest of the window first).
   * Used to build vector literals from three float CONST pushes before size-12 CPDOWN.
   */
  peekTopExpressions(count: number): NWScriptExpression[] {
    if (count <= 0 || this.stack.length === 0) {
      return [];
    }
    const start = Math.max(0, this.stack.length - count);
    return this.stack.slice(start).map((i) => i.expression);
  }

  /**
   * Get the current stack size (number of items)
   */
  getStackSize(): number {
    return this.stack.length;
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
    this.functionParameters.clear();
    this.cptopspParameterOperands.clear();
    this.cptopspParamByAbsolutePosition.clear();
  }

  /** Save stack depth/SP/BP for re-entrant probing (e.g. switch discriminant extraction). */
  takeStackSnapshot(): { stack: StackItem[]; stackPointer: number; basePointer: number } {
    return {
      stack: this.stack.map((i) => ({
        expression: i.expression,
        address: i.address,
        byteSize: i.byteSize,
      })),
      stackPointer: this.stackPointer,
      basePointer: this.basePointer,
    };
  }

  restoreStackSnapshot(snapshot: {
    stack: StackItem[];
    stackPointer: number;
    basePointer: number;
  }): void {
    this.stack = snapshot.stack.map((i) => ({
      expression: i.expression,
      address: i.address,
      byteSize: i.byteSize || 4,
    }));
    this.stackPointer = snapshot.stackPointer;
    this.basePointer = snapshot.basePointer;
  }

  /**
   * Set function parameters for parameter name mapping.
   * Absolute CPTOPSP formal slots use {@code paramFrameSp} when provided, otherwise the
   * current {@link stackPointer} (must be function-entry SP when recording).
   */
  setFunctionParameters(
    parameters: NWScriptFunctionParameter[],
    paramFrameSp?: number
  ): void {
    this.functionParameters.clear();
    this.cptopspParameterOperands.clear();
    this.cptopspParamByAbsolutePosition.clear();
    const entrySp = paramFrameSp ?? this.stackPointer;
    const recordAbs = paramFrameSp !== undefined || this.stackPointer !== 0;
    const bpParams = parameters.filter((p) => !p.resolvedViaSpOperand);
    const spParams = parameters
      .filter((p) => p.resolvedViaSpOperand)
      .sort((a, b) => a.offset - b.offset); // most-negative first = param1
    for (const param of bpParams) {
      this.functionParameters.set(param.offset, { name: param.name, dataType: param.dataType });
    }
    // Body CPTOPSP operands often reflect post-RSADD slots (e.g. −8 for a lone formal).
    // Absolute param frame uses canonical entry offsets −4*n … −4.
    for (let i = 0; i < spParams.length; i++) {
      const param = spParams[i];
      const canonicalOffset = -(spParams.length - i) * 4;
      const info = { name: param.name, dataType: param.dataType };
      this.cptopspParameterOperands.set(canonicalOffset, info);
      if (param.offset !== canonicalOffset) {
        this.cptopspParameterOperands.set(param.offset, info);
      }
      if (recordAbs) {
        this.cptopspParamByAbsolutePosition.set(entrySp + canonicalOffset, info);
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

  setLocalSlotTypes(types: NWScriptDataType[]): void {
    this.localSlotTypes = types;
  }

  setSlotMemberNames(members: Map<number, string>): void {
    this.slotMemberNames = members;
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
   * Get result data type from instruction type
   */
  private getResultType(type: number): NWScriptDataType {
    switch (type) {
      case 3: return NWScriptDataType.INTEGER;
      case 4: return NWScriptDataType.FLOAT;
      case 5: return NWScriptDataType.STRING;
      case 6: return NWScriptDataType.OBJECT;
      case 0x23: return NWScriptDataType.STRING; // ADDSS / string binary
      case 0x3a: return NWScriptDataType.VECTOR; // VV
      case 0x3b: // VF
      case 0x3c: // FV
        return NWScriptDataType.VECTOR;
      default: return NWScriptDataType.INTEGER;
    }
  }

  /**
   * Generate a variable name (must be a legal NSS identifier — no leading minus).
   */
  private generateVariableName(isGlobal: boolean, offsetSigned: number): string {
    const off =
      offsetSigned < 0 ? `n${Math.abs(offsetSigned)}` : String(offsetSigned);
    if (isGlobal) {
      return `g_bp_${off}`;
    }
    return `sp_${off}`;
  }
}

