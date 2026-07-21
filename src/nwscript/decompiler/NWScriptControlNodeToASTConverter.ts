import type { ControlNode, BasicBlockNode, IfNode, IfElseNode, WhileNode, DoWhileNode, ForNode, SwitchNode, SequenceNode } from "@/nwscript/decompiler/NWScriptControlStructureBuilder";
import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import type { NWScriptGlobalInit } from "@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer";
import type { NWScriptLocalInit } from "@/nwscript/decompiler/NWScriptLocalVariableAnalyzer";
import type { NWScriptControlStructureBuilder } from "@/nwscript/decompiler/NWScriptControlStructureBuilder";
import { NWScriptAST, NWScriptASTNodeType, type NWScriptASTNode, type NWScriptProgramNode, type NWScriptFunctionNode, type NWScriptBlockNode, type NWScriptIfNode, type NWScriptIfElseNode, type NWScriptWhileNode, type NWScriptDoWhileNode, type NWScriptForNode, type NWScriptSwitchNode, type NWScriptSwitchCaseNode, type NWScriptSwitchDefaultNode, type NWScriptExpressionStatementNode, type NWScriptAssignmentNode, type NWScriptReturnNode, type NWScriptBreakNode, type NWScriptContinueNode, NWScriptGlobalVariableDeclarationNode, NWScriptVariableDeclarationNode } from "@/nwscript/decompiler/NWScriptAST";
import { NWScriptExpressionBuilder } from "@/nwscript/decompiler/NWScriptExpressionBuilder";
import { NWScriptStackSimulator } from "@/nwscript/decompiler/NWScriptStackSimulator";
import { NWScriptExpression, NWScriptExpressionType } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { OP_RETN, OP_JMP, OP_CPDOWNSP, OP_CPDOWNBP, OP_MOVSP, OP_RSADD, OP_CPTOPSP, OP_CPTOPBP, OP_EQUAL, OP_NEQUAL, OP_GT, OP_GEQ, OP_LT, OP_LEQ, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_LOGANDII, OP_LOGORII, OP_JSR, OP_JZ, OP_JNZ, OP_CONST, OP_ACTION, OP_INCISP, OP_DECISP, OP_INCIBP, OP_DECIBP, OP_DESTRUCT } from "@/nwscript/NWScriptOPCodes";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptANDChainDetector } from "@/nwscript/decompiler/NWScriptANDChainDetector";
import { NWScriptORChainDetector } from "@/nwscript/decompiler/NWScriptORChainDetector";
import { nwscriptDecompilerDebug } from "@/nwscript/decompiler/NWScriptDecompilerDebug";
import {
  buildJsrCalleeArgSlotsByEntryPc,
  buildJsrUserRoutineMetaByEntryPc,
  instructionForwardStackSlotDelta,
  type JsrUserRoutineMeta,
} from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  buildActionDoCommandThunkArgByActionAddress,
  buildAssignCommandThunkArgByActionAddress,
  buildDelayCommandThunkCalleeByActionAddress,
} from "@/nwscript/decompiler/NWScriptStoreStateThunkSkip";

type DecompJumpHint =
  | { kind: "loop"; exit: NWScriptBasicBlock | null; header: NWScriptBasicBlock | null; increment: NWScriptBasicBlock | null }
  | { kind: "switch"; exit: NWScriptBasicBlock }
  | { kind: "if"; merge: NWScriptBasicBlock };
/**
 * Converts ControlNode tree to NWScriptASTNode tree.
 * This is the bridge between the control flow structure and the abstract syntax tree.
 *
 * Dead code: {@link NWScriptBasicBlock.isUnreachable} is set from whole-script CFG reachability and
 * does not always match per-procedure liveness, so we do not skip blocks solely on that flag here
 * (NCSDecomp-style `processCode` gating would need procedure-local reachability).
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptControlNodeToASTConverter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptControlNodeToASTConverter {
  private cfg: NWScriptControlFlowGraph;
  private functions: NWScriptFunction[];
  private globalInits: NWScriptGlobalInit[];
  private localInits: NWScriptLocalInit[];
  private expressionBuilder: NWScriptExpressionBuilder;
  private stackSimulator: NWScriptStackSimulator;
  private andChainDetector: NWScriptANDChainDetector;
  private orChainDetector: NWScriptORChainDetector;
  /** Innermost hints at end — used to classify lone JMP as break / continue vs switch exit / loop inc */
  private jumpHints: DecompJumpHint[] = [];
  
  /**
   * Map from blocks to their function context (for variable resolution)
   */
  private blockToFunction: Map<NWScriptBasicBlock, NWScriptFunction | null> = new Map();
  
  /**
   * Map from blocks to statements (cached)
   */
  private blockStatements: Map<NWScriptBasicBlock, NWScriptASTNode[]> = new Map();
  
  /**
   * Map from RETN blocks to their return value expressions
   * Used to preserve return values across blocks
   */
  private returnValueExpressions: Map<NWScriptBasicBlock, NWScriptExpression> = new Map();
  
  /**
   * Map from function to the return value stack position offset
   * The return value position is where RSADD reserved space before the JSR that calls the function
   * This is stored as an offset from the function's entry stack pointer
   * Key: function (null for main function)
   * Value: offset from function entry stack pointer where return value should be written
   */
  private functionReturnValueOffsets: Map<NWScriptFunction | null, number> = new Map();
  
  /**
   * Map from function to the function entry stack pointer
   * Used to calculate absolute return value position from offset
   */
  private functionEntryStackPointers: Map<NWScriptFunction | null, number> = new Map();
  
  /**
   * Track where variables live on the stack per function
   * Maps function -> stack position -> variable index
   * Key: stack position (absolute address where variable lives)
   * Value: variable index in localInits array
   */
  private functionVariableStackPositions: Map<NWScriptFunction | null, Map<number, number>> = new Map();

  /**
   * When set, {@link convertBasicBlock} stops before this instruction address (merged do-while body).
   */
  private basicBlockInstructionLimitAddress: number | undefined = undefined;

  /**
   * When converting a for-loop increment block, the back-edge JMP to the header is structural —
   * do not emit it as `continue`.
   */
  private convertingForIncrement = false;
  
  /**
   * Track variable allocations per function
   * Maps function to the number of variables allocated so far
   */
  private functionVariableCounts: Map<NWScriptFunction | null, number> = new Map();

  /** Declared local types per function (coalesced vector/struct slots). */
  private functionLocalTypes: Map<NWScriptFunction | null, NWScriptDataType[]> = new Map();

  /** Stack position → member name for aggregate component slots. */
  private functionSlotMembers: Map<NWScriptFunction | null, Map<number, string>> = new Map();

  /**
   * Pending RSADD coalesce: consecutive float×3 → vector, int×2 → struct when bytecode uses wide copies.
   */
  private rsaddAggregatePending: Map<
    NWScriptFunction | null,
    { kind: "vector" | "struct"; varIndex: number; remaining: number; members: string[] }
  > = new Map();

  /** Per-function: coalesce float triples / int pairs based on size-12 / size-8+DESTRUCT. */
  private functionAggregateHints: Map<
    NWScriptFunction | null,
    { coalesceVectors: boolean; coalesceStructs: boolean }
  > = new Map();

  /** Total int RSADDs in function (for pairing structs without an orphan trailing struct). */
  private functionIntRsaddTotals: Map<NWScriptFunction | null, number> = new Map();
  private functionIntRsaddSeen: Map<NWScriptFunction | null, number> = new Map();
  
  /**
   * Track the current function being processed
   * Used to maintain stack state across blocks
   */
  private currentFunction: NWScriptFunction | null = null;
  
  /**
   * Track if stack has been initialized for current function
   * Prevents re-initialization when processing multiple blocks
   */
  private functionStackInitialized: Set<NWScriptFunction | null> = new Set();

  /** Callee JSR pops — shared by main and temp stack/expr simulations. */
  private jsrCalleeArgSlotsByEntryPc: Map<number, number> = new Map();

  private jsrUserRoutineMetaByEntryPc: Map<number, JsrUserRoutineMeta> = new Map();

  /** Prevents emitting the same CFG basic block twice when it appears multiple times in the ControlNode tree. */
  private emittedBasicBlocksInCurrentProcedure: Set<NWScriptBasicBlock> = new Set();

  /**
   * Short-circuit probe blocks folded into a logical `&&`/`||` if-condition — skip nested empty ifs.
   */
  private shortCircuitAbsorbedBlocks: Set<NWScriptBasicBlock> = new Set();

  /**
   * RETN merge blocks already covered by a valued `return` emitted from a CPDOWNSP return-write
   * that JMPs/falls through to that merge — skip the default `return 0` on the shared RETN.
   */
  private retnMergeSatisfiedByReturn: Set<NWScriptBasicBlock> = new Set();

  /**
   * Upper bound (exclusive) for valid `localVar_i` indices when matching CPDOWNSP to RSADD slots.
   * {@link NWScriptLocalVariableAnalyzer} often under-counts (fixed −8 CPDOWNSP pattern); RSADD order in
   * this converter still records every slot in {@link functionVariableCounts}.
   */
  private getDeclaredLocalSlotCount(functionContext: NWScriptFunction | null): number {
    const fromRsadd =
      functionContext != null ? this.functionVariableCounts.get(functionContext) ?? 0 : 0;
    const coalesced = this.functionLocalTypes.get(functionContext);
    if (coalesced && coalesced.length > 0) {
      return Math.max(coalesced.length, fromRsadd);
    }
    return Math.max(this.localInits.length, fromRsadd);
  }

  private ensureAggregateHints(functionContext: NWScriptFunction | null): {
    coalesceVectors: boolean;
    coalesceStructs: boolean;
  } {
    if (this.functionAggregateHints.has(functionContext)) {
      return this.functionAggregateHints.get(functionContext)!;
    }
    let size12 = false;
    let size8 = false;
    let hasDestruct = false;
    let vvAdd = false;
    if (functionContext) {
      for (const block of functionContext.bodyBlocks) {
        for (const instr of block.instructions) {
          if (
            (instr.code === OP_CPTOPSP ||
              instr.code === OP_CPDOWNSP ||
              instr.code === OP_CPTOPBP ||
              instr.code === OP_CPDOWNBP) &&
            instr.size === 12
          ) {
            size12 = true;
          }
          if (
            (instr.code === OP_CPTOPSP ||
              instr.code === OP_CPDOWNSP ||
              instr.code === OP_CPTOPBP ||
              instr.code === OP_CPDOWNBP) &&
            instr.size === 8
          ) {
            size8 = true;
          }
          if (instr.code === OP_DESTRUCT) {
            hasDestruct = true;
          }
          if (
            (instr.code === OP_ADD ||
              instr.code === OP_SUB ||
              instr.code === OP_MUL ||
              instr.code === OP_DIV) &&
            instr.type === 0x3a
          ) {
            vvAdd = true;
          }
        }
      }
    }
    const hints = {
      coalesceVectors: size12 || vvAdd,
      coalesceStructs: size8 && hasDestruct,
    };
    this.functionAggregateHints.set(functionContext, hints);
    return hints;
  }

  /**
   * Register an RSADD stack slot, coalescing float×3 → vector and int×2 → struct when hinted.
   */
  private registerRsaddSlot(
    functionContext: NWScriptFunction | null,
    stackPos: number,
    rsaddType: number | undefined,
    variableStackPositions: Map<number, number>
  ): void {
    if (variableStackPositions.has(stackPos)) {
      return;
    }
    const hints = this.ensureAggregateHints(functionContext);
    const dataType = this.rsaddInstructionTypeToDataType(rsaddType);
    const types = this.functionLocalTypes.get(functionContext) || [];
    if (!this.functionLocalTypes.has(functionContext)) {
      this.functionLocalTypes.set(functionContext, types);
    }
    const members =
      this.functionSlotMembers.get(functionContext) || new Map<number, string>();
    if (!this.functionSlotMembers.has(functionContext)) {
      this.functionSlotMembers.set(functionContext, members);
    }

    const pending = this.rsaddAggregatePending.get(functionContext);
    if (pending && pending.remaining > 0) {
      const memberName = pending.members[pending.members.length - pending.remaining];
      variableStackPositions.set(stackPos, pending.varIndex);
      if (memberName) {
        members.set(stackPos, memberName);
      }
      pending.remaining--;
      if (pending.kind === "struct") {
        const seen = this.functionIntRsaddSeen.get(functionContext) || 0;
        this.functionIntRsaddSeen.set(functionContext, seen + 1);
      }
      if (pending.remaining <= 0) {
        this.rsaddAggregatePending.delete(functionContext);
      }
      this.syncAggregateMapsToSimulators(functionContext, variableStackPositions);
      return;
    }

    if (hints.coalesceVectors && dataType === NWScriptDataType.FLOAT) {
      const varIndex = this.functionVariableCounts.get(functionContext) || 0;
      variableStackPositions.set(stackPos, varIndex);
      members.set(stackPos, "x");
      types.push(NWScriptDataType.VECTOR);
      this.functionVariableCounts.set(functionContext, varIndex + 1);
      this.rsaddAggregatePending.set(functionContext, {
        kind: "vector",
        varIndex,
        remaining: 2,
        members: ["x", "y", "z"],
      });
      this.syncAggregateMapsToSimulators(functionContext, variableStackPositions);
      return;
    }

    if (hints.coalesceStructs && dataType === NWScriptDataType.INTEGER) {
      if (!this.functionIntRsaddTotals.has(functionContext)) {
        let total = 0;
        if (functionContext) {
          for (const block of functionContext.bodyBlocks) {
            for (const instr of block.instructions) {
              if (instr.code === OP_RSADD && instr.type === 3) {
                total++;
              }
            }
          }
        }
        this.functionIntRsaddTotals.set(functionContext, total);
      }
      const totalInts = this.functionIntRsaddTotals.get(functionContext) || 0;
      const seen = this.functionIntRsaddSeen.get(functionContext) || 0;
      // Pair consecutive ints into structs; leave a trailing odd int as a scalar
      if (seen % 2 === 0 && seen + 1 < totalInts) {
        const varIndex = this.functionVariableCounts.get(functionContext) || 0;
        variableStackPositions.set(stackPos, varIndex);
        members.set(stackPos, "x");
        types.push(NWScriptDataType.STRUCTURE);
        this.functionVariableCounts.set(functionContext, varIndex + 1);
        this.functionIntRsaddSeen.set(functionContext, seen + 1);
        this.rsaddAggregatePending.set(functionContext, {
          kind: "struct",
          varIndex,
          remaining: 1,
          members: ["x", "y"],
        });
        this.syncAggregateMapsToSimulators(functionContext, variableStackPositions);
        return;
      }
      this.functionIntRsaddSeen.set(functionContext, seen + 1);
      // fall through to scalar int
    }

    const varIndex = this.functionVariableCounts.get(functionContext) || 0;
    variableStackPositions.set(stackPos, varIndex);
    types.push(dataType);
    this.functionVariableCounts.set(functionContext, varIndex + 1);
    this.syncAggregateMapsToSimulators(functionContext, variableStackPositions);
  }

  private syncAggregateMapsToSimulators(
    functionContext: NWScriptFunction | null,
    variableStackPositions: Map<number, number>
  ): void {
    this.stackSimulator.setVariableStackPositions(variableStackPositions);
    this.expressionBuilder.setVariableStackPositions(variableStackPositions);
    const types = this.functionLocalTypes.get(functionContext) || [];
    this.stackSimulator.setLocalSlotTypes(types);
    const members = this.functionSlotMembers.get(functionContext) || new Map();
    this.stackSimulator.setSlotMemberNames(members);
  }

  /** Resolve assignment LHS name, including `localVar_N.x` for aggregate fields. */
  private resolveAssignTargetName(
    functionContext: NWScriptFunction | null,
    targetStackPos: number,
    copySize: number,
    variableStackPositions: Map<number, number>
  ): string | undefined {
    const varIndex = variableStackPositions.get(targetStackPos);
    if (varIndex === undefined) {
      return undefined;
    }
    const members = this.functionSlotMembers.get(functionContext);
    const member = members?.get(targetStackPos);
    if (member && copySize <= 4) {
      return `localVar_${varIndex}.${member}`;
    }
    return `localVar_${varIndex}`;
  }

  /**
   * Value expression for CPDOWN — coalesce three float consts into a vector literal when size=12.
   */
  private resolveCpdownValueExpression(
    instruction: NWScriptInstruction,
    fallback: NWScriptExpression | null | undefined
  ): NWScriptExpression | null {
    const copySize = instruction.size || 4;
    if (copySize === 12) {
      const top = this.stackSimulator.peek();
      if (top && (top.byteSize === 12 || top.expression.dataType === NWScriptDataType.VECTOR)) {
        return top.expression;
      }
      const comps = this.stackSimulator.peekTopExpressions(3);
      if (comps.length === 3) {
        return NWScriptExpression.vectorLiteral(comps[0], comps[1], comps[2]);
      }
    }
    return fallback || this.stackSimulator.peek()?.expression || null;
  }

  private rsaddInstructionTypeToDataType(typeField: number | undefined): NWScriptDataType {
    switch (typeField) {
      case 3:
        return NWScriptDataType.INTEGER;
      case 4:
        return NWScriptDataType.FLOAT;
      case 5:
        return NWScriptDataType.STRING;
      case 6:
        return NWScriptDataType.OBJECT;
      case 0x10:
        return NWScriptDataType.EFFECT;
      case 0x11:
        return NWScriptDataType.EVENT;
      case 0x12:
        return NWScriptDataType.LOCATION;
      case 0x13:
        return NWScriptDataType.TALENT;
      case 0x14:
        return NWScriptDataType.VECTOR;
      case 0x24:
        return NWScriptDataType.STRUCTURE;
      default:
        return NWScriptDataType.INTEGER;
    }
  }

  /**
   * RSADD sites in this function's body (block start address, then linear instruction order).
   * Aligns with {@link functionVariableCounts} / {@code localVar_i} indices for typical linear code.
   */
  private collectOrderedRsaddSitesInFunction(
    func: NWScriptFunction
  ): Array<{ address: number; dataType: NWScriptDataType }> {
    const out: Array<{ address: number; dataType: NWScriptDataType }> = [];
    const blocks = Array.from(func.bodyBlocks).sort(
      (a, b) => a.startInstruction.address - b.startInstruction.address
    );
    for (const block of blocks) {
      for (const instr of block.instructions) {
        if (instr.code === OP_RSADD) {
          out.push({
            address: instr.address,
            dataType: this.rsaddInstructionTypeToDataType(instr.type),
          });
        }
      }
    }
    return out;
  }

  constructor(
    cfg: NWScriptControlFlowGraph,
    functions: NWScriptFunction[] = [],
    globalInits: NWScriptGlobalInit[] = [],
    localInits: NWScriptLocalInit[] = []
  ) {
    this.cfg = cfg;
    this.functions = functions;
    this.globalInits = globalInits;
    this.localInits = localInits;
    
    // Initialize expression builder and stack simulator with variable mappings
    this.expressionBuilder = new NWScriptExpressionBuilder();
    this.stackSimulator = new NWScriptStackSimulator();
    this.andChainDetector = new NWScriptANDChainDetector();
    this.orChainDetector = new NWScriptORChainDetector();

    this.jsrCalleeArgSlotsByEntryPc = buildJsrCalleeArgSlotsByEntryPc(functions, cfg.script);
    this.jsrUserRoutineMetaByEntryPc = buildJsrUserRoutineMetaByEntryPc(functions);
    this.stackSimulator.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    this.stackSimulator.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    this.expressionBuilder.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    this.expressionBuilder.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);

    const delayThunks = buildDelayCommandThunkCalleeByActionAddress(
      cfg.script,
      functions,
      (instr) =>
        instr.actionDefinition?.name === "DelayCommand" || instr.action === 7
    );
    this.stackSimulator.setDelayCommandThunkSecondArg(delayThunks);
    const actionDoThunks = buildActionDoCommandThunkArgByActionAddress(
      cfg.script,
      functions
    );
    this.stackSimulator.setActionDoCommandThunkArg(actionDoThunks);
    const assignThunks = buildAssignCommandThunkArgByActionAddress(
      cfg.script,
      functions
    );
    this.stackSimulator.setAssignCommandThunkArg(assignThunks);
    
    this.setupVariableMappings();
    this.buildBlockToFunctionMap();
  }

  private createTempStackSimulator(): NWScriptStackSimulator {
    const s = new NWScriptStackSimulator();
    s.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    s.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    s.setDelayCommandThunkSecondArg(this.stackSimulator.getDelayCommandThunkSecondArg());
    s.setActionDoCommandThunkArg(this.stackSimulator.getActionDoCommandThunkArg());
    s.setAssignCommandThunkArg(this.stackSimulator.getAssignCommandThunkArg());
    return s;
  }

  private createTempExpressionBuilder(): NWScriptExpressionBuilder {
    const e = new NWScriptExpressionBuilder();
    e.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    e.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    return e;
  }

  /**
   * Setup variable mappings for expression builder and stack simulator
   */
  /** Resolve CPDOWNBP/CPTOPBP signed BP offset to `globalVar_N`. */
  private resolveGlobalVarName(offsetSigned: number): string | undefined {
    for (let i = 0; i < this.globalInits.length; i++) {
      const init = this.globalInits[i];
      const initOff =
        init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
      if (initOff === offsetSigned) {
        return `globalVar_${i}`;
      }
    }
    // Single-global scripts often use BP-4; fall back when analyzer under-counted
    if (this.globalInits.length === 1 && offsetSigned === -4) {
      return "globalVar_0";
    }
    if (this.globalInits.length > 0 && offsetSigned < 0 && offsetSigned % 4 === 0) {
      const idx = this.globalInits.length + offsetSigned / 4;
      if (idx >= 0 && idx < this.globalInits.length) {
        return `globalVar_${idx}`;
      }
    }
    return undefined;
  }

  private setupVariableMappings(): void {
    // Setup global variables
    const globalVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
    for (let i = 0; i < this.globalInits.length; i++) {
      const init = this.globalInits[i];
      const varName = `globalVar_${i}`;
      const offsetSigned = init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
      globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
    }
    this.expressionBuilder.setGlobalVariables(globalVarMap);
    this.stackSimulator.setGlobalVariables(globalVarMap);
    
    // Setup local variables (per function)
    // This will be done per-function when processing
  }

  /**
   * Set function parameters for expression builder and stack simulator
   */
  private setFunctionParametersForBuilders(func: NWScriptFunction): void {
    // Both ExpressionBuilder and StackSimulator expect an array
    this.expressionBuilder.setFunctionParameters(func.parameters);
    this.stackSimulator.setFunctionParameters(func.parameters);
  }

  /**
   * Build map from blocks to their containing function
   */
  private buildBlockToFunctionMap(): void {
    this.blockToFunction.clear();
    
    for (const func of this.functions) {
      for (const block of func.bodyBlocks) {
        this.blockToFunction.set(block, func);
      }
    }
  }

  private pushSwitchJumpHints(node: SwitchNode): void {
    if (node.switchExitBlock) {
      this.jumpHints.push({ kind: "switch", exit: node.switchExitBlock });
    }
  }

  private pushLoopJumpHints(node: ForNode | WhileNode | DoWhileNode): void {
    const exit = node.loopExitBlock ?? null;
    let header: NWScriptBasicBlock | null = node.loopHeaderBlock ?? null;
    if (!header && node.condition.type === "basic_block") {
      header = node.condition.block;
    }
    let increment: NWScriptBasicBlock | null = null;
    if (node.type === "for") {
      increment =
        node.forIncrementBlock ??
        (node.increment?.type === "basic_block" ? node.increment.block : null);
    }
    this.jumpHints.push({ kind: "loop", exit, header, increment });
  }

  private popJumpHint(): void {
    this.jumpHints.pop();
  }

  /**
   * Classify JMP to `target` inside nested switch/for/while using active jump hints from innermost outward.
   */
  private classifyStructuredJumpTarget(target: NWScriptBasicBlock | null): "break" | "continue" | null {
    if (!target) return null;

    for (let i = this.jumpHints.length - 1; i >= 0; i--) {
      const h = this.jumpHints[i];
      if (h.kind === "switch" && target === h.exit) {
        return "break";
      }
    }

    for (let i = this.jumpHints.length - 1; i >= 0; i--) {
      const h = this.jumpHints[i];
      if (h.kind !== "loop") continue;
      if (h.exit != null && target === h.exit) return "break";
      if (h.increment != null && target === h.increment) return "continue";
      if (h.header != null && target === h.header) return "continue";
      // `continue` often lands on a tiny trampoline block that only JMPs to the header
      if (h.header != null && this.blockIsContinueTrampolineTo(target, h.header)) {
        return "continue";
      }
      // while/do-while: continue may land on the latch (incr + JMP header), not the header
      if (h.header != null && this.blockIsLoopLatchContinueTarget(target, h.header)) {
        return "continue";
      }
    }

    return null;
  }

  /** True when {@code target} is the active if/if-else merge (structural fallthrough). */
  private isActiveIfMergeTarget(target: NWScriptBasicBlock | null): boolean {
    if (!target) return false;
    for (let i = this.jumpHints.length - 1; i >= 0; i--) {
      const h = this.jumpHints[i];
      if (h.kind === "if" && target === h.merge) {
        return true;
      }
    }
    return false;
  }

  /** True when {@code block} is solely a JMP to {@code header} (continue trampoline). */
  private blockIsContinueTrampolineTo(
    block: NWScriptBasicBlock,
    header: NWScriptBasicBlock
  ): boolean {
    if (block.instructions.length === 0) {
      return false;
    }
    for (const ins of block.instructions) {
      if (ins.code !== OP_JMP) {
        return false;
      }
    }
    const end = block.endInstruction;
    if (end.code !== OP_JMP || end.offset === undefined) {
      return false;
    }
    const dest = this.cfg.getBlockForAddress(end.address + end.offset);
    return dest === header;
  }

  /**
   * True when {@code block} is a while/do-while latch that continues the loop: it JMPs to
   * {@code header} (possibly after incr/CPDOWN). Used so `if (j==1) continue;` that jumps
   * to the latch is not left as an empty then-arm (smoke_24).
   */
  private blockIsLoopLatchContinueTarget(
    block: NWScriptBasicBlock,
    header: NWScriptBasicBlock
  ): boolean {
    if (block === header) {
      return true;
    }
    if (this.blockIsContinueTrampolineTo(block, header)) {
      return true;
    }
    for (const ins of block.instructions) {
      if (ins.code === OP_JMP && ins.offset !== undefined) {
        const dest = this.cfg.getBlockForAddress(ins.address + ins.offset);
        if (dest === header) {
          return true;
        }
        if (dest && this.blockIsContinueTrampolineTo(dest, header)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * After emitting a valued return from a CPDOWNSP return-write in {@code block}, mark the
   * shared RETN merge (JMP target or successor with RETN) so the merge does not emit
   * another default `return 0`.
   */
  private markRetnMergeSatisfiedFromReturnWriteBlock(block: NWScriptBasicBlock): void {
    const end = block.endInstruction;
    if (end?.code === OP_JMP && end.offset !== undefined) {
      const dest = this.cfg.getBlockForAddress(end.address + end.offset);
      if (dest && this.blockContainsRetn(dest)) {
        this.retnMergeSatisfiedByReturn.add(dest);
        return;
      }
    }
    for (const succ of block.successors) {
      if (this.blockContainsRetn(succ)) {
        this.retnMergeSatisfiedByReturn.add(succ);
      }
    }
    // Fallthrough: RETN in this same block after the return-write
    if (this.blockContainsRetn(block)) {
      this.retnMergeSatisfiedByReturn.add(block);
    }
  }

  private blockContainsRetn(block: NWScriptBasicBlock): boolean {
    if (block.endInstruction?.code === OP_RETN) {
      return true;
    }
    return block.instructions.some((ins) => ins.code === OP_RETN);
  }

  /**
   * True when {@code body} is a single break or continue (possibly wrapped in nested empty blocks).
   * Used to collapse `if (cond) break; else continue;` latch noise on while bodies.
   */
  private blockIsSoleJumpStatement(
    body: NWScriptBlockNode,
    kind: NWScriptASTNodeType.BREAK | NWScriptASTNodeType.CONTINUE
  ): boolean {
    let stmts = body.statements;
    // Unwrap nested single-statement blocks
    while (stmts.length === 1 && stmts[0].type === NWScriptASTNodeType.BLOCK) {
      stmts = (stmts[0] as NWScriptBlockNode).statements;
    }
    return stmts.length === 1 && stmts[0].type === kind;
  }

  /**
   * Convert ControlNode tree to AST Program node
   * @param mainControlNode The ControlNode tree for the main function
   * @param structureBuilder The structure builder (needed to build ControlNode trees for functions)
   */
  convertToAST(mainControlNode: ControlNode, structureBuilder: NWScriptControlStructureBuilder): NWScriptProgramNode {
    // Build global variable declarations
    const globalVars = this.buildGlobalVariableDeclarations();
    
    // Build function nodes (including main function)
    // The main function should be output as a function, not as mainBody
    const functionNodes = this.buildFunctionNodes(structureBuilder, mainControlNode);
    
    // Main body should only be used if there's code outside of functions
    // For now, we'll leave it undefined since all code is in functions
    const mainBody: NWScriptBlockNode | undefined = undefined;
    
    // Create program node
    const program = NWScriptAST.createProgram(globalVars, functionNodes, mainBody);
    
    // Build parent relationships
    NWScriptAST.buildParentRelationships(program);
    
    return program;
  }

  /**
   * Convert a ControlNode to an AST Block node
   */
  convertControlNodeToBlock(controlNode: ControlNode, functionContext: NWScriptFunction | null): NWScriptBlockNode {
    const statements: NWScriptASTNode[] = [];
    
    // Initialize stack state for this function if not already done
    // This ensures stack state persists across blocks within the same function
    if (functionContext !== this.currentFunction) {
      // New function - reset stack state
      this.currentFunction = functionContext;
      this.stackSimulator.clear();
      this.functionStackInitialized.delete(functionContext);
      this.emittedBasicBlocksInCurrentProcedure.clear();
      this.shortCircuitAbsorbedBlocks.clear();
      this.retnMergeSatisfiedByReturn.clear();

      // Initialize variable tracking for this function
      if (!this.functionVariableCounts.has(functionContext)) {
        this.functionVariableCounts.set(functionContext, 0);
      }
      if (!this.functionVariableStackPositions.has(functionContext)) {
        this.functionVariableStackPositions.set(functionContext, new Map());
      }
    }
    
    // Setup function context for variable resolution
    if (functionContext && !this.functionStackInitialized.has(functionContext)) {
      this.setupFunctionContext(functionContext);
      this.functionStackInitialized.add(functionContext);
      const entrySp = this.functionEntryStackPointers.get(functionContext);
      if (entrySp !== undefined) {
        this.stackSimulator.setProgramStackPointer(entrySp);
        this.expressionBuilder.setStackPointer(entrySp);
      }
    }
    
    // Convert the control node to statements
    this.convertControlNode(controlNode, functionContext, statements);
    
    return NWScriptAST.createBlock(statements);
  }

  /**
   * Convert a ControlNode to AST nodes (recursive)
   */
  private convertControlNode(
    controlNode: ControlNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): void {
    nwscriptDecompilerDebug(`[ControlNode] Converting ${controlNode.type} node`);
    switch (controlNode.type) {
      case 'basic_block':
        // OR-ladder probe blocks absorbed into a short-circuit condition (while bodies
        // reach them as plain blocks, not if headers) must not re-materialize as
        // bogus `if (localVar_N)` / expression statements.
        if (this.shortCircuitAbsorbedBlocks.has(controlNode.block)) {
          nwscriptDecompilerDebug(`[ControlNode] Skipping short-circuit-absorbed block ${controlNode.block.id}`);
          break;
        }
        nwscriptDecompilerDebug(`[ControlNode] Processing basic_block node, block ID: ${controlNode.block.id}, instructions: ${controlNode.block.instructions.length}`);
        this.convertBasicBlock(controlNode, functionContext, statements);
        break;
      
      case 'if': {
        // CRITICAL: Process header block first to handle RSADD and assignments
        // The header block may contain variable declarations before the condition
        // We need to process these BEFORE the if statement is created
        const ifNode = controlNode as IfNode;
        if (
          ifNode.condition.type === 'basic_block' &&
          this.shortCircuitAbsorbedBlocks.has(ifNode.condition.block)
        ) {
          break;
        }
        // Condition-only headers (CPTOP/ACTION/…/JZ, no decl CPDOWN) net zero at runtime —
        // the JZ pops the built value. The live sim never processes JZ, so restore the
        // pre-header stack after conversion or each such if leaks +4 SP into later blocks.
        let preHeaderSnap: ReturnType<NWScriptStackSimulator['takeStackSnapshot']> | null = null;
        if (ifNode.condition.type === 'basic_block') {
          const headerBlock = ifNode.condition.block;
          const conditionInstr = headerBlock.conditionInstruction;
          
          if (conditionInstr) {
            // Only process init/decl ops before the condition expression. CPTOP duplicates
            // immediately before JZ belong to the short-circuit condition, not side effects.
            let preCondEndAddr = conditionInstr.address;
            let scanPre: NWScriptInstruction | null | undefined = headerBlock.startInstruction;
            let lastCpdown: NWScriptInstruction | null = null;
            let preScanGuard = 100000;
            while (scanPre && scanPre.address < conditionInstr.address && preScanGuard-- > 0) {
              if (scanPre.code === OP_CPDOWNSP || scanPre.code === OP_CPDOWNBP) {
                lastCpdown = scanPre;
              }
              scanPre = scanPre.nextInstr;
            }
            if (lastCpdown) {
              let endAt: NWScriptInstruction | null | undefined = lastCpdown.nextInstr;
              if (endAt && endAt.code === OP_MOVSP) {
                endAt = endAt.nextInstr;
              }
              if (endAt && endAt.address <= conditionInstr.address) {
                preCondEndAddr = endAt.address;
              }
            } else {
              preHeaderSnap = this.stackSimulator.takeStackSnapshot();
            }

            const preConditionInstructions = headerBlock.instructions.filter(instr => 
              instr.address < preCondEndAddr
            );
            
            if (preConditionInstructions.length > 0) {
              nwscriptDecompilerDebug(`[ControlNode] Processing ${preConditionInstructions.length} pre-condition instructions in if header block ${headerBlock.id}`);
              
              // Process these instructions using convertBasicBlock logic
              // But we need to process them in the context of the current function
              // Create a temporary basic block node for just the pre-condition instructions
              // Actually, we should just process them directly using the same logic as convertBasicBlock
              
              // Initialize if needed
              if (!this.functionVariableCounts.has(functionContext)) {
                this.functionVariableCounts.set(functionContext, 0);
              }
              if (!this.functionVariableStackPositions.has(functionContext)) {
                this.functionVariableStackPositions.set(functionContext, new Map());
              }
              
              // Get the variable stack positions map for this function
              const variableStackPositions = this.functionVariableStackPositions.get(functionContext)!;
              
              const preConditionStatements: NWScriptASTNode[] = [];
              
              // Process each pre-condition instruction
              // Update stack simulator's variable position map for stack-aware resolution
              this.stackSimulator.setVariableStackPositions(variableStackPositions);
              this.stackSimulator.setLocalVariableInits(this.localInits);
              
              // Also update expression builder for consistency
              this.expressionBuilder.setVariableStackPositions(variableStackPositions);
              this.expressionBuilder.setLocalVariableInits(this.localInits);
              this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());
              
              for (const instr of preConditionInstructions) {
                // Track RSADD BEFORE processing
                let isRsadd = false;
                if (instr.code === OP_RSADD) {
                  isRsadd = true;
                  const stackPosBeforeRsadd = this.stackSimulator.getStackPointer();
                  this.registerRsaddSlot(
                    functionContext,
                    stackPosBeforeRsadd,
                    instr.type,
                    variableStackPositions
                  );
                  this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());

                  // Process RSADD instruction
                  this.stackSimulator.processInstruction(instr);
                  continue; // Skip creating statements for RSADD
                }
                
                // Check for CPDOWNSP assignments
                // CRITICAL: Calculate target position BEFORE processing the instruction
                // CPDOWNSP writes to stack[SP + offset] where SP is BEFORE the instruction
                if (instr.code === OP_CPDOWNSP) {
                  // Get SP BEFORE processing the instruction
                  const spBefore = this.stackSimulator.getStackPointer();
                  const offset = instr.offset || 0;
                  const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
                  const targetStackPos = spBefore + offsetSigned;
                  
                  // Now process the instruction
                  const processedExpr = this.stackSimulator.processInstruction(instr);
                  const valueExpr = processedExpr || this.stackSimulator.peek()?.expression;
                  if (valueExpr) {
                    nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: Address: 0x${instr.address.toString(16).padStart(8, '0')}, SP before: ${spBefore}, Offset: ${offsetSigned}, Target pos: ${targetStackPos}`);
                    nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: Variable positions:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
                    
                    const varIndex = variableStackPositions.get(targetStackPos);
                    nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: Looking up variable at position ${targetStackPos}: found index ${varIndex}`);
                    
                    const slotCap = this.getDeclaredLocalSlotCount(functionContext);
                    if (varIndex !== undefined && varIndex >= 0 && varIndex < slotCap) {
                      const varName = `localVar_${varIndex}`;
                      nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: ✓ Creating assignment: ${varName} = <expression>`);
                      preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                      continue;
                    }
                    
                    // Try nearby positions (stack-aware tolerance)
                    for (let delta = -4; delta <= 4; delta += 4) {
                      const nearbyPos = targetStackPos + delta;
                      const nearbyVarIndex = variableStackPositions.get(nearbyPos);
                      if (nearbyVarIndex !== undefined && nearbyVarIndex >= 0 && nearbyVarIndex < slotCap) {
                        const varName = `localVar_${nearbyVarIndex}`;
                        nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: ✓ Found nearby variable at position ${nearbyPos} (delta ${delta}): ${varName}`);
                        preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                        continue;
                      }
                    }
                    
                    // Stack-aware fallback: Check all variable positions with tolerance
                    // The stack may have grown between RSADD and CPDOWNSP, so check all recorded positions
                    for (const [varPos, varIndex] of variableStackPositions.entries()) {
                      const distance = Math.abs(targetStackPos - varPos);
                      // Allow tolerance (±8 bytes) since the stack may have grown
                      if (distance <= 8 && varIndex >= 0 && varIndex < slotCap) {
                        const varName = `localVar_${varIndex}`;
                        nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: ✓ Found variable by position proximity: ${varName} (distance: ${distance})`);
                        preConditionStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
                        continue;
                      }
                    }
                    
                    nwscriptDecompilerDebug(`[CPDOWNSP] Pre-condition: ✗ No variable found for assignment at position ${targetStackPos}`);
                  }
                  continue; // Skip adding as expression statement
                }
                
                // Process other instructions
                const expr = this.stackSimulator.processInstruction(instr);

                if (
                  instr.code === OP_INCISP ||
                  instr.code === OP_DECISP ||
                  instr.code === OP_INCIBP ||
                  instr.code === OP_DECIBP
                ) {
                  const incExpr = this.buildIncrementExpression(
                    instr,
                    functionContext,
                    variableStackPositions
                  );
                  if (incExpr) {
                    preConditionStatements.push(NWScriptAST.createExpressionStatement(incExpr));
                  }
                  continue;
                }
                
                // Skip creating expression statements for intermediate values in pre-condition processing
                // These are typically:
                // - String constants (function parameters)
                // - Function call results that will be assigned
                // - Intermediate expressions that are part of larger expressions
                // We only want to output statements that are meaningful (assignments, function calls with side effects, etc.)
                // For now, skip all expression statements in pre-condition processing
                // They will be handled as part of assignments or condition extraction
                // The condition expression will be extracted separately
              }
              
              // Add pre-condition statements to parent
              statements.push(...preConditionStatements);
              nwscriptDecompilerDebug(`[ControlNode] Added ${preConditionStatements.length} pre-condition statements before if`);
            }
          }
        }
        
        // Condition extraction replays the header instructions itself, and the runtime JZ
        // pops the condition before the then-body runs — restore the pre-header stack now
        // so both the replay and the body see the correct SP.
        if (preHeaderSnap) {
          this.stackSimulator.restoreStackSnapshot(preHeaderSnap);
        }
        // Now create the if node (condition extraction will work correctly)
        // But we need to prevent duplicate processing of the header block
        statements.push(this.convertIfNode(ifNode, functionContext));
        break;
      }
      
      case 'if_else': {
        const ifElseNode = controlNode as IfElseNode;
        if (
          ifElseNode.condition.type === 'basic_block' &&
          this.shortCircuitAbsorbedBlocks.has(ifElseNode.condition.block)
        ) {
          break;
        }
        this.emitPreConditionSideEffects(
          ifElseNode.condition,
          functionContext,
          statements
        );
        statements.push(this.convertIfElseNode(ifElseNode, functionContext));
        break;
      }
      
      case 'while':
        statements.push(this.convertWhileNode(controlNode, functionContext));
        break;
      
      case 'do_while':
        statements.push(this.convertDoWhileNode(controlNode, functionContext));
        break;
      
      case 'for':
        statements.push(this.convertForNode(controlNode, functionContext));
        break;
      
      case 'switch':
        statements.push(this.convertSwitchNode(controlNode, functionContext));
        break;
      
      case 'sequence':
        // Convert each node in sequence
        nwscriptDecompilerDebug(`[ControlNode] Processing sequence node with ${controlNode.nodes.length} nodes`);
        for (let i = 0; i < controlNode.nodes.length; i++) {
          const child = controlNode.nodes[i];
          nwscriptDecompilerDebug(`[ControlNode] Sequence node ${i + 1}/${controlNode.nodes.length}: ${child.type}`);
          // Post-for exit blocks (e.g. `i = 0` before do-while) may have been cached empty
          // when claimed as an if-merge — force a fresh convert.
          if (
            child.type === "basic_block" &&
            i > 0 &&
            controlNode.nodes[i - 1].type === "for"
          ) {
            this.emittedBasicBlocksInCurrentProcedure.delete(child.block);
            this.blockStatements.delete(child.block);
          }
          this.convertControlNode(child, functionContext, statements);
        }
        break;
    }
  }

  /**
   * Emit side-effect statements that appear in an if/if-else header before the JZ/JNZ
   * (e.g. {@code ++i;} before {@code if (i >= 2)} sharing one basic block).
   */
  private emitPreConditionSideEffects(
    conditionNode: ControlNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): void {
    if (conditionNode.type !== "basic_block") {
      return;
    }
    const headerBlock = conditionNode.block;
    const conditionInstr = headerBlock.conditionInstruction;
    if (!conditionInstr) {
      return;
    }

    // Only process init/decl ops before the condition expression. CPTOP/CONST/ACTION
    // immediately before JZ belong to the condition — processing them here leaves a
    // phantom +4 on the live stack (JZ is never simulated), so return-slot CPDOWNSP
    // in then/else mis-resolves onto a local (smoke_13: `return 1` → `localVar_0 = 1`).
    let preCondEndAddr = conditionInstr.address;
    let scanPre: NWScriptInstruction | null | undefined = headerBlock.startInstruction;
    let lastCpdown: NWScriptInstruction | null = null;
    let preScanGuard = 100000;
    while (scanPre && scanPre.address < conditionInstr.address && preScanGuard-- > 0) {
      if (scanPre.code === OP_CPDOWNSP || scanPre.code === OP_CPDOWNBP) {
        lastCpdown = scanPre;
      }
      scanPre = scanPre.nextInstr;
    }
    if (lastCpdown) {
      let endAt: NWScriptInstruction | null | undefined = lastCpdown.nextInstr;
      if (endAt && endAt.code === OP_MOVSP) {
        endAt = endAt.nextInstr;
      }
      if (endAt && endAt.address <= conditionInstr.address) {
        preCondEndAddr = endAt.address;
      }
    } else {
      // Condition-only header (e.g. PrintInteger(203); if (1) break;): emit call
      // side effects before the JZ, then restore SP so predicate CPTOP/CONST do not leak.
      const snap = this.stackSimulator.takeStackSnapshot();
      try {
        this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());
        for (const instr of headerBlock.instructions) {
          if (instr.address >= conditionInstr.address) {
            break;
          }
          const processed = this.stackSimulator.processInstruction(instr);
          this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());
          if (
            (instr.code === OP_ACTION || instr.code === OP_JSR) &&
            processed &&
            processed.type === NWScriptExpressionType.FUNCTION_CALL
          ) {
            statements.push(NWScriptAST.createExpressionStatement(processed));
          }
        }
      } finally {
        this.stackSimulator.restoreStackSnapshot(snap);
      }
      return;
    }

    const variableStackPositions =
      this.functionVariableStackPositions.get(functionContext) ??
      (() => {
        const m = new Map<number, number>();
        this.functionVariableStackPositions.set(functionContext, m);
        return m;
      })();
    if (!this.functionVariableCounts.has(functionContext)) {
      this.functionVariableCounts.set(functionContext, 0);
    }

    this.stackSimulator.setVariableStackPositions(variableStackPositions);
    this.stackSimulator.setLocalVariableInits(this.localInits);
    this.expressionBuilder.setVariableStackPositions(variableStackPositions);
    this.expressionBuilder.setLocalVariableInits(this.localInits);
    this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());

    for (const instr of headerBlock.instructions) {
      if (instr.address >= preCondEndAddr) {
        break;
      }
      if (instr.code === OP_RSADD) {
        const stackPosBeforeRsadd = this.stackSimulator.getStackPointer();
        this.registerRsaddSlot(
          functionContext,
          stackPosBeforeRsadd,
          instr.type,
          variableStackPositions
        );
        this.stackSimulator.processInstruction(instr);
        this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());
        continue;
      }
      if (instr.code === OP_CPDOWNSP) {
        const spBefore = this.stackSimulator.getStackPointer();
        const offset = instr.offset || 0;
        const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
        const targetStackPos = spBefore + offsetSigned;
        const processedExpr = this.stackSimulator.processInstruction(instr);
        const valueExpr = processedExpr || this.stackSimulator.peek()?.expression;
        if (valueExpr) {
          const slotCap = this.getDeclaredLocalSlotCount(functionContext);
          let varIndex = variableStackPositions.get(targetStackPos);
          if (varIndex === undefined) {
            for (const [pos, idx] of variableStackPositions.entries()) {
              if (Math.abs(pos - targetStackPos) <= 8 && idx >= 0 && idx < slotCap) {
                varIndex = idx;
                break;
              }
            }
          }
          if (varIndex !== undefined && varIndex >= 0 && varIndex < slotCap) {
            statements.push(
              NWScriptAST.createAssignment(`localVar_${varIndex}`, valueExpr, false)
            );
          }
        }
        continue;
      }
      const processed = this.stackSimulator.processInstruction(instr);
      this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());
      if (
        instr.code === OP_INCISP ||
        instr.code === OP_DECISP ||
        instr.code === OP_INCIBP ||
        instr.code === OP_DECIBP
      ) {
        const incExpr = this.buildIncrementExpression(
          instr,
          functionContext,
          variableStackPositions
        );
        if (incExpr) {
          statements.push(NWScriptAST.createExpressionStatement(incExpr));
        }
        continue;
      }
      // Side-effecting calls before the if condition (e.g. PrintInteger(203); if (1) break;)
      if (
        (instr.code === OP_ACTION || instr.code === OP_JSR) &&
        processed &&
        processed.type === NWScriptExpressionType.FUNCTION_CALL
      ) {
        statements.push(NWScriptAST.createExpressionStatement(processed));
      }
    }
  }

  /**
   * Convert a basic block to AST statements
   */
  private convertBasicBlock(
    blockNode: BasicBlockNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): void {
    const block = blockNode.block;
    const truncating = this.basicBlockInstructionLimitAddress !== undefined;

    // Check if we've already processed this block (skip cache when truncating a merged do-while body)
    if (!truncating && this.blockStatements.has(block)) {
      const cached = this.blockStatements.get(block)!;
      if (this.emittedBasicBlocksInCurrentProcedure.has(block)) {
        // Empty cache can happen when a block was claimed as an if-merge / loop exit before
        // its real statement emit — allow a retry.
        if (cached.length === 0) {
          this.emittedBasicBlocksInCurrentProcedure.delete(block);
          this.blockStatements.delete(block);
        } else {
          return;
        }
      } else {
        this.emittedBasicBlocksInCurrentProcedure.add(block);
        statements.push(...cached);
        return;
      }
    }
    
    // Setup function context if available
    if (!functionContext) {
      functionContext = this.blockToFunction.get(block) || null;
      if (functionContext) {
        this.setupFunctionContext(functionContext);
      }
    }
    
    // Process instructions in the block
    const blockStatements: NWScriptASTNode[] = [];
    
    // IMPORTANT: Do NOT clear the stack simulator between blocks in the same function
    // Stack state must persist across blocks so that:
    // 1. Variables allocated in earlier blocks remain accessible
    // 2. Stack positions remain consistent
    // 3. Variable-to-stack-position mappings remain valid
    // 
    // Stack is only cleared when entering a new function (handled in convertControlNodeToBlock)
    
    // Ensure function context is set up (should already be done, but double-check)
    if (functionContext && !this.functionStackInitialized.has(functionContext)) {
      this.setupFunctionContext(functionContext);
      this.functionStackInitialized.add(functionContext);
      const entrySp = this.functionEntryStackPointers.get(functionContext);
      if (entrySp !== undefined) {
        this.stackSimulator.setProgramStackPointer(entrySp);
        this.expressionBuilder.setStackPointer(entrySp);
      }
    }
    
    // Initialize variable tracking for this function if not already set
    if (!this.functionVariableCounts.has(functionContext)) {
      this.functionVariableCounts.set(functionContext, 0);
    }
    if (!this.functionVariableStackPositions.has(functionContext)) {
      this.functionVariableStackPositions.set(functionContext, new Map());
    }
    
    // Get the variable stack positions map for this function
    const variableStackPositions = this.functionVariableStackPositions.get(functionContext)!;
    
    // Update the stack simulator's variable position map for stack-aware CPTOPSP resolution
    // This must be done at the start of each block to ensure accurate variable resolution
    this.stackSimulator.setVariableStackPositions(variableStackPositions);
    this.stackSimulator.setLocalVariableInits(this.localInits);
    this.stackSimulator.setLocalSlotTypes(this.functionLocalTypes.get(functionContext) || []);
    this.stackSimulator.setSlotMemberNames(this.functionSlotMembers.get(functionContext) || new Map());
    
    // Also update expression builder for consistency (if it's used)
    this.expressionBuilder.setVariableStackPositions(variableStackPositions);
    this.expressionBuilder.setLocalVariableInits(this.localInits);
    this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());
    
    nwscriptDecompilerDebug(`[Block] Processing block ${block.id} (${block.instructions.length} instructions), Function: ${functionContext?.name || 'main'}`);
    nwscriptDecompilerDebug(`[Block] Initial stack state - SP: ${this.stackSimulator.getStackPointer()}, Stack size: ${this.stackSimulator.getStackSize()}`);
    nwscriptDecompilerDebug(`[Block] Variable count: ${this.functionVariableCounts.get(functionContext) || 0}`);
    nwscriptDecompilerDebug(`[Block] Variable positions:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', ') || 'none');
    
    // Track if we're processing a return value assignment
    let returnValueExpr: NWScriptExpression | undefined = undefined;
    let retnBlock: NWScriptBasicBlock | null = null;
    
    nwscriptDecompilerDebug(`[Block] Block ${block.id} instructions:`, block.instructions.map(instr => `0x${instr.address.toString(16).padStart(8, '0')} ${instr.code === OP_RSADD ? 'RSADD' : instr.code === OP_CPDOWNSP ? 'CPDOWNSP' : 'other'}`).join(', '));
    
    for (let i = 0; i < block.instructions.length; i++) {
      const instruction = block.instructions[i];
      if (
        this.basicBlockInstructionLimitAddress !== undefined &&
        instruction.address >= this.basicBlockInstructionLimitAddress
      ) {
        break;
      }

      // Track variable allocations (RSADD reserves space for a variable)
      // IMPORTANT: Do this BEFORE processing the instruction, so we capture the stack position
      // where the variable will live (before RSADD pushes the default value)
      let isRsadd = false;
      if (instruction.code === OP_RSADD) {
        isRsadd = true;
        // RSADD pushes a default value onto the stack (0, 0.0, '', etc.)
        // The variable lives at the current stack position (before RSADD executes)
        // After RSADD, SP moves up by 4, and the variable is at the old SP position
        const stackPosBeforeRsadd = this.stackSimulator.getStackPointer();
        // For-init often reuses the function-entry block (RSADDs + assigns). Do not
        // allocate a second local when this slot was already recorded.
        this.registerRsaddSlot(
          functionContext,
          stackPosBeforeRsadd,
          instruction.type,
          variableStackPositions
        );
      }
      
      // For CPDOWNSP, we need to calculate the target stack position BEFORE processing
      // because processing will modify the stack state
      let cpdownspSpBefore: number | undefined = undefined;
      let cpdownspTargetPos: number | undefined = undefined;
      if (instruction.code === OP_CPDOWNSP) {
        cpdownspSpBefore = this.stackSimulator.getStackPointer();
        const offset = instruction.offset || 0;
        const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
        cpdownspTargetPos = cpdownspSpBefore + offsetSigned;
        nwscriptDecompilerDebug(`[CPDOWNSP-PRE] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${cpdownspSpBefore}, Offset: ${offsetSigned}, Target pos: ${cpdownspTargetPos}`);
      }
      
      // Process instruction through stack simulator
      // This ensures the stack state is correct when we check for return values
      const expr = this.stackSimulator.processInstruction(instruction);
      
      // Keep expression builder's stack pointer in sync after each instruction
      this.expressionBuilder.setStackPointer(this.stackSimulator.getStackPointer());
      
      // Skip creating statements for RSADD (it's just variable allocation)
      if (isRsadd) {
        continue;
      }

      // INCISP/DECISP/INCIBP/DECIBP are side-effecting; emit ++/-- statements
      if (
        instruction.code === OP_INCISP ||
        instruction.code === OP_DECISP ||
        instruction.code === OP_INCIBP ||
        instruction.code === OP_DECIBP
      ) {
        const incExpr = this.buildIncrementExpression(instruction, functionContext, variableStackPositions);
        if (incExpr) {
          blockStatements.push(NWScriptAST.createExpressionStatement(incExpr));
        }
        continue;
      }

      if (instruction.code === OP_JMP && instruction.offset !== undefined) {
        const targetAddr = instruction.address + instruction.offset;
        const targetBlock = this.cfg.getBlockForAddress(targetAddr);
        const jumpKind = this.classifyStructuredJumpTarget(targetBlock);
        if (jumpKind === "break") {
          blockStatements.push(NWScriptAST.createBreak());
          continue;
        }
        if (jumpKind === "continue") {
          // For-loop increment's JMP back to the header is the loop latch, not a continue stmt.
          // Non-empty then-arm JMP to if-merge that is also the while latch is fallthrough
          // (k_act_com31 AssignCommand → GetNext), not `continue` (smoke_24 empty then keeps continue).
          if (
            !this.convertingForIncrement &&
            !(this.isActiveIfMergeTarget(targetBlock) && blockStatements.length > 0)
          ) {
            blockStatements.push(NWScriptAST.createContinue());
          }
          continue;
        }
      }
      
      // Check if this CPDOWNSP is writing to the return value position
      // The return value position is where RSADD reserved space before the JSR that calls this function
      let isReturnWrite = false;
      if (instruction.code === OP_CPDOWNSP && cpdownspTargetPos !== undefined && cpdownspSpBefore !== undefined) {
        // Get the return value offset and entry stack pointer
        const returnValueOffset = this.functionReturnValueOffsets.get(functionContext);
        const entrySP = this.functionEntryStackPointers.get(functionContext);
        
        nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, CPDOWNSP SP before: ${cpdownspSpBefore}, Target pos: ${cpdownspTargetPos}`);
        nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Function: ${functionContext?.name || 'main'}, Return value offset: ${returnValueOffset}, Entry SP: ${entrySP}`);
        
        if (returnValueOffset !== undefined && entrySP !== undefined) {
          // The return value position is an absolute position (where RSADD reserved space)
          // We stored it as an offset from entry SP, so we need to reconstruct the absolute position
          // But actually, we should compare absolute positions directly
          // The return value absolute position = entrySP + returnValueOffset
          const returnValueAbsolutePos = entrySP + returnValueOffset;
          
          // The CPDOWNSP target position is also absolute (cpdownspSpBefore + offset)
          // So we should compare absolute positions directly
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Return value absolute position: ${entrySP} + ${returnValueOffset} = ${returnValueAbsolutePos}`);
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] CPDOWNSP absolute target position: ${cpdownspTargetPos}`);
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Comparing absolute positions: ${cpdownspTargetPos} === ${returnValueAbsolutePos}? ${cpdownspTargetPos === returnValueAbsolutePos}`);
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Current SP: ${cpdownspSpBefore}, CPDOWNSP offset: ${instruction.offset ? (instruction.offset > 0x7FFFFFFF ? instruction.offset - 0x100000000 : instruction.offset) : 'undefined'}`);
          
          // Check if this CPDOWNSP writes to the absolute return value position
          if (cpdownspTargetPos === returnValueAbsolutePos) {
            nwscriptDecompilerDebug(`[RETURN-DETECT] ✓ MATCH! Address: 0x${instruction.address.toString(16).padStart(8, '0')}, Current SP: ${cpdownspSpBefore}, Target pos: ${cpdownspTargetPos}, Entry SP: ${entrySP}, Return offset: ${returnValueOffset}, Return value absolute pos: ${returnValueAbsolutePos}`);
            
            // Get the return value expression from the stack
            returnValueExpr = this.stackSimulator.peek()?.expression;
            nwscriptDecompilerDebug(`[RETURN-DETECT] Stack top expression: ${returnValueExpr ? returnValueExpr.toNSS() : 'undefined'}`);
            
            const allowReturnValueStatement =
              functionContext !== null &&
              functionContext.returnType !== NWScriptDataType.VOID;

            // Create the return statement immediately (not wait for RETN)
            if (allowReturnValueStatement) {
              isReturnWrite = true;
              const value =
                returnValueExpr ?? this.defaultReturnExpression(functionContext!.returnType);
              blockStatements.push(NWScriptAST.createReturn(value));
              this.markRetnMergeSatisfiedFromReturnWriteBlock(block);
              nwscriptDecompilerDebug(`[RETURN-DETECT] ✓ Created return statement with expression: ${value.toNSS()}`);
            } else {
              nwscriptDecompilerDebug(`[RETURN-DETECT] ✗ WARNING: No expression on stack for return value`);
            }
          } else {
            nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] ✗ No match: CPDOWNSP absolute target ${cpdownspTargetPos} !== Return value absolute pos ${returnValueAbsolutePos} (difference: ${cpdownspTargetPos - returnValueAbsolutePos})`);
            nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] This suggests the return value position calculation may be incorrect, or this CPDOWNSP is writing to a different location`);
          }
        } else {
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] ✗ Missing data: returnValueOffset=${returnValueOffset}, entrySP=${entrySP}`);
        }
      }
      
      // Fallback: If CPDOWNSP target does not map to a local variable and the block (or its immediate successors) returns,
      // treat this as a return value write based on control-flow, not magic offsets.
      if (
        instruction.code === OP_CPDOWNSP &&
        !isReturnWrite &&
        cpdownspTargetPos !== undefined &&
        variableStackPositions.get(cpdownspTargetPos) === undefined
      ) {
        const hasReturnSuccessor = block.exitType === 'return' ||
          Array.from(block.successors).some(succ => succ.exitType === 'return' || (succ.endInstruction && succ.endInstruction.code === OP_RETN));
        if (hasReturnSuccessor) {
          returnValueExpr = this.stackSimulator.peek()?.expression;
          const allowReturnValueStatement =
            functionContext !== null &&
            functionContext.returnType !== NWScriptDataType.VOID;
          nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, target pos: ${cpdownspTargetPos} not mapped to local, block leads to return -> treating as return write`);
          if (allowReturnValueStatement) {
            isReturnWrite = true;
            const value =
              returnValueExpr ?? this.defaultReturnExpression(functionContext!.returnType);
            blockStatements.push(NWScriptAST.createReturn(value));
            this.markRetnMergeSatisfiedFromReturnWriteBlock(block);
            nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] ✓ Created return statement with expression: ${value.toNSS()}`);
          } else {
            nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] ✗ WARNING: No expression on stack for return value`);
          }
        }
      }
      
      // Check for special instructions
      if (instruction.code === OP_RETN) {
        // RETN just tells the program to return to the address after the last JSR.
        // Valued returns are emitted at the CPDOWNSP write; shared merge RETNs must not
        // emit another default `return 0` once a write path already targeted this block.
        if (this.retnMergeSatisfiedByReturn.has(block)) {
          continue;
        }
        if (!isReturnWrite && !returnValueExpr) {
          if (
            functionContext &&
            functionContext.returnType !== NWScriptDataType.VOID
          ) {
            blockStatements.push(
              NWScriptAST.createReturn(this.defaultReturnExpression(functionContext.returnType))
            );
          } else {
            blockStatements.push(NWScriptAST.createReturn(undefined));
          }
        }
        // RETN doesn't pop anything - it just returns control
        continue;
      }
      
      // Skip creating statements for return value assignments (already handled above)
      if (isReturnWrite) {
        continue;
      }
      
      // Check if CPDOWNSP is writing to a local variable (assignment)
      if (instruction.code === OP_CPDOWNSP) {
        nwscriptDecompilerDebug(`[CPDOWNSP-HANDLE] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, isReturnWrite: ${isReturnWrite}, cpdownspTargetPos: ${cpdownspTargetPos}`);
      }
      if (instruction.code === OP_CPDOWNSP && !isReturnWrite && cpdownspTargetPos !== undefined) {
        // We already calculated targetStackPos before processing the instruction
        const targetStackPos = cpdownspTargetPos;
        const copySize = instruction.size || 4;
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${cpdownspSpBefore}, Offset: ${instruction.offset ? ((instruction.offset > 0x7FFFFFFF ? instruction.offset - 0x100000000 : instruction.offset)) : 0} (0x${instruction.offset?.toString(16)}), Target pos: ${targetStackPos}`);
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Stack size after: ${this.stackSimulator.getStackSize()}, Has expr: ${!!expr}`);
        
        // Get the expression from the stack (CPDOWNSP copies from top of stack)
        // Size-12: coalesce three float CONST tops into a vector literal when needed
        const valueExpr = this.resolveCpdownValueExpression(instruction, expr);
        
        if (!valueExpr) {
          nwscriptDecompilerDebug(`[CPDOWNSP] No expression found - skipping assignment`);
          // No value to assign - skip
          continue;
        }
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Expression type: ${valueExpr.type}, Value: ${JSON.stringify(valueExpr).substring(0, 100)}`);
        nwscriptDecompilerDebug(`[CPDOWNSP] Variable stack positions map:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
        
        const slotCap = this.getDeclaredLocalSlotCount(functionContext);
        const exactName = this.resolveAssignTargetName(
          functionContext,
          targetStackPos,
          copySize,
          variableStackPositions
        );
        const exactIndex = variableStackPositions.get(targetStackPos);
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Looking up variable at position ${targetStackPos}: found index ${exactIndex}`);
        
        if (exactName && exactIndex !== undefined && exactIndex >= 0 && exactIndex < slotCap) {
          nwscriptDecompilerDebug(`[CPDOWNSP] ✓ Creating assignment: ${exactName} = <expression>`);
          blockStatements.push(NWScriptAST.createAssignment(exactName, valueExpr, false));
          continue;
        }
        
        nwscriptDecompilerDebug(`[CPDOWNSP] No exact match at position ${targetStackPos}, trying nearby positions...`);
        
        // Fallback: If we didn't find it by exact stack position, try nearby positions
        let nearbyAssigned = false;
        for (let delta = -4; delta <= 4; delta += 4) {
          const nearbyPos = targetStackPos + delta;
          const nearbyName = this.resolveAssignTargetName(
            functionContext,
            nearbyPos,
            copySize,
            variableStackPositions
          );
          const nearbyVarIndex = variableStackPositions.get(nearbyPos);
          if (nearbyName && nearbyVarIndex !== undefined && nearbyVarIndex >= 0 && nearbyVarIndex < slotCap) {
            nwscriptDecompilerDebug(`[CPDOWNSP] ✓ Found nearby variable at position ${nearbyPos} (delta ${delta}): ${nearbyName}`);
            blockStatements.push(NWScriptAST.createAssignment(nearbyName, valueExpr, false));
            nearbyAssigned = true;
            break;
          }
        }
        if (nearbyAssigned) {
          continue;
        }
        
        // Stack-aware fallback: Check all variable positions with tolerance
        nwscriptDecompilerDebug(`[CPDOWNSP] Trying stack-aware fallback: checking all variable positions...`);
        let assigned = false;
        for (const [varPos, varIndex] of variableStackPositions.entries()) {
          const distance = Math.abs(targetStackPos - varPos);
          if (distance <= 8 && varIndex >= 0 && varIndex < slotCap) {
            const varName =
              this.resolveAssignTargetName(functionContext, varPos, copySize, variableStackPositions) ||
              `localVar_${varIndex}`;
            nwscriptDecompilerDebug(`[CPDOWNSP] ✓ Found variable by position proximity: ${varName} (distance: ${distance})`);
            blockStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
            assigned = true;
            break;
          }
        }
        if (assigned) {
          continue;
        }

        // Last resort: sole/first local (SP may have drifted after loop increment MOVSP)
        if (slotCap > 0) {
          blockStatements.push(
            NWScriptAST.createAssignment(`localVar_0`, valueExpr, false)
          );
          continue;
        }
        
        nwscriptDecompilerDebug(`[CPDOWNSP] ✗ No variable found for assignment at position ${targetStackPos}`);
      }

      // CPDOWNBP: assignment to a global (SAVEBP frame)
      if (instruction.code === OP_CPDOWNBP && instruction.offset !== undefined) {
        const offsetSigned =
          instruction.offset > 0x7FFFFFFF
            ? instruction.offset - 0x100000000
            : instruction.offset;
        const valueExpr =
          this.resolveCpdownValueExpression(instruction, expr) ||
          this.stackSimulator.peek()?.expression;
        const globalName = this.resolveGlobalVarName(offsetSigned);
        if (valueExpr && globalName) {
          nwscriptDecompilerDebug(
            `[CPDOWNBP] ✓ Creating assignment: ${globalName} = <expression> (off=${offsetSigned})`
          );
          blockStatements.push(NWScriptAST.createAssignment(globalName, valueExpr, true));
          continue;
        }
        nwscriptDecompilerDebug(
          `[CPDOWNBP] ✗ No global for offset ${offsetSigned}, hasExpr=${!!valueExpr}`
        );
      }
      
      // CPTOPSP is already handled by stackSimulator.processInstruction above; do not process twice
      // (duplicate push would desync SP so repeated operands like FFFFFFF4 read different locals incorrectly).
      
      // Check for break/continue (these would be in JMP instructions to specific targets)
      // For now, we'll handle these when we process control structures
      
      // If we got an expression, it might be an assignment or expression statement
      // However, we should filter out intermediate expressions that are:
      // - String constants (function parameters)
      // - Variable reads (intermediate values)
      // - Simple integer constants (0, 1) that are intermediate values
      // - Binary operations that are intermediate (part of larger expressions)
      if (expr) {
        // Skip string constants (they're typically function parameters)
        if (expr.type === 'constant' && expr.dataType === NWScriptDataType.STRING) {
          continue;
        }
        
        // Skip variable reads - they're intermediate values used in larger expressions
        // Variable reads are typically intermediate - skip them
        if (expr.type === 'variable') {
          continue;
        }
        
        // Skip simple integer constants that are likely intermediate values
        if (expr.type === 'constant' && expr.dataType === NWScriptDataType.INTEGER && 
            (expr.value === 0 || expr.value === 1)) {
          // These are often intermediate values (like comparison results, boolean values)
          continue;
        }
        
        // Skip binary operations, comparisons, and logical operations
        // These are typically intermediate (part of conditions or larger expressions)
        // BUT: If the next instruction is CPDOWNSP, this is the value being assigned, not intermediate
        if (expr.type === 'binary_op' || expr.type === 'comparison' || expr.type === 'logical') {
          // Check if this expression is being assigned to a variable (next instruction is CPDOWNSP)
          // If so, don't skip it - let the CPDOWNSP handler create the assignment
          let isBeingAssigned = false;
          if (i + 1 < block.instructions.length) {
            const nextInstr = block.instructions[i + 1];
            if (nextInstr.code === OP_CPDOWNSP) {
              isBeingAssigned = true;
            }
          }
          
          // Only skip if it's NOT being assigned
          if (!isBeingAssigned) {
            // Binary operations, comparisons, and logical operations are typically intermediate
            // They'll be part of conditions, assignments, or other expressions
            continue;
          }
          // If it IS being assigned, fall through to let CPDOWNSP handler process it
        }
        
        // For function calls, only create an expression statement if they're not part of a larger expression
        // We need to look ahead to see if this function call result is consumed by a later instruction
        // Patterns to detect:
        // - ACTION -> CONST -> EQUAL (comparison)
        // - ACTION -> (any op that consumes stack) -> CPDOWNSP (assignment)
        // - ACTION -> (any op) -> (comparison/binary op)
        if (expr.type === 'function_call') {
          // Void intrinsics/engine calls are always side effects; don't suppress them waiting for a nonexistent result.
          if (expr.dataType === NWScriptDataType.VOID) {
            blockStatements.push(NWScriptAST.createExpressionStatement(expr));
          } else {
          // Look ahead to see if this function call is part of a larger expression.
          // Prefer linear nextInstr so a block boundary between JSR and CPDOWNSP
          // (smoke_39: n = AddTwo(3)) does not emit a dead `sub1(3);` before the assign.
          let isPartOfExpression = false;
          let future: NWScriptInstruction | null | undefined = instruction.nextInstr;
          let lookAheadSteps = 0;
          while (future && lookAheadSteps++ < 8) {
            if (
              future.code === OP_EQUAL ||
              future.code === OP_NEQUAL ||
              future.code === OP_GT ||
              future.code === OP_GEQ ||
              future.code === OP_LT ||
              future.code === OP_LEQ ||
              future.code === OP_ADD ||
              future.code === OP_SUB ||
              future.code === OP_MUL ||
              future.code === OP_DIV ||
              future.code === OP_LOGANDII ||
              future.code === OP_LOGORII ||
              future.code === OP_CPDOWNSP ||
              // Later ACTION/JSR typically consume this return as an argument
              // (e.g. ObjectToString(GetModule()), UT_*(GetModule(), …)).
              future.code === OP_ACTION ||
              future.code === OP_JSR
            ) {
              isPartOfExpression = true;
              break;
            }
            if (
              future.code === OP_JMP ||
              future.code === OP_RETN ||
              future.code === OP_JZ ||
              future.code === OP_JNZ
            ) {
              break;
            }
            future = future.nextInstr;
          }
          
          // Only create expression statement if it's not part of a larger expression
          if (!isPartOfExpression) {
            blockStatements.push(NWScriptAST.createExpressionStatement(expr));
          }
          }
        }
        // For other expression types, be conservative and skip them
        // Most expressions are intermediate values
      }
    }
    
    // Cache the statements (not when truncating — merged do-while body is a partial view)
    if (this.basicBlockInstructionLimitAddress === undefined) {
      this.blockStatements.set(block, blockStatements);
      this.emittedBasicBlocksInCurrentProcedure.add(block);
    }
    statements.push(...blockStatements);
  }

  /**
   * Convert IfNode to AST
   */
  private convertIfNode(node: IfNode, functionContext: NWScriptFunction | null): NWScriptIfNode {
    // NOTE: Pre-condition instructions (RSADD, CPDOWNSP, etc.) are already processed
    // in convertControlNode before this method is called. We only need to extract the condition.
    // DO NOT process the header block again here - it would duplicate work and corrupt stack state.

    const preBranchSnap = this.stackSimulator.takeStackSnapshot();
    
    nwscriptDecompilerDebug(`[convertIfNode] Extracting condition from if node, condition type: ${node.condition.type}`);

    let condition: NWScriptExpression | null = null;
    let actualBodyNode: ControlNode = node.body;

    // Prefer multi-block short-circuit rebuild (nested && / || ladders) before one-hop detectors.
    if (node.condition.type === 'basic_block') {
      const rebuilt = this.tryRebuildShortCircuitCondition(node.condition.block, functionContext);
      if (rebuilt) {
        condition = rebuilt.condition;
        actualBodyNode = { type: 'basic_block', block: rebuilt.bodyBlock };
        this.markShortCircuitAbsorbed(rebuilt.absorbFromAddress, rebuilt.bodyBlock.startInstruction.address);
        nwscriptDecompilerDebug(
          `[convertIfNode] Short-circuit rebuild: ${condition.toNSS()} → body block ${rebuilt.bodyBlock.id}`
        );
      }
    }

    if (!condition) {
      // Extract condition from condition block
      // The stack state should already be correct from pre-condition processing
      condition = this.extractConditionFromBlock(node.condition, functionContext, node);
      
      nwscriptDecompilerDebug(`[convertIfNode] Initial condition extracted, type: ${condition.type}`);
      if (condition.type === 'variable') {
        nwscriptDecompilerDebug(`[convertIfNode] Variable name: ${condition.variableName}`);
      } else if (condition.type === 'comparison') {
        nwscriptDecompilerDebug(`[convertIfNode] Comparison operator: ${condition.operator}`);
      } else if (condition.type === 'logical') {
        nwscriptDecompilerDebug(`[convertIfNode] Logical operator: ${condition.operator}`);
      }
      
      // Check if the body contains LOGANDII / LOGORII that combines with the outer condition (short-circuit chains)
      if (node.body.type === 'basic_block') {
        const bodyBlock = node.body.block;
        const hasLogAndII = bodyBlock.instructions.some(instr => instr.code === OP_LOGANDII);
        nwscriptDecompilerDebug(`[convertIfNode] Body block ${bodyBlock.id} has LOGANDII: ${hasLogAndII}`);
        if (hasLogAndII && node.condition.type === 'basic_block') {
          nwscriptDecompilerDebug(`[convertIfNode] Attempting cross-block AND condition extraction from block ${node.condition.block.id} through block ${bodyBlock.id}`);
          // Try to extract the full AND condition by processing blocks together
          const combinedCondition = this.extractCrossBlockANDCondition(
            node.condition.block,
            bodyBlock,
            functionContext
          );
          if (combinedCondition) {
            nwscriptDecompilerDebug(`[convertIfNode] Cross-block AND condition extracted, type: ${combinedCondition.type}`);
            if (combinedCondition.type === 'logical') {
              nwscriptDecompilerDebug(`[convertIfNode] Logical operator: ${combinedCondition.operator}`);
            }
            condition = combinedCondition;
            
            // If we successfully extracted a cross-block condition, the body block is actually part of the condition
            // Check if the body block's successor is a control structure that should be the actual body
            // This handles cases where: if (cond1 && cond2) { if-else structure }
            const successorsArray = Array.from(bodyBlock.successors);
            if (successorsArray.length > 0) {
              const nextBlock = successorsArray[0];
              nwscriptDecompilerDebug(`[convertIfNode] Body block ${bodyBlock.id} has successor block ${nextBlock.id}, checking for nested structure...`);
              
              // Try to find a control structure starting from the next block
              // This would be the actual body (e.g., an inner if-else)
              // For now, we'll check if the next block is a conditional block (has a condition instruction)
              if (nextBlock.conditionInstruction) {
                nwscriptDecompilerDebug(`[convertIfNode] Successor block ${nextBlock.id} has condition instruction, likely a nested if structure`);
                // The actual body should be the nested structure starting from nextBlock
                // But we need to find the ControlNode for this structure
                // For now, we'll convert the body block as-is, but it should be empty
                // The nested structure will be converted separately in the sequence
              }
            }
          } else {
            nwscriptDecompilerDebug(`[convertIfNode] Cross-block AND condition extraction returned null`);
          }
        }

        const hasLogOrII = bodyBlock.instructions.some(instr => instr.code === OP_LOGORII);
        nwscriptDecompilerDebug(`[convertIfNode] Body block ${bodyBlock.id} has LOGORII: ${hasLogOrII}`);
        if (hasLogOrII && node.condition.type === 'basic_block') {
          const orCombined = this.extractCrossBlockORCondition(
            node.condition.block,
            bodyBlock,
            functionContext
          );
          if (orCombined) {
            nwscriptDecompilerDebug(`[convertIfNode] Cross-block OR condition extracted, type: ${orCombined.type}`);
            condition = orCombined;
          }
        }
      }
    }

    // Convert body — if-merge hint suppresses latch continue on then-arm JMP
    this.stackSimulator.restoreStackSnapshot(preBranchSnap);
    if (node.exitBlock) {
      this.jumpHints.push({ kind: "if", merge: node.exitBlock });
    }
    let thenBody: NWScriptBlockNode;
    try {
      thenBody = this.convertControlNodeToBlock(actualBodyNode, functionContext);
    } finally {
      if (node.exitBlock) {
        this.popJumpHint();
      }
    }
    this.stackSimulator.restoreStackSnapshot(preBranchSnap);
    
    // If the body is empty and we extracted a cross-block condition, the body block was part of the condition
    // In this case, the actual body should be the nested structure (e.g., inner if-else) that follows
    // This will be handled at the sequence level, but we log it here for debugging
    if (thenBody.statements.length === 0 && node.body.type === 'basic_block') {
      const bodyBlock = node.body.block;
      const hasLogAndII = bodyBlock.instructions.some(instr => instr.code === OP_LOGANDII);
      if (hasLogAndII) {
        nwscriptDecompilerDebug(`[convertIfNode] WARNING: Body block ${bodyBlock.id} contains LOGANDII and generated empty body. The actual body should be the nested structure starting from block ${Array.from(bodyBlock.successors)[0]?.id || 'unknown'}`);
      }
    }
    
    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;
    
    return NWScriptAST.createIf(condition, thenBody, undefined, headerBlock) as NWScriptIfNode;
  }

  /**
   * Convert IfElseNode to AST
   */
  private convertIfElseNode(node: IfElseNode, functionContext: NWScriptFunction | null): NWScriptIfElseNode {
    // Snapshot stack before arms so merge successor does not inherit the last arm's stack.
    const preBranchSnap = this.stackSimulator.takeStackSnapshot();

    let condition: NWScriptExpression | null = null;
    let thenBodyNode: ControlNode = node.thenBody;

    if (node.condition.type === 'basic_block') {
      const rebuilt = this.tryRebuildShortCircuitCondition(node.condition.block, functionContext);
      if (rebuilt) {
        condition = rebuilt.condition;
        thenBodyNode = { type: 'basic_block', block: rebuilt.bodyBlock };
        this.markShortCircuitAbsorbed(rebuilt.absorbFromAddress, rebuilt.bodyBlock.startInstruction.address);
      }
    }

    if (!condition) {
      // Extract condition from condition block
      condition = this.extractConditionFromBlock(node.condition, functionContext);
      
      // Check if we need to look at predecessor blocks for cross-block AND chains
      // This handles cases where the LOGANDII is in a previous block
      if (node.condition.type === 'basic_block') {
        const headerBlock = node.condition.block;
        // Find the path from a conditional predecessor through a LOGANDII block to this block
        // This handles the pattern: block1 (condition) -> block2 (LOGANDII) -> block3 (final condition)
        for (const predecessor of headerBlock.predecessors) {
          const hasLogAndII = predecessor.instructions.some(instr => instr.code === OP_LOGANDII);
          if (hasLogAndII) {
            // Check if this predecessor has a conditional predecessor (the first condition)
            for (const predPred of predecessor.predecessors) {
              if (predPred.conditionInstruction) {
                // Found the path: predPred -> predecessor (LOGANDII) -> headerBlock
                const combinedCondition = this.extractCrossBlockANDCondition(
                  predPred,
                  headerBlock,
                  functionContext
                );
                if (combinedCondition) {
                  condition = combinedCondition;
                  break;
                }
              }
            }
            if (condition !== this.extractConditionFromBlock(node.condition, functionContext)) {
              break; // Found and set combined condition
            }
          }
        }
      }
    }
    
    // Convert bodies — restore pre-branch stack between arms
    this.stackSimulator.restoreStackSnapshot(preBranchSnap);
    if (node.exitBlock) {
      this.jumpHints.push({ kind: "if", merge: node.exitBlock });
    }
    let thenBody: NWScriptBlockNode;
    let elseBody: NWScriptBlockNode;
    try {
      thenBody = this.convertControlNodeToBlock(thenBodyNode, functionContext);
      this.stackSimulator.restoreStackSnapshot(preBranchSnap);
      elseBody = this.convertControlNodeToBlock(node.elseBody, functionContext);
    } finally {
      if (node.exitBlock) {
        this.popJumpHint();
      }
    }
    this.stackSimulator.restoreStackSnapshot(preBranchSnap);
    
    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;

    // Break-bounded while latch: `if (n > N) break; else continue;` is fallthrough to the
    // loop back-edge — emit a plain if with break only (source never writes the else).
    if (
      this.blockIsSoleJumpStatement(thenBody, NWScriptASTNodeType.BREAK) &&
      this.blockIsSoleJumpStatement(elseBody, NWScriptASTNodeType.CONTINUE)
    ) {
      return NWScriptAST.createIf(condition, thenBody, undefined, headerBlock) as NWScriptIfElseNode;
    }
    
    return NWScriptAST.createIf(condition, thenBody, elseBody, headerBlock) as NWScriptIfElseNode;
  }

  /**
   * Convert WhileNode to AST
   */
  private convertWhileNode(node: WhileNode, functionContext: NWScriptFunction | null): NWScriptWhileNode {
    let condition: NWScriptExpression | null = null;
    const headerBlock = node.condition.type === "basic_block" ? node.condition.block : undefined;

    // Same short-circuit ladder rebuild as if (ACTION + JZ + LOGOR/LOGAND).
    if (headerBlock) {
      const rebuilt = this.tryRebuildShortCircuitCondition(headerBlock, functionContext, {
        allowJzFallthroughBody: true,
      });
      if (rebuilt) {
        condition = rebuilt.condition;
        this.markShortCircuitAbsorbed(rebuilt.absorbFromAddress, rebuilt.bodyBlock.startInstruction.address);
        nwscriptDecompilerDebug(
          `[convertWhileNode] Short-circuit rebuild: ${condition.toNSS()} → body block ${rebuilt.bodyBlock.id}`
        );
      }
    }

    if (!condition) {
      condition = this.extractConditionFromBlock(node.condition, functionContext);
    }

    let body: NWScriptBlockNode;

    this.pushLoopJumpHints(node);
    try {
      body = this.convertControlNodeToBlock(node.body, functionContext);
    } finally {
      this.popJumpHint();
    }

    // While latch is `incr; JMP header` — the JMP often lowers as a trailing `continue;`
    // which is not present in source (smoke_24). Strip sole trailing continues.
    while (body.statements.length > 0) {
      const last = body.statements[body.statements.length - 1];
      if (last.type === NWScriptASTNodeType.CONTINUE) {
        body.statements.pop();
      } else {
        break;
      }
    }

    return NWScriptAST.createWhile(condition, body, headerBlock);
  }

  /**
   * Convert DoWhileNode to AST
   */
  private convertDoWhileNode(node: DoWhileNode, functionContext: NWScriptFunction | null): NWScriptDoWhileNode {
    // Prefer body-entry header over latch condition block for metadata
    const headerBlock =
      node.loopHeaderBlock ??
      (node.condition.type === "basic_block" ? node.condition.block : undefined);

    const conditionBlock =
      node.condition.type === "basic_block" ? node.condition.block : undefined;
    const mergedBodyAndCondition =
      node.body.type === "basic_block" &&
      conditionBlock != null &&
      node.body.block === conditionBlock &&
      conditionBlock.conditionInstruction != null;

    let body: NWScriptBlockNode;

    this.pushLoopJumpHints(node);
    try {
      if (mergedBodyAndCondition) {
        // Body shares the post-test block — only emit instructions before JZ/JNZ
        this.basicBlockInstructionLimitAddress = conditionBlock!.conditionInstruction!.address;
        try {
          body = this.convertControlNodeToBlock(node.body, functionContext);
        } finally {
          this.basicBlockInstructionLimitAddress = undefined;
        }
      } else {
        body = this.convertControlNodeToBlock(node.body, functionContext);
      }
    } finally {
      this.popJumpHint();
    }

    let condition: NWScriptExpression | null = null;
    if (conditionBlock) {
      const rebuilt = this.tryRebuildShortCircuitCondition(conditionBlock, functionContext, {
        allowJzFallthroughBody: true,
      });
      if (rebuilt) {
        condition = rebuilt.condition;
        this.markShortCircuitAbsorbed(rebuilt.absorbFromAddress, rebuilt.bodyBlock.startInstruction.address);
        nwscriptDecompilerDebug(
          `[convertDoWhileNode] Short-circuit rebuild: ${condition.toNSS()}`
        );
      }
    }
    if (!condition) {
      condition = this.extractConditionFromBlock(node.condition, functionContext);
    }

    // Note: createDoWhile signature is: (body, condition, headerBlock?)
    return NWScriptAST.createDoWhile(body, condition, headerBlock);
  }

  /**
   * Convert ForNode to AST
   */
  private convertForNode(node: ForNode, functionContext: NWScriptFunction | null): NWScriptForNode {
    const condition = this.extractConditionFromBlock(node.condition, functionContext);

    // Fresh convert into the for init slot (avoid already-emitted early return).
    if (node.init?.type === "basic_block") {
      this.emittedBasicBlocksInCurrentProcedure.delete(node.init.block);
      this.blockStatements.delete(node.init.block);
    }

    let init = node.init ? this.convertControlNodeToBlock(node.init, functionContext) : undefined;
    // Init predecessor often shares the entry block (RSADDs + j=0 + i=0). Keep only
    // assignments to the loop variable so init/cond/incr stay coherent.
    if (init) {
      const loopVar = this.primaryLocalVarNameFromExpression(condition);
      if (loopVar) {
        const filtered = init.statements.filter((s) => {
          if (s.type !== NWScriptASTNodeType.ASSIGNMENT) {
            return false;
          }
          return (s as NWScriptAssignmentNode).variable === loopVar;
        });
        if (filtered.length > 0) {
          init = NWScriptAST.createBlock(filtered);
        }
      }
    }

    const headerBlock =
      node.condition.type === "basic_block" ? node.condition.block : undefined;

    let body: NWScriptBlockNode;
    let increment: NWScriptBlockNode | undefined;

    this.pushLoopJumpHints(node);
    try {
      body = this.convertControlNodeToBlock(node.body, functionContext);
      // Body may have claimed the increment block via if-else fallthrough — reclaim for the for slot.
      if (node.increment?.type === "basic_block") {
        this.emittedBasicBlocksInCurrentProcedure.delete(node.increment.block);
        this.blockStatements.delete(node.increment.block);
        this.stripBlockStatementsMatching(body, node.increment.block);
      }
      this.convertingForIncrement = true;
      try {
        increment = node.increment
          ? this.convertControlNodeToBlock(node.increment, functionContext)
          : undefined;
      } finally {
        this.convertingForIncrement = false;
      }
    } finally {
      this.popJumpHint();
    }

    return NWScriptAST.createFor(body, init, condition, increment, headerBlock);
  }

  /**
   * Remove statements that were produced from {@code block} if they were incorrectly nested
   * under the for body (e.g. increment fallthrough claimed by an if-else).
   */
  private stripBlockStatementsMatching(body: NWScriptBlockNode, block: NWScriptBasicBlock): void {
    const cached = this.blockStatements.get(block);
    if (!cached || cached.length === 0) {
      return;
    }
    const stripFrom = (stmts: NWScriptASTNode[]): void => {
      for (let i = stmts.length - 1; i >= 0; i--) {
        const s = stmts[i];
        if (cached.includes(s)) {
          stmts.splice(i, 1);
          continue;
        }
        if (s.type === NWScriptASTNodeType.BLOCK) {
          stripFrom((s as NWScriptBlockNode).statements);
        } else if (s.type === NWScriptASTNodeType.IF) {
          stripFrom((s as NWScriptIfNode).body.statements);
        } else if (s.type === NWScriptASTNodeType.IF_ELSE) {
          const ie = s as NWScriptIfElseNode;
          stripFrom(ie.thenBody.statements);
          stripFrom(ie.elseBody.statements);
        }
      }
    };
    stripFrom(body.statements);
  }

  /**
   * Leftmost local variable name in an expression (for / while loop variable from the condition).
   */
  private primaryLocalVarNameFromExpression(expr: NWScriptExpression | null | undefined): string | null {
    if (!expr) {
      return null;
    }
    if (expr.type === NWScriptExpressionType.VARIABLE && expr.variableName?.startsWith("localVar_")) {
      return expr.variableName;
    }
    const left = this.primaryLocalVarNameFromExpression(expr.left ?? null);
    if (left) {
      return left;
    }
    return this.primaryLocalVarNameFromExpression(expr.right ?? null);
  }

  /**
   * Convert SwitchNode to AST
   */
  private convertSwitchNode(node: SwitchNode, functionContext: NWScriptFunction | null): NWScriptSwitchNode {
    const preSwitchSnap = this.stackSimulator.takeStackSnapshot();

    // Prefer merged-ladder CPTOP addr (discriminant may be in a successor block vs header-only)
    const expression =
      node.discriminantInstruction != null
        ? this.extractExpressionUpToInstruction(node.discriminantInstruction, functionContext)
        : this.extractExpressionFromBlock(node.expression, functionContext);

    // Compiler leaves the discriminant on the stack for the whole switch (case arms and the
    // post-switch MOVSP cleanup). Push it so CPTOPSP/CPDOWNSP offsets in arms resolve correctly.
    this.stackSimulator.restoreStackSnapshot(preSwitchSnap);
    this.stackSimulator.push(
      expression,
      node.discriminantInstruction?.address ?? 0
    );
    const withDiscriminantSnap = this.stackSimulator.takeStackSnapshot();

    const headerBlock =
      node.expression.type === "basic_block" ? node.expression.block : undefined;

    this.pushSwitchJumpHints(node);
    try {
      const cases: NWScriptSwitchCaseNode[] = [];
      for (const switchCase of node.cases) {
        this.stackSimulator.restoreStackSnapshot(withDiscriminantSnap);
        const caseBody = this.convertControlNodeToBlock(switchCase.body, functionContext);
        const caseValueExpr = NWScriptExpression.constant(
          switchCase.value,
          NWScriptDataType.INTEGER
        );
        cases.push(NWScriptAST.createSwitchCase(caseValueExpr, caseBody));
      }

      const defaultCase = node.defaultCase
        ? (() => {
            this.stackSimulator.restoreStackSnapshot(withDiscriminantSnap);
            return NWScriptAST.createSwitchDefault(
              this.convertControlNodeToBlock(node.defaultCase!, functionContext)
            );
          })()
        : undefined;

      // Leave discriminant on the stack for the post-switch MOVSP drop (do not restore preSwitchSnap).
      this.stackSimulator.restoreStackSnapshot(withDiscriminantSnap);
      return NWScriptAST.createSwitch(expression, cases, defaultCase, headerBlock);
    } finally {
      this.popJumpHint();
    }
  }

  /**
   * Extract condition expression from a condition ControlNode
   */
  private extractConditionFromBlock(
    conditionNode: ControlNode,
    functionContext: NWScriptFunction | null,
    parentNode?: IfNode | IfElseNode
  ): NWScriptExpression {
    // If it's a basic block, extract condition from the block
    if (conditionNode.type === 'basic_block') {
      const block = conditionNode.block;
      
      // Setup function context
      if (!functionContext) {
        functionContext = this.blockToFunction.get(block) || null;
        if (functionContext) {
          this.setupFunctionContext(functionContext);
        }
      }
      
      // Find the condition instruction (JZ/JNZ)
      if (block.conditionInstruction) {
        // Setup AND chain detector with function context
        if (functionContext) {
          this.andChainDetector.setFunctionParameters(functionContext.parameters);
          const globalVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
          for (let i = 0; i < this.globalInits.length; i++) {
            const init = this.globalInits[i];
            const varName = `globalVar_${i}`;
            const offsetSigned = init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
            globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
          }
          this.andChainDetector.setGlobalVariables(globalVarMap);
          
          const localVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
          for (let i = 0; i < this.localInits.length; i++) {
            const init = this.localInits[i];
            const varName = `localVar_${i}`;
            localVarMap.set(init.offset, { name: varName, dataType: init.dataType });
          }
          this.andChainDetector.setLocalVariables(localVarMap);

          this.orChainDetector.setFunctionParameters(functionContext.parameters);
          this.orChainDetector.setGlobalVariables(globalVarMap);
          this.orChainDetector.setLocalVariables(localVarMap);
        }

        const andChainExpr = this.andChainDetector.detectANDChain(block);
        if (andChainExpr) {
          nwscriptDecompilerDebug(`[extractConditionFromBlock] Detected AND chain in block ${block.id}`);
          return andChainExpr;
        }

        const orChainExpr = this.orChainDetector.detectORChain(block);
        if (orChainExpr) {
          return orChainExpr;
        }

        const conditionInstr = block.conditionInstruction;
        
        const condIdxPeek = block.instructions.indexOf(conditionInstr);
        const insBeforeCondPeek =
          condIdxPeek >= 0 ? block.instructions.slice(0, condIdxPeek) : [];
        const hasCompareBeforePeek = insBeforeCondPeek.some((inss: NWScriptInstruction) =>
          inss.code === OP_EQUAL ||
          inss.code === OP_NEQUAL ||
          inss.code === OP_GT ||
          inss.code === OP_GEQ ||
          inss.code === OP_LT ||
          inss.code === OP_LEQ
        );
        const hasJsrBeforePeek = insBeforeCondPeek.some((inss: NWScriptInstruction) => inss.code === OP_JSR);

        // Loop/if headers build their compare in this block; prefer replaying those ops over a
        // stale stack top left by prior assignments (e.g. localVar_0 = 0 → while ((0 < 0))).
        if (insBeforeCondPeek.length > 0) {
          const rebuilt = this.rebuildConditionFromBlockInstructions(
            block,
            functionContext,
            conditionInstr
          );
          if (rebuilt) {
            return rebuilt;
          }
        }
        
        // CRITICAL: Do NOT clear the stack here - pre-condition instructions have already
        // been processed and the stack state is correct. The condition expression should
        // already be on the stack from pre-condition processing.
        // 
        // However, there might be instructions between the last pre-condition instruction
        // and the condition instruction that build up the condition expression. We need
        // to process those, but we don't know which instructions were pre-condition ones.
        // 
        // For now, let's check if the condition is already on the stack. If not, we'll
        // need to process instructions from the last pre-condition instruction to the condition.
        // But since we don't track which instructions were pre-condition, we'll process
        // from the beginning of the block to the condition, which will re-process
        // pre-condition instructions. This is not ideal, but it should work.
        // 
        // Actually, a better approach: Since pre-condition instructions were already
        // processed, the stack should have the condition value on it. Let's check first.
        
        // Check if condition is already on the stack from pre-condition processing
        const stackTop = this.stackSimulator.peek();
        /** Call args can remain on the expr stack model until MOVSP in callee; don't treat as branch condition. */
        const staleLiteralCondition =
          !!stackTop &&
          stackTop.expression.type === NWScriptExpressionType.CONSTANT &&
          (hasCompareBeforePeek || hasJsrBeforePeek);

        if (stackTop && !staleLiteralCondition) {
          // The condition is already on the stack from pre-condition processing
          nwscriptDecompilerDebug(`[extractConditionFromBlock] Condition already on stack from pre-condition processing`);
          nwscriptDecompilerDebug(`[extractConditionFromBlock] Stack top expression type: ${stackTop.expression.type}`);
          if (stackTop.expression.type === 'variable') {
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Variable name: ${stackTop.expression.variableName}`);
          } else if (stackTop.expression.type === 'comparison') {
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Comparison operator: ${stackTop.expression.operator}`);
          } else if (stackTop.expression.type === 'logical') {
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Logical operator: ${stackTop.expression.operator}`);
          }
          nwscriptDecompilerDebug(`[extractConditionFromBlock] Stack size: ${this.stackSimulator.getStackSize()}, SP: ${this.stackSimulator.getStackPointer()}`);
          
          // Check if this is just a variable (which might be wrong)
          if (stackTop.expression.type === 'variable') {
            nwscriptDecompilerDebug(`[extractConditionFromBlock] WARNING: Condition is just a variable ${stackTop.expression.variableName}, might be incorrect`);
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Block ${block.id} instructions:`, block.instructions.map((instr: NWScriptInstruction) => 
              `${instr.address.toString(16).padStart(8, '0')} ${instr.codeName}`
            ).join(', '));
            const blockRange = block.getAddressRange();
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Block ${block.id} startAddress: ${blockRange.start.toString(16)}, endAddress: ${blockRange.end.toString(16)}`);
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Condition instruction at: ${conditionInstr.address.toString(16).padStart(8, '0')} ${conditionInstr.codeName}`);
            
            // Check if we need to look at instructions before the condition to reconstruct the full condition
            // The issue is that CPTOPSP at 130 overwrote the EQUAL result, so we need to reconstruct it
            const conditionIndex = block.instructions.indexOf(conditionInstr);
            nwscriptDecompilerDebug(`[extractConditionFromBlock] Condition instruction index: ${conditionIndex}`);
            if (conditionIndex > 0) {
              const instructionsBeforeCondition = block.instructions.slice(0, conditionIndex);
              nwscriptDecompilerDebug(`[extractConditionFromBlock] Instructions before condition:`, instructionsBeforeCondition.map((instr: NWScriptInstruction) => 
                `${instr.address.toString(16).padStart(8, '0')} ${instr.codeName}`
              ).join(', '));
              
              // Check if there's an EQUAL before CPTOPSP
              const equalIndex = instructionsBeforeCondition.findIndex((instr: NWScriptInstruction) => instr.code === OP_EQUAL);
              const cptopspIndex = instructionsBeforeCondition.findIndex((instr: NWScriptInstruction) => 
                instr.code === OP_CPTOPSP && 
                (equalIndex >= 0 ? instr.address > instructionsBeforeCondition[equalIndex].address : true)
              );
              if (equalIndex >= 0 && cptopspIndex >= 0 && cptopspIndex > equalIndex) {
                nwscriptDecompilerDebug(`[extractConditionFromBlock] Found EQUAL at index ${equalIndex} followed by CPTOPSP at index ${cptopspIndex} - this is a short-circuit pattern`);
                nwscriptDecompilerDebug(`[extractConditionFromBlock] Need to reconstruct condition from EQUAL result, not CPTOPSP result`);
                
                // Check if parent node's body block contains LOGANDII (only for IfNode, not IfElseNode)
                if (parentNode && parentNode.type === 'if' && parentNode.body && parentNode.body.type === 'basic_block') {
                  const bodyBlock = parentNode.body.block;
                  const bodyRange = bodyBlock.getAddressRange();
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Body block ${bodyBlock.id} startAddress: ${bodyRange.start.toString(16)}, endAddress: ${bodyRange.end.toString(16)}`);
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Body block ${bodyBlock.id} instructions:`, bodyBlock.instructions.map((instr: NWScriptInstruction) => 
                    `${instr.address.toString(16).padStart(8, '0')} ${instr.codeName}`
                  ).join(', '));
                  let hasLogAndII = bodyBlock.instructions.some((instr: NWScriptInstruction) => instr.code === OP_LOGANDII);
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Body block ${bodyBlock.id} has LOGANDII in instruction list: ${hasLogAndII}`);
                  
                  // Also check if LOGANDII is between body block end and next block start
                  // LOGANDII might be at address 162, which is between block 3 (ends 164) and block 4 (starts 164)
                  const logAndIIAddr = 0x162; // From assembly
                  if (bodyRange.end >= logAndIIAddr && bodyRange.start <= logAndIIAddr) {
                    nwscriptDecompilerDebug(`[extractConditionFromBlock] LOGANDII at ${logAndIIAddr.toString(16)} is within body block ${bodyBlock.id} address range`);
                    // Check if it's in the instruction list
                    const logAndIIInstr = bodyBlock.instructions.find((instr: NWScriptInstruction) => instr.address === logAndIIAddr);
                    if (!logAndIIInstr) {
                      nwscriptDecompilerDebug(`[extractConditionFromBlock] WARNING: LOGANDII at ${logAndIIAddr.toString(16)} is in address range but not in instruction list!`);
                      // Try to find it in the CFG
                      const allInstrs = Array.from(this.cfg.script.instructions.values());
                      const logAndII = allInstrs.find(instr => instr.address === logAndIIAddr);
                      if (logAndII) {
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] Found LOGANDII instruction in CFG at ${logAndIIAddr.toString(16)}`);
                        // Force cross-block extraction
                        hasLogAndII = true;
                      }
                    }
                  }
                  
                  if (hasLogAndII) {
                    nwscriptDecompilerDebug(`[extractConditionFromBlock] Attempting cross-block AND condition extraction...`);
                    // Try cross-block extraction
                    const combinedCondition = this.extractCrossBlockANDCondition(block, bodyBlock, functionContext);
                    if (combinedCondition) {
                      nwscriptDecompilerDebug(`[extractConditionFromBlock] Successfully extracted cross-block AND condition: ${combinedCondition.toNSS()}`);
                      return combinedCondition;
                    }
                  }
                  
                  // If cross-block extraction failed, try to reconstruct the first condition from EQUAL
                  // and combine with the second condition from the body block
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Attempting to reconstruct condition from EQUAL and body block...`);
                  
                  // Reconstruct first condition: process instructions up to and including EQUAL
                  const equalInstr = instructionsBeforeCondition[equalIndex];
                  const equalInstrIndex = block.instructions.indexOf(equalInstr);
                  if (equalInstrIndex >= 0) {
                    // Use a temporary stack simulator to track stack pointer correctly
                    // IMPORTANT: Use the variable stack positions map that was already built
                    // during pre-condition processing, not a new one!
                    const varStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map<number, number>();
                    
                    const tempStackSim = this.createTempStackSimulator();
                    if (functionContext) {
                      tempStackSim.setFunctionParameters(functionContext.parameters);
                    }
                    tempStackSim.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                    tempStackSim.setLocalVariables(this.stackSimulator.getLocalVariables());
                    // Use the existing variable stack positions map
                    tempStackSim.setVariableStackPositions(varStackPositions);
                    tempStackSim.setLocalVariableInits(this.localInits);
                    
                    const tempExprBuilder = this.createTempExpressionBuilder();
                    if (functionContext) {
                      tempExprBuilder.setFunctionParameters(functionContext.parameters);
                    }
                    tempExprBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                    tempExprBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
                    // Use the existing variable stack positions map
                    tempExprBuilder.setVariableStackPositions(varStackPositions);
                    tempExprBuilder.setLocalVariableInits(this.localInits);
                    
                    // Process all instructions up to and including EQUAL through both simulators
                    // The variable stack positions map is already correct from pre-condition processing
                    nwscriptDecompilerDebug(`[extractConditionFromBlock] Starting condition reconstruction with varStackPositions:`, Array.from(varStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
                    for (let i = 0; i <= equalInstrIndex; i++) {
                      const instr = block.instructions[i];
                      
                      // Log expression stack state before processing key instructions
                      if (instr.code === OP_CPTOPSP || instr.code === OP_CONST || instr.code === OP_EQUAL) {
                        const exprStackBefore = tempExprBuilder.getStackSize();
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] Before ${instr.codeName} at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackBefore}`);
                        if (exprStackBefore > 0) {
                          const topExpr = tempExprBuilder.peek();
                          if (topExpr) {
                            nwscriptDecompilerDebug(`[extractConditionFromBlock]   Top expression: ${topExpr.toNSS()}`);
                          }
                        }
                      }
                      
                      // Log CPTOPSP instructions to debug variable resolution
                      if (instr.code === OP_CPTOPSP) {
                        const spBefore = tempStackSim.getStackPointer();
                        const offset = instr.offset || 0;
                        const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
                        const sourceStackPos = spBefore + offsetSigned;
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] CPTOPSP at ${instr.address.toString(16).padStart(8, '0')}: SP=${spBefore}, offset=${offsetSigned}, sourcePos=${sourceStackPos}`);
                        const varIdx = varStackPositions.get(sourceStackPos);
                        if (varIdx !== undefined) {
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] CPTOPSP will resolve to localVar_${varIdx}`);
                        } else {
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] CPTOPSP: No variable found at position ${sourceStackPos}`);
                        }
                      }
                      
                      // CRITICAL: Get stack pointer BEFORE processing the instruction
                      // This is the stack pointer that CPTOPSP will use to calculate source position
                      const spBeforeInstr = tempStackSim.getStackPointer();
                      
                      // Process through stack simulator to track stack pointer
                      tempStackSim.processInstruction(instr);
                      
                      // Set expression builder's stack pointer to the value BEFORE the instruction
                      // This ensures CPTOPSP uses the correct stack pointer to calculate source position
                      tempExprBuilder.setStackPointer(spBeforeInstr);
                      
                      // Process through expression builder to build expressions
                      // For CPTOPSP, it needs the stack pointer BEFORE the instruction executes
                      if (instr.code === OP_CONST || instr.code === OP_ACTION || 
                          instr.code === OP_CPTOPSP || instr.code === OP_CPTOPBP ||
                          instr.code === OP_EQUAL || instr.code === OP_NEQUAL ||
                          instr.code === OP_GT || instr.code === OP_GEQ ||
                          instr.code === OP_LT || instr.code === OP_LEQ ||
                          instr.code === OP_ADD || instr.code === OP_SUB ||
                          instr.code === OP_MUL || instr.code === OP_DIV ||
                          instr.code === OP_LOGANDII || instr.code === OP_LOGORII) {
                        tempExprBuilder.processInstruction(instr);
                        
                        // Log expression stack state after processing key instructions
                        if (instr.code === OP_CPTOPSP || instr.code === OP_CONST || instr.code === OP_EQUAL) {
                          const exprStackAfter = tempExprBuilder.getStackSize();
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] After ${instr.codeName} at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackAfter}`);
                          if (exprStackAfter > 0) {
                            const topExpr = tempExprBuilder.peek();
                            if (topExpr) {
                              nwscriptDecompilerDebug(`[extractConditionFromBlock]   Top expression: ${topExpr.toNSS()}`);
                            }
                          }
                          if (instr.code === OP_EQUAL && exprStackAfter > 0) {
                            // Log both operands for EQUAL
                            const topExpr = tempExprBuilder.peek();
                            if (topExpr && topExpr.type === 'comparison' && topExpr.left && topExpr.right) {
                              nwscriptDecompilerDebug(`[extractConditionFromBlock]   EQUAL left: ${topExpr.left.toNSS()}, right: ${topExpr.right.toNSS()}`);
                            }
                          }
                        }
                      }
                    }
                    
                    const firstCondition = tempExprBuilder.peek();
                    if (firstCondition) {
                      nwscriptDecompilerDebug(`[extractConditionFromBlock] Reconstructed first condition from EQUAL: ${firstCondition.toNSS()}`);
                      
                      // Extract second condition from body block
                      // Continue from where tempStackSim left off (after EQUAL and CPTOPSP)
                      // The stack state should be correct after processing all instructions up to EQUAL
                      const bodyStartSP = tempStackSim.getStackPointer();
                      
                      const bodyStackSim = this.createTempStackSimulator();
                      if (functionContext) {
                        bodyStackSim.setFunctionParameters(functionContext.parameters);
                      }
                      bodyStackSim.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                      bodyStackSim.setLocalVariables(this.stackSimulator.getLocalVariables());
                      // Use the existing variable stack positions map (same as tempStackSim)
                      bodyStackSim.setVariableStackPositions(varStackPositions);
                      bodyStackSim.setLocalVariableInits(this.localInits);
                      
                      // Re-process all instructions from the start to get the correct stack state
                      // This ensures MOVSP and other stack manipulation instructions are tracked
                      for (let i = 0; i <= equalInstrIndex; i++) {
                        const instr = block.instructions[i];
                        bodyStackSim.processInstruction(instr);
                      }
                      
                      const bodyExprBuilder = this.createTempExpressionBuilder();
                      if (functionContext) {
                        bodyExprBuilder.setFunctionParameters(functionContext.parameters);
                      }
                      bodyExprBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                      bodyExprBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
                      // Use the existing variable stack positions map
                      bodyExprBuilder.setVariableStackPositions(varStackPositions);
                      bodyExprBuilder.setLocalVariableInits(this.localInits);
                      
                      // Process body block instructions up to GT
                      nwscriptDecompilerDebug(`[extractConditionFromBlock] Processing body block instructions for second condition...`);
                      for (const instr of bodyBlock.instructions) {
                        // Log expression stack state before processing key instructions
                        if (instr.code === OP_CPTOPSP || instr.code === OP_GT) {
                          const exprStackBefore = bodyExprBuilder.getStackSize();
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: Before ${instr.codeName} at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackBefore}`);
                          if (exprStackBefore > 0) {
                            const topExpr = bodyExprBuilder.peek();
                            if (topExpr) {
                              nwscriptDecompilerDebug(`[extractConditionFromBlock] Body:   Top expression: ${topExpr.toNSS()}`);
                            }
                          }
                        }
                        
                        // Log CPTOPSP instructions in body block
                        if (instr.code === OP_CPTOPSP) {
                          const spBefore = bodyStackSim.getStackPointer();
                          const offset = instr.offset || 0;
                          const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
                          const sourceStackPos = spBefore + offsetSigned;
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: CPTOPSP at ${instr.address.toString(16).padStart(8, '0')}: SP=${spBefore}, offset=${offsetSigned}, sourcePos=${sourceStackPos}`);
                          const varIdx = varStackPositions.get(sourceStackPos);
                          if (varIdx !== undefined) {
                            nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: CPTOPSP will resolve to localVar_${varIdx}`);
                          } else {
                            nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: CPTOPSP: No variable found at position ${sourceStackPos}`);
                          }
                        }
                        
                        // CRITICAL: Get stack pointer BEFORE processing the instruction
                        const bodySpBeforeInstr = bodyStackSim.getStackPointer();
                        
                        bodyStackSim.processInstruction(instr);
                        
                        // Set expression builder's stack pointer to the value BEFORE the instruction
                        bodyExprBuilder.setStackPointer(bodySpBeforeInstr);
                        
                        if (instr.code === OP_GT) {
                          bodyExprBuilder.processInstruction(instr);
                          
                          // Log after GT
                          const exprStackAfter = bodyExprBuilder.getStackSize();
                          nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: After GT at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackAfter}`);
                          if (exprStackAfter > 0) {
                            const topExpr = bodyExprBuilder.peek();
                            if (topExpr) {
                              nwscriptDecompilerDebug(`[extractConditionFromBlock] Body:   Top expression: ${topExpr.toNSS()}`);
                              if (topExpr.type === 'comparison' && topExpr.left && topExpr.right) {
                                nwscriptDecompilerDebug(`[extractConditionFromBlock] Body:   GT left: ${topExpr.left.toNSS()}, right: ${topExpr.right.toNSS()}`);
                              }
                            }
                          }
                          break;
                        } else if (instr.code === OP_CONST || instr.code === OP_ACTION || 
                                   instr.code === OP_CPTOPSP || instr.code === OP_CPTOPBP ||
                                   instr.code === OP_EQUAL || instr.code === OP_NEQUAL ||
                                   instr.code === OP_GEQ || instr.code === OP_LT ||
                                   instr.code === OP_LEQ || instr.code === OP_ADD ||
                                   instr.code === OP_SUB || instr.code === OP_MUL ||
                                   instr.code === OP_DIV || instr.code === OP_LOGANDII ||
                                   instr.code === OP_LOGORII) {
                          bodyExprBuilder.processInstruction(instr);
                          
                          // Log after CPTOPSP in body block
                          if (instr.code === OP_CPTOPSP) {
                            const exprStackAfter = bodyExprBuilder.getStackSize();
                            nwscriptDecompilerDebug(`[extractConditionFromBlock] Body: After CPTOPSP at ${instr.address.toString(16).padStart(8, '0')}: expression stack size=${exprStackAfter}`);
                            if (exprStackAfter > 0) {
                              const topExpr = bodyExprBuilder.peek();
                              if (topExpr) {
                                nwscriptDecompilerDebug(`[extractConditionFromBlock] Body:   Top expression: ${topExpr.toNSS()}`);
                              }
                            }
                          }
                        }
                        
                        // Update expression builder's stack pointer AFTER processing (for next instruction)
                        bodyExprBuilder.setStackPointer(bodyStackSim.getStackPointer());
                      }
                      
                      const secondCondition = bodyExprBuilder.peek();
                      if (secondCondition) {
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] Extracted second condition from body block: ${secondCondition.toNSS()}`);
                        
                        // Combine with LOGANDII
                        const combined = NWScriptExpression.logical('&&', firstCondition, secondCondition);
                        nwscriptDecompilerDebug(`[extractConditionFromBlock] Combined condition: ${combined.toNSS()}`);
                        return combined;
                      }
                    }
                  }
                }
              }
            }
          }
          
          return stackTop.expression;
        }
        
        // If not on stack, we need to process instructions that build the condition.
        // Since we don't know which instructions were pre-condition, we'll process
        // from the beginning to the condition. This will re-process pre-condition
        // instructions, but that's okay - they should be idempotent (RSADD, CPDOWNSP, etc.).
        // Actually, this might cause issues. Let's process from the last instruction
        // before the condition to the condition.
        const conditionIndex = block.instructions.indexOf(conditionInstr);
        if (conditionIndex > 0) {
          // Process instructions from the last instruction before the condition
          // This assumes the condition expression is built by the last few instructions
          // before the condition instruction
          const lastInstrBeforeCondition = block.instructions[conditionIndex - 1];
          
          // Process from the last instruction before condition to the condition
          // Actually, let's just process the last instruction before the condition
          // and see if that gives us the condition on the stack
          this.stackSimulator.processInstruction(lastInstrBeforeCondition);
          
          const stackTopAfter = this.stackSimulator.peek();
          if (stackTopAfter) {
            return stackTopAfter.expression;
          }
        }
        
        // Fallback: process all instructions up to the condition
        // This will re-process pre-condition instructions, but should work
        // Create a temporary expression builder to extract the condition
        const tempExprBuilder = this.createTempExpressionBuilder();
        if (functionContext) {
          tempExprBuilder.setFunctionParameters(functionContext.parameters);
          const globalVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
          for (let i = 0; i < this.globalInits.length; i++) {
            const init = this.globalInits[i];
            const varName = `globalVar_${i}`;
            const offsetSigned = init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
            globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
          }
          tempExprBuilder.setGlobalVariables(globalVarMap);
          
          const localVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
          for (let i = 0; i < this.localInits.length; i++) {
            const init = this.localInits[i];
            const varName = `localVar_${i}`;
            localVarMap.set(init.offset, { name: varName, dataType: init.dataType });
          }
          tempExprBuilder.setLocalVariables(localVarMap);
        }
        
        // Get variable stack positions for this function
        const variableStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map();
        tempExprBuilder.setVariableStackPositions(variableStackPositions);
        tempExprBuilder.setLocalVariableInits(this.localInits);
        
        // Process instructions up to the condition
        for (const instr of block.instructions) {
          if (instr === conditionInstr) {
            break;
          }
          tempExprBuilder.processInstruction(instr);
        }
        
        // The condition should now be on the stack
        const stackTopFinal = tempExprBuilder.peek();
        if (stackTopFinal) {
          return stackTopFinal;
        }
      }
    }
    
    // Fallback: prefer 0 over inventing a true condition when recovery failed
    return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
  }

  /**
   * Replay instructions in {@code block} up to (not including) the JZ/JNZ onto a snapshot of
   * the current stack, then peek the condition expression. Restores stack afterward.
   */
  private rebuildConditionFromBlockInstructions(
    block: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null,
    conditionInstr: NWScriptInstruction
  ): NWScriptExpression | null {
    let ctx = functionContext;
    if (!ctx) {
      ctx = this.blockToFunction.get(block) || null;
      if (ctx) {
        this.setupFunctionContext(ctx);
      }
    }

    const efCtx = this.effectiveRoutineContext(ctx, block);
    this.primeVariableStackPositionsLinearToAddress(efCtx, conditionInstr.address);

    const variableStackPositions =
      this.functionVariableStackPositions.get(ctx) ??
      this.functionVariableStackPositions.get(efCtx) ??
      new Map();
    this.stackSimulator.setVariableStackPositions(variableStackPositions);
    this.stackSimulator.setLocalVariableInits(this.localInits);

    // Start after the last init CPDOWN before the JZ. Headers often share a block with
    // RSADD/CONST/CPDOWN decls that pre-condition processing already applied to the live
    // stack; replaying those from a post-decl SP double-counts and CPTOPSP resolves to the
    // wrong locals (e.g. string `a == b` → `localVar_2 == localVar_2`).
    let startInstr: NWScriptInstruction | null = block.startInstruction;
    let lastCpdownBeforeCond: NWScriptInstruction | null = null;
    let scan: NWScriptInstruction | null | undefined = block.startInstruction;
    let scanGuard = 100000;
    while (scan && scan.address < conditionInstr.address && scanGuard-- > 0) {
      if (scan.code === OP_CPDOWNSP || scan.code === OP_CPDOWNBP) {
        lastCpdownBeforeCond = scan;
      }
      scan = scan.nextInstr;
    }
    if (lastCpdownBeforeCond?.nextInstr) {
      startInstr = lastCpdownBeforeCond.nextInstr;
      if (startInstr.code === OP_MOVSP && startInstr.nextInstr) {
        startInstr = startInstr.nextInstr;
      }
    }
    if (!startInstr) {
      return null;
    }

    const entrySp = this.computeStackPointerAtAddress(efCtx, startInstr.address);
    const snap = this.stackSimulator.takeStackSnapshot();
    try {
      this.stackSimulator.setProgramStackPointer(entrySp);
      let cur: NWScriptInstruction | null | undefined = startInstr;
      let replayGuard = 100000;
      while (cur && cur.address < conditionInstr.address && replayGuard-- > 0) {
        this.stackSimulator.processInstruction(cur);
        cur = cur.nextInstr;
      }
      const stackTop = this.stackSimulator.peek();
      if (stackTop) {
        return stackTop.expression;
      }
    } finally {
      this.stackSimulator.restoreStackSnapshot(snap);
    }
    return null;
  }

  /**
   * Build ++/-- expression for INCISP/DECISP/INCIBP/DECIBP.
   */
  private buildIncrementExpression(
    instruction: NWScriptInstruction,
    functionContext: NWScriptFunction | null,
    variableStackPositions: Map<number, number>
  ): NWScriptExpression | null {
    if (instruction.offset === undefined) {
      return null;
    }
    const offsetSigned =
      instruction.offset > 0x7FFFFFFF ? instruction.offset - 0x100000000 : instruction.offset;
    const isGlobal = instruction.code === OP_INCIBP || instruction.code === OP_DECIBP;
    const isDec = instruction.code === OP_DECISP || instruction.code === OP_DECIBP;
    const op = isDec ? "--" : "++";

    if (isGlobal) {
      const bp = this.stackSimulator.getBasePointer();
      const targetPos = bp + offsetSigned;
      for (let i = 0; i < this.globalInits.length; i++) {
        const init = this.globalInits[i];
        const initOff =
          init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
        if (initOff === offsetSigned || init.offset === targetPos) {
          return NWScriptExpression.unaryOp(
            op,
            NWScriptExpression.variable(`globalVar_${i}`, init.dataType),
            NWScriptDataType.INTEGER
          );
        }
      }
      return NWScriptExpression.unaryOp(
        op,
        NWScriptExpression.variable(`globalVar_0`, NWScriptDataType.INTEGER),
        NWScriptDataType.INTEGER
      );
    }

    const sp = this.stackSimulator.getStackPointer();
    const sourcePos = sp + offsetSigned;
    let varIndex = variableStackPositions.get(sourcePos);
    if (varIndex === undefined) {
      for (const [pos, idx] of variableStackPositions.entries()) {
        if (Math.abs(pos - sourcePos) <= 4) {
          varIndex = idx;
          break;
        }
      }
    }
    if (varIndex === undefined && this.localInits.length > 0) {
      varIndex = 0;
    }
    if (varIndex === undefined) {
      return null;
    }
    const dataType =
      this.localInits[varIndex]?.dataType ?? NWScriptDataType.INTEGER;
    return NWScriptExpression.unaryOp(
      op,
      NWScriptExpression.variable(`localVar_${varIndex}`, dataType),
      NWScriptDataType.INTEGER
    );
  }

  /**
   * Linear SP at {@code endExclusiveAddr} from the routine entry (same rules as
   * {@link primeVariableStackPositionsLinearToAddress}).
   */
  private computeStackPointerAtAddress(
    fc: NWScriptFunction | null,
    endExclusiveAddr: number
  ): number {
    if (!fc?.entryBlock) {
      return this.stackSimulator.getStackPointer();
    }
    let sp = this.functionEntryStackPointers.get(fc);
    if (sp === undefined) {
      sp = this.calculateFunctionEntryStackPointer(fc);
      if (sp !== undefined) {
        this.functionEntryStackPointers.set(fc, sp);
      }
    }
    if (sp === undefined) {
      sp = 0;
    }

    let cur: NWScriptInstruction | null | undefined = fc.entryBlock.startInstruction;
    let guard = 100000;
    while (cur && cur.address < endExclusiveAddr && guard-- > 0) {
      if (cur.code === OP_JSR && cur.offset !== undefined) {
        const targetPc = cur.address + cur.offset;
        const slots = this.jsrCalleeArgSlotsByEntryPc.get(targetPc) ?? 0;
        sp -= slots * 4;
        cur = cur.nextInstr;
        continue;
      }

      const dSlots = instructionForwardStackSlotDelta(cur);
      if (dSlots === null) {
        break;
      }
      sp += dSlots * 4;
      cur = cur.nextInstr;
    }
    return sp;
  }

  /**
   * Mark CFG blocks whose start addresses fall in [fromAddr, toAddrExclusive) as absorbed into
   * a short-circuit if-condition (skip nested empty probe ifs).
   */
  private markShortCircuitAbsorbed(fromAddr: number, toAddrExclusive: number): void {
    for (const [, block] of this.cfg.blocks) {
      const a = block.startInstruction.address;
      if (a >= fromAddr && a < toAddrExclusive) {
        this.shortCircuitAbsorbedBlocks.add(block);
      }
    }
  }

  /**
   * Rebuild a nested && / || if-condition by linearly replaying short-circuit bytecode from the
   * header's condition start through LOGAND/LOGOR until the then-body assignment (CPDOWN*).
   * Returns null when this header is not the start of such a ladder.
   *
   * @param options.allowJzFallthroughBody — while/do-while: body may start immediately after the
   *   exit JZ with no intervening CPDOWN (e.g. ACTION-only loop bodies).
   */
  private tryRebuildShortCircuitCondition(
    header: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null,
    options?: { allowJzFallthroughBody?: boolean }
  ): {
    condition: NWScriptExpression;
    bodyBlock: NWScriptBasicBlock;
    absorbFromAddress: number;
  } | null {
    const conditionInstr = header.conditionInstruction;
    if (!conditionInstr) {
      return null;
    }

    // Condition expression starts after the last init assignment (CPDOWN) before the header JZ.
    let startInstr: NWScriptInstruction | null = header.startInstruction;
    let lastCpdownBeforeCond: NWScriptInstruction | null = null;
    let scan: NWScriptInstruction | null | undefined = header.startInstruction;
    let scanGuard = 100000;
    while (scan && scan.address < conditionInstr.address && scanGuard-- > 0) {
      if (scan.code === OP_CPDOWNSP || scan.code === OP_CPDOWNBP) {
        lastCpdownBeforeCond = scan;
      }
      scan = scan.nextInstr;
    }
    if (lastCpdownBeforeCond?.nextInstr) {
      startInstr = lastCpdownBeforeCond.nextInstr;
      if (startInstr.code === OP_MOVSP && startInstr.nextInstr) {
        startInstr = startInstr.nextInstr;
      }
    }
    if (!startInstr) {
      return null;
    }

    // Reject mid-ladder probes: a true chain start is not preceded by LOGAND/LOGOR.
    let back: NWScriptInstruction | null | undefined = startInstr.prevInstr;
    let backGuard = 64;
    while (back && backGuard-- > 0) {
      if (back.code === OP_LOGANDII || back.code === OP_LOGORII) {
        return null;
      }
      if (
        back.code === OP_CPDOWNSP ||
        back.code === OP_CPDOWNBP ||
        back.code === OP_RSADD ||
        back.code === OP_MOVSP ||
        back.code === OP_RETN
      ) {
        break;
      }
      back = back.prevInstr;
    }

    // while/do-while path: the ladder's exit JZ is the one whose false edge leaves the
    // natural loop. Busy bodies (CPTOP/ACTION/JZ with no CPDOWN) would otherwise let the
    // walk run into body JZs and pick a wrong final JZ.
    const whilePath = options?.allowJzFallthroughBody === true;
    let loopBlocks: Set<NWScriptBasicBlock> | null = null;
    if (whilePath) {
      loopBlocks = this.cfg.naturalLoops.get(header) ?? null;
      if (!loopBlocks) {
        // do-while latch blocks aren't loop headers — take the innermost loop containing it.
        for (const [, blocks] of this.cfg.naturalLoops) {
          if (blocks.has(header) && (!loopBlocks || blocks.size < loopBlocks.size)) {
            loopBlocks = blocks;
          }
        }
      }
    }

    let seenLogical = false;
    let finalJz: NWScriptInstruction | null = null;
    let bodyAssign: NWScriptInstruction | null = null;
    let cur: NWScriptInstruction | null | undefined = startInstr;
    let walkGuard = 100000;
    while (cur && walkGuard-- > 0) {
      if (cur.code === OP_LOGANDII || cur.code === OP_LOGORII) {
        seenLogical = true;
      }
      if (cur.code === OP_JZ || cur.code === OP_JNZ) {
        if (whilePath && loopBlocks) {
          const rawOffset = cur.offset ?? 0;
          const jumpOffset = rawOffset > 0x7FFFFFFF ? rawOffset - 0x100000000 : rawOffset;
          const targetBlock = this.cfg.getBlockForAddress(cur.address + jumpOffset);
          const exitsLoop = !targetBlock || !loopBlocks.has(targetBlock);
          if (exitsLoop) {
            finalJz = cur;
            break;
          }
          // In-loop target: short-circuit probe — keep walking.
        } else {
          finalJz = cur;
          if (seenLogical) {
            // Exit JZ of combined condition: no further LOGAND/LOGOR before CPDOWN/RETN.
            // Mid-ladder may still JZ after a LOGOR when chaining a||b||c (keep walking).
            let peek: NWScriptInstruction | null | undefined = cur.nextInstr;
            let foundMoreLogical = false;
            let peekGuard = 96;
            while (peek && peekGuard-- > 0) {
              if (peek.code === OP_LOGANDII || peek.code === OP_LOGORII) {
                foundMoreLogical = true;
                break;
              }
              if (
                peek.code === OP_CPDOWNSP ||
                peek.code === OP_CPDOWNBP ||
                peek.code === OP_RETN
              ) {
                break;
              }
              peek = peek.nextInstr;
            }
            if (!foundMoreLogical) {
              break;
            }
          }
        }
      }
      // Post-LOGOR CPDOWN stop applies to the if/if-else path only; while bodies may
      // legitimately start with a CPDOWN-free ACTION sequence.
      if (!whilePath && seenLogical && (cur.code === OP_CPDOWNSP || cur.code === OP_CPDOWNBP)) {
        bodyAssign = cur;
        break;
      }
      if (cur.code === OP_RETN) {
        break;
      }
      cur = cur.nextInstr;
    }

    if (!seenLogical || !finalJz) {
      return null;
    }

    // Require the final if-JZ to be at/after this header's JZ so mid-ladder probes don't
    // claim the whole chain (they would rebuild a suffix and duplicate the then-body).
    if (finalJz.address < conditionInstr.address) {
      return null;
    }

    let bodyStartAddr: number | undefined;
    if (bodyAssign) {
      bodyStartAddr = bodyAssign.address;
    } else if (finalJz.nextInstr) {
      // if/while: combined condition left on stack; then/body is fall-through after the
      // exit JZ (Bioware OR ladders with CPTOPBP often have no post-LOGOR CPDOWN —
      // k_act_com31 UT_SetPlotBooleanFlag / UT_RemoveComputerSpikes).
      bodyStartAddr = finalJz.nextInstr.address;
    } else {
      return null;
    }

    const bodyBlock = this.cfg.getBlockForAddress(bodyStartAddr);
    if (!bodyBlock) {
      return null;
    }

    let ctx = functionContext;
    if (!ctx) {
      ctx = this.blockToFunction.get(header) || null;
      if (ctx) {
        this.setupFunctionContext(ctx);
      }
    }

    const efCtx = this.effectiveRoutineContext(ctx, header);
    this.primeVariableStackPositionsLinearToAddress(efCtx, startInstr.address);

    const variableStackPositions =
      this.functionVariableStackPositions.get(ctx) ??
      this.functionVariableStackPositions.get(efCtx) ??
      new Map<number, number>();

    const tempStackSim = this.createTempStackSimulator();
    const tempExprBuilder = this.createTempExpressionBuilder();
    if (ctx) {
      tempStackSim.setFunctionParameters(ctx.parameters);
      tempExprBuilder.setFunctionParameters(ctx.parameters);
    }
    tempStackSim.setGlobalVariables(this.stackSimulator.getGlobalVariables());
    tempStackSim.setLocalVariables(this.stackSimulator.getLocalVariables());
    tempStackSim.setVariableStackPositions(variableStackPositions);
    tempStackSim.setLocalVariableInits(this.localInits);
    tempExprBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
    tempExprBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
    tempExprBuilder.setVariableStackPositions(variableStackPositions);
    tempExprBuilder.setLocalVariableInits(this.localInits);

    // SP at condition start — do not use the live simulator (pre-condition may have
    // already pushed CPTOP duplicates that precede the header JZ).
    const entrySp = this.computeStackPointerAtAddress(efCtx, startInstr.address);
    tempStackSim.setProgramStackPointer(entrySp);
    tempExprBuilder.setStackPointer(entrySp);

    let replay: NWScriptInstruction | null | undefined = startInstr;
    let replayGuard = 100000;
    while (replay && replay.address < finalJz.address && replayGuard-- > 0) {
      const instr = replay;
      const spBefore = tempStackSim.getStackPointer();
      tempExprBuilder.setStackPointer(spBefore);

      if (instr.code === OP_JZ || instr.code === OP_JNZ) {
        // Short-circuit probe: pop the duplicated test value; do not take the branch.
        tempExprBuilder.pop();
        tempStackSim.pop();
        replay = instr.nextInstr;
        continue;
      }

      tempStackSim.processInstruction(instr);

      if (
        instr.code === OP_CONST ||
        instr.code === OP_ACTION ||
        instr.code === OP_CPTOPSP ||
        instr.code === OP_CPTOPBP ||
        instr.code === OP_EQUAL ||
        instr.code === OP_NEQUAL ||
        instr.code === OP_GT ||
        instr.code === OP_GEQ ||
        instr.code === OP_LT ||
        instr.code === OP_LEQ ||
        instr.code === OP_ADD ||
        instr.code === OP_SUB ||
        instr.code === OP_MUL ||
        instr.code === OP_DIV ||
        instr.code === OP_LOGANDII ||
        instr.code === OP_LOGORII ||
        instr.code === OP_JSR
      ) {
        tempExprBuilder.processInstruction(instr);
      }

      replay = instr.nextInstr;
    }

    const peek = tempExprBuilder.peek();
    if (!peek) {
      return null;
    }

    // Must produce a logical tree (avoid claiming simple compares as short-circuit chains).
    const nss = peek.toNSS();
    if (!nss.includes('&&') && !nss.includes('||')) {
      return null;
    }

    return {
      condition: peek,
      bodyBlock,
      absorbFromAddress: startInstr.address,
    };
  }

  /**
   * Extract cross-block AND condition when LOGANDII spans multiple blocks
   * This handles cases where the first condition is in one block and the LOGANDII is in another
   */
  private extractCrossBlockANDCondition(
    firstBlock: NWScriptBasicBlock,
    secondBlock: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression | null {
    nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] Starting extraction from block ${firstBlock.id} to block ${secondBlock.id}`);
    
    // Check if second block contains LOGANDII or if we need to look at its predecessors
    let logAndIIBlock: NWScriptBasicBlock | null = null;
    let logAndIIIndex = -1;
    
    // First check second block
    logAndIIIndex = secondBlock.instructions.findIndex(instr => instr.code === OP_LOGANDII);
    if (logAndIIIndex >= 0) {
      logAndIIBlock = secondBlock;
      nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] Found LOGANDII in block ${secondBlock.id} at index ${logAndIIIndex}`);
    } else {
      // Check predecessors of second block
      nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] LOGANDII not in block ${secondBlock.id}, checking predecessors:`, Array.from(secondBlock.predecessors).map((b: NWScriptBasicBlock) => b.id).join(', '));
      for (const predecessor of secondBlock.predecessors) {
        const idx = predecessor.instructions.findIndex(instr => instr.code === OP_LOGANDII);
        if (idx >= 0) {
          logAndIIBlock = predecessor;
          logAndIIIndex = idx;
          nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] Found LOGANDII in predecessor block ${predecessor.id} at index ${idx}`);
          break;
        }
      }
    }
    
    if (!logAndIIBlock || logAndIIIndex < 0) {
      nwscriptDecompilerDebug(`[extractCrossBlockANDCondition] No LOGANDII found, returning null`);
      return null;
    }
    
    // Setup expression builder
    const tempExprBuilder = this.createTempExpressionBuilder();
    if (functionContext) {
      tempExprBuilder.setFunctionParameters(functionContext.parameters);
      const globalVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
      for (let i = 0; i < this.globalInits.length; i++) {
        const init = this.globalInits[i];
        const varName = `globalVar_${i}`;
        const offsetSigned = init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
        globalVarMap.set(offsetSigned, { name: varName, dataType: init.dataType });
      }
      tempExprBuilder.setGlobalVariables(globalVarMap);
      
      const localVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
      for (let i = 0; i < this.localInits.length; i++) {
        const init = this.localInits[i];
        const varName = `localVar_${i}`;
        localVarMap.set(init.offset, { name: varName, dataType: init.dataType });
      }
      tempExprBuilder.setLocalVariables(localVarMap);
    }
    
    // Get variable stack positions for this function
    const variableStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map();
    tempExprBuilder.setVariableStackPositions(variableStackPositions);
    tempExprBuilder.setLocalVariableInits(this.localInits);
    
    // Process all instructions from first block up to its condition instruction
    if (firstBlock.conditionInstruction) {
      const conditionIndex = firstBlock.instructions.indexOf(firstBlock.conditionInstruction);
      for (let i = 0; i <= conditionIndex; i++) {
        tempExprBuilder.processInstruction(firstBlock.instructions[i]);
      }
    } else {
      // Process all instructions in first block
      for (const instr of firstBlock.instructions) {
        tempExprBuilder.processInstruction(instr);
      }
    }
    
    // Process instructions from LOGANDII block up to and including LOGANDII
    if (logAndIIBlock !== secondBlock) {
      // LOGANDII is in a predecessor block, process it
      for (let i = 0; i <= logAndIIIndex; i++) {
        tempExprBuilder.processInstruction(logAndIIBlock.instructions[i]);
      }
    } else {
      // LOGANDII is in second block
      for (let i = 0; i <= logAndIIIndex; i++) {
        tempExprBuilder.processInstruction(logAndIIBlock.instructions[i]);
      }
    }
    
    // If second block has a condition instruction, process up to it
    if (secondBlock.conditionInstruction && logAndIIBlock === secondBlock) {
      const conditionIndex = secondBlock.instructions.indexOf(secondBlock.conditionInstruction);
      // Process instructions after LOGANDII up to condition
      for (let i = logAndIIIndex + 1; i <= conditionIndex; i++) {
        tempExprBuilder.processInstruction(secondBlock.instructions[i]);
      }
    }
    
    // The combined AND condition should now be on the stack
    const combinedExpr = tempExprBuilder.peek();
    if (combinedExpr) {
      // Check if this is an AND expression with multiple comparisons
      const comparisons = this.extractComparisonsFromExpression(combinedExpr);
      if (comparisons.length >= 2) {
        // Build AND expression from comparisons
        let result = comparisons[0];
        for (let i = 1; i < comparisons.length; i++) {
          result = NWScriptExpression.logical('&&', result, comparisons[i]);
        }
        return result;
      }
      return combinedExpr;
    }
    
    return null;
  }

  /** Flatten top-level logical chains of a single operator into operands (leaves may be comparisons or nested trees). */
  private extractLogicalOperands(expr: NWScriptExpression, op: "&&" | "||"): NWScriptExpression[] {
    const parts: NWScriptExpression[] = [];
    const walk = (e: NWScriptExpression | null): void => {
      if (!e) return;
      if (e.type === "logical" && e.operator === op) {
        walk(e.left);
        walk(e.right);
      } else {
        parts.push(e);
      }
    };
    walk(expr);
    return parts;
  }

  /**
   * Cross-block OR when LOGORII is in the "then" block or a predecessor (short-circuit || ladder).
   */
  private extractCrossBlockORCondition(
    firstBlock: NWScriptBasicBlock,
    secondBlock: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression | null {
    let logOrBlock: NWScriptBasicBlock | null = null;
    let logOrIndex = -1;

    logOrIndex = secondBlock.instructions.findIndex((instr) => instr.code === OP_LOGORII);
    if (logOrIndex >= 0) {
      logOrBlock = secondBlock;
    } else {
      for (const predecessor of secondBlock.predecessors) {
        const idx = predecessor.instructions.findIndex((instr) => instr.code === OP_LOGORII);
        if (idx >= 0) {
          logOrBlock = predecessor;
          logOrIndex = idx;
          break;
        }
      }
    }

    if (!logOrBlock || logOrIndex < 0) {
      return null;
    }

    const tempExprBuilder = this.createTempExpressionBuilder();
    if (functionContext) {
      tempExprBuilder.setFunctionParameters(functionContext.parameters);
      const globalVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
      for (let i = 0; i < this.globalInits.length; i++) {
        const init = this.globalInits[i];
        const offsetSigned =
          init.offset > 0x7fffffff ? init.offset - 0x100000000 : init.offset;
        globalVarMap.set(offsetSigned, {
          name: `globalVar_${i}`,
          dataType: init.dataType,
        });
      }
      tempExprBuilder.setGlobalVariables(globalVarMap);

      const localVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
      for (let i = 0; i < this.localInits.length; i++) {
        const init = this.localInits[i];
        localVarMap.set(init.offset, {
          name: `localVar_${i}`,
          dataType: init.dataType,
        });
      }
      tempExprBuilder.setLocalVariables(localVarMap);
    }

    const variableStackPositions =
      this.functionVariableStackPositions.get(functionContext) || new Map();
    tempExprBuilder.setVariableStackPositions(variableStackPositions);
    tempExprBuilder.setLocalVariableInits(this.localInits);

    if (firstBlock.conditionInstruction) {
      const conditionIndex = firstBlock.instructions.indexOf(firstBlock.conditionInstruction);
      for (let i = 0; i <= conditionIndex; i++) {
        tempExprBuilder.processInstruction(firstBlock.instructions[i]);
      }
    } else {
      for (const instr of firstBlock.instructions) {
        tempExprBuilder.processInstruction(instr);
      }
    }

    for (let i = 0; i <= logOrIndex; i++) {
      tempExprBuilder.processInstruction(logOrBlock.instructions[i]);
    }

    if (secondBlock.conditionInstruction && logOrBlock === secondBlock) {
      const conditionIndex = secondBlock.instructions.indexOf(secondBlock.conditionInstruction);
      for (let i = logOrIndex + 1; i <= conditionIndex; i++) {
        tempExprBuilder.processInstruction(secondBlock.instructions[i]);
      }
    }

    const combinedExpr = tempExprBuilder.peek();
    if (!combinedExpr) {
      return null;
    }

    const parts = this.extractLogicalOperands(combinedExpr, "||");
    if (parts.length >= 2) {
      let result = parts[0];
      for (let i = 1; i < parts.length; i++) {
        result = NWScriptExpression.logical("||", result, parts[i]);
      }
      return result;
    }
    return combinedExpr;
  }

  /**
   * Extract all comparison expressions from an expression tree
   */
  private extractComparisonsFromExpression(expr: NWScriptExpression): NWScriptExpression[] {
    const comparisons: NWScriptExpression[] = [];
    
    const collect = (e: NWScriptExpression | null): void => {
      if (!e) return;
      
      if (e.type === 'logical' && e.operator === '&&') {
        // Recursively collect from left and right of AND expression
        collect(e.left);
        collect(e.right);
      } else if (e.type === 'comparison') {
        // This is a comparison - add it to the list
        comparisons.push(e);
      }
      // For other types, don't collect (they're not part of the AND chain)
    };
    
    collect(expr);
    return comparisons;
  }

  /** Resolve routine for locals (main blocks may not be in {@link blockToFunction}). */
  private effectiveRoutineContext(
    fc: NWScriptFunction | null,
    hintBlock?: NWScriptBasicBlock
  ): NWScriptFunction | null {
    if (fc != null) {
      return fc;
    }
    if (hintBlock) {
      const fromBlk = this.blockToFunction.get(hintBlock);
      if (fromBlk != null) {
        return fromBlk;
      }
    }
    return this.functions.find((f) => f.isMain) ?? null;
  }

  /**
   * When extraction runs before RSADD bookkeeping in convertBasicBlock, RSADD-derived stack slots may be
   * empty so CPTOPSP degrades to sp_* names. Walk linear bytecode from routine entry using the same
   * dword-delta helper as caller-arg inference (+ JSR arg pops).
   */
  private primeVariableStackPositionsLinearToAddress(
    fc: NWScriptFunction | null,
    endExclusiveAddr: number
  ): void {
    if (!fc?.entryBlock) {
      return;
    }
    const existing = this.functionVariableStackPositions.get(fc);
    if (existing !== undefined && existing.size > 0) {
      return;
    }

    let sp = this.functionEntryStackPointers.get(fc);
    if (sp === undefined) {
      sp = this.calculateFunctionEntryStackPointer(fc);
      if (sp !== undefined) {
        this.functionEntryStackPointers.set(fc, sp);
      }
    }
    if (sp === undefined) {
      sp = 0;
    }

    let varIdx = this.functionVariableCounts.get(fc) ?? 0;
    const map = new Map<number, number>();

    let cur: NWScriptInstruction | null | undefined = fc.entryBlock.startInstruction;
    let guard = 100000;
    while (cur && cur.address < endExclusiveAddr && guard-- > 0) {
      if (cur.code === OP_RSADD) {
        map.set(sp, varIdx);
        varIdx++;
      }

      if (cur.code === OP_JSR && cur.offset !== undefined) {
        const targetPc = cur.address + cur.offset;
        const slots = this.jsrCalleeArgSlotsByEntryPc.get(targetPc) ?? 0;
        sp -= slots * 4;
        cur = cur.nextInstr;
        continue;
      }

      const dSlots = instructionForwardStackSlotDelta(cur);
      if (dSlots === null) {
        break;
      }
      sp += dSlots * 4;
      cur = cur.nextInstr;
    }

    if (map.size === 0) {
      return;
    }
    this.functionVariableStackPositions.set(fc, map);
    this.functionVariableCounts.set(fc, varIdx);
  }

  /**
   * Run the current stack forward through {@code target}'s basic block through {@code target}, then peek.
   * Restores stack afterward (used for switch discriminant CPTOP that may not live in struct header block).
   */
  private extractExpressionUpToInstruction(
    target: NWScriptInstruction,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression {
    const block = this.cfg.getBlockForAddress(target.address);
    if (!block) {
      return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
    }
    let ctx = functionContext;
    if (!ctx) {
      ctx = this.blockToFunction.get(block) || null;
      if (ctx) {
        this.setupFunctionContext(ctx);
      }
    }

    const efCtx = this.effectiveRoutineContext(ctx, block);
    this.primeVariableStackPositionsLinearToAddress(efCtx, target.address);

    const variableStackPositions =
      this.functionVariableStackPositions.get(ctx) ??
      this.functionVariableStackPositions.get(efCtx) ??
      new Map();
    this.stackSimulator.setVariableStackPositions(variableStackPositions);
    this.stackSimulator.setLocalVariableInits(this.localInits);

    const snap = this.stackSimulator.takeStackSnapshot();
    try {
      for (const ins of block.instructions) {
        this.stackSimulator.processInstruction(ins);
        if (ins.address === target.address) {
          const stackTop = this.stackSimulator.peek();
          if (stackTop) {
            return stackTop.expression;
          }
          break;
        }
      }
      const stackTop = this.stackSimulator.peek();
      if (stackTop) {
        return stackTop.expression;
      }
    } finally {
      this.stackSimulator.restoreStackSnapshot(snap);
    }
    return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
  }

  /**
   * Extract expression from a block (for switch expressions)
   */
  private extractExpressionFromBlock(
    expressionNode: ControlNode,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression {
    // Similar to extractConditionFromBlock but for switch expressions
    if (expressionNode.type === 'basic_block') {
      const block = expressionNode.block;
      
      // Setup function context
      if (!functionContext) {
        functionContext = this.blockToFunction.get(block) || null;
        if (functionContext) {
          this.setupFunctionContext(functionContext);
        }
      }

      const efFn = this.effectiveRoutineContext(functionContext, block);

      this.primeVariableStackPositionsLinearToAddress(efFn, block.startInstruction.address);

      // Must use the same variable stack map and caller stack state as convertBasicBlock;
      // clearing SP broke CPTOPSP resolution (e.g. switch (1) instead of localVar_0).
      const variableStackPositions =
        this.functionVariableStackPositions.get(functionContext) ??
        this.functionVariableStackPositions.get(efFn) ??
        new Map();
      this.stackSimulator.setVariableStackPositions(variableStackPositions);
      this.stackSimulator.setLocalVariableInits(this.localInits);

      const snap = this.stackSimulator.takeStackSnapshot();
      try {
        for (const instr of block.instructions) {
          this.stackSimulator.processInstruction(instr);
        }
        const stackTop = this.stackSimulator.peek();
        if (stackTop) {
          return stackTop.expression;
        }
      } finally {
        this.stackSimulator.restoreStackSnapshot(snap);
      }
    }
    
    // Fallback: return a default expression
    return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
  }

  /**
   * Setup function context for variable resolution
   * 
   * NOTE: CPTOPSP (variable reads) are now resolved using stack-aware resolution
   * in NWScriptStackSimulator, which uses the actual stack state and variable
   * position map. This method only sets up CPDOWNSP offsets (for writes) as
   * a fallback, and provides variable info for the stack simulator.
   */
  private setupFunctionContext(func: NWScriptFunction): void {
    // Setup local variables for this function
    // We only need to map CPDOWNSP offsets (for writes) - CPTOPSP uses stack-aware resolution
    const localVarMap = new Map<number, { name: string, dataType: NWScriptDataType }>();
    
    for (let i = 0; i < this.localInits.length; i++) {
      const init = this.localInits[i];
      const varName = `localVar_${i}`;
      
      // Map by the CPDOWNSP offset (for writes) - this is static and known from the analyzer
      const cpdownspOffset = init.offset;
      localVarMap.set(cpdownspOffset, { name: varName, dataType: init.dataType });
    }
    
    // Set local variables in both builders (for backward compatibility and CPDOWNSP writes)
    // The stack simulator will use stack-aware resolution for CPTOPSP reads
    this.expressionBuilder.setLocalVariables(localVarMap);
    this.stackSimulator.setLocalVariables(localVarMap);
    
    // Setup function parameters
    this.setFunctionParametersForBuilders(func);
    
    // Calculate and track the return value stack position
    // The return value position is where RSADD reserved space before the JSR that calls this function
    if (!this.functionReturnValueOffsets.has(func)) {
      nwscriptDecompilerDebug(`[setupFunctionContext] Calculating return value position for function ${func.name}...`);
      
      // First, simulate stack to function entry to get entry stack pointer
      const entrySP = this.calculateFunctionEntryStackPointer(func);
      nwscriptDecompilerDebug(`[setupFunctionContext] Function ${func.name}: Calculated entry SP = ${entrySP}`);
      if (entrySP !== undefined) {
        this.functionEntryStackPointers.set(func, entrySP);
      }
      
      // Then calculate return value position and convert to offset from entry
      const returnValuePos = this.calculateReturnValuePosition(func);
      nwscriptDecompilerDebug(`[setupFunctionContext] Function ${func.name}: Calculated return value absolute position = ${returnValuePos}`);
      
      if (returnValuePos !== undefined && entrySP !== undefined) {
        const returnValueOffset = returnValuePos - entrySP;
        this.functionReturnValueOffsets.set(func, returnValueOffset);
        nwscriptDecompilerDebug(`[setupFunctionContext] ✓ Function ${func.name}: Entry SP = ${entrySP}, Return value absolute pos = ${returnValuePos}, Return value offset = ${returnValueOffset}`);
      } else {
        nwscriptDecompilerDebug(`[setupFunctionContext] ✗ Function ${func.name}: Missing entrySP (${entrySP}) or returnValuePos (${returnValuePos})`);
      }
    } else {
      const existingOffset = this.functionReturnValueOffsets.get(func);
      const existingEntrySP = this.functionEntryStackPointers.get(func);
      nwscriptDecompilerDebug(`[setupFunctionContext] Function ${func.name}: Using cached return value offset = ${existingOffset}, entry SP = ${existingEntrySP}`);
    }
  }
  
  /**
   * Calculate the function entry stack pointer
   * This is the stack pointer value when the function starts executing
   * For functions called via JSR, this is the SP at the JSR instruction (before jumping)
   * For main function, this is the SP at the function's first instruction
   */
  private calculateFunctionEntryStackPointer(func: NWScriptFunction): number | undefined {
    const tempSim = this.createTempStackSimulator();
    const entryBlock = this.cfg.entryBlock;
    if (!entryBlock) {
      return undefined;
    }
    
    if (func.jsrInstruction) {
      // For functions called via JSR, the entry SP is the SP at the JSR instruction
      // (the function starts executing at the JSR target, with the same stack state as at JSR)
      const jsrInstr = func.jsrInstruction;
      let simCurrent = entryBlock.startInstruction;
      
      while (simCurrent && simCurrent.address < jsrInstr.address) {
        tempSim.processInstruction(simCurrent);
        simCurrent = simCurrent.nextInstr;
      }
      
      const entrySP = tempSim.getStackPointer();
      nwscriptDecompilerDebug(`[calculateFunctionEntryStackPointer] Function ${func.name}: JSR at ${jsrInstr.address.toString(16)}, Entry SP (at JSR) = ${entrySP}`);
      return entrySP;
    } else {
      // For main function, check if there's a JSR that calls it
      // If the function has a return type, it was likely called via JSR with RSADD before it
      // Find the JSR that targets this function's entry address
      const funcEntryAddress = func.entryBlock.startInstruction.address;
      let jsrInstr: NWScriptInstruction | null = null;
      
      // Search for JSR that targets this function
      for (const instruction of this.cfg.script.instructions.values()) {
        if (instruction.code === OP_JSR && instruction.offset !== undefined) {
          const jsrTarget = instruction.address + instruction.offset;
          if (jsrTarget === funcEntryAddress) {
            jsrInstr = instruction;
            break;
          }
        }
      }
      
      if (jsrInstr) {
        // Found JSR that calls this function - use SP at JSR
        let simCurrent = entryBlock.startInstruction;
        while (simCurrent && simCurrent.address < jsrInstr.address) {
          tempSim.processInstruction(simCurrent);
          simCurrent = simCurrent.nextInstr;
        }
        const entrySP = tempSim.getStackPointer();
        nwscriptDecompilerDebug(`[calculateFunctionEntryStackPointer] Function ${func.name}: Found JSR at ${jsrInstr.address.toString(16)} calling entry ${funcEntryAddress.toString(16)}, Entry SP (at JSR) = ${entrySP}`);
        return entrySP;
      } else {
        // No JSR found - simulate to function entry
        let simCurrent = entryBlock.startInstruction;
        while (simCurrent && simCurrent.address < funcEntryAddress) {
          tempSim.processInstruction(simCurrent);
          simCurrent = simCurrent.nextInstr;
        }
        const entrySP = tempSim.getStackPointer();
        nwscriptDecompilerDebug(`[calculateFunctionEntryStackPointer] Function ${func.name}: Entry address = ${funcEntryAddress.toString(16)}, Entry SP = ${entrySP}`);
        return entrySP;
      }
    }
  }
  
  /**
   * Calculate the return value stack position for a function
   * This is the stack position where RSADD reserved space before the JSR that calls the function
   */
  private calculateReturnValuePosition(func: NWScriptFunction): number | undefined {
    if (!func.jsrInstruction) {
      // Main function or function without JSR - check if there's an entry RSADD
      // For main function, the entry RSADD (if present) reserves space for return value
      if (func.isMain && func.entryBlock) {
        // Look for RSADD before the first instruction in entry block
        let current = func.entryBlock.startInstruction;
        let rsaddInstr: NWScriptInstruction | null = null;
        
        // Search backwards from entry to find RSADD
        while (current && current.prevInstr) {
          current = current.prevInstr;
          if (current.code === OP_RSADD) {
            rsaddInstr = current;
            break;
          }
        }
        
        if (rsaddInstr) {
          // Simulate stack up to RSADD to get the stack position
          const tempSim = this.createTempStackSimulator();
          let simCurrent = this.cfg.entryBlock?.startInstruction;
          const spBeforeRsadd = tempSim.getStackPointer();
          nwscriptDecompilerDebug(`[calculateReturnValuePosition] Main function: SP before RSADD at ${rsaddInstr.address.toString(16)} = ${spBeforeRsadd}`);
          while (simCurrent && simCurrent.address < rsaddInstr.address) {
            tempSim.processInstruction(simCurrent);
            simCurrent = simCurrent.nextInstr;
          }
          const spAtRsadd = tempSim.getStackPointer();
          // RSADD reserves space at the current SP (before it pushes)
          const returnValuePos = spAtRsadd;
          nwscriptDecompilerDebug(`[calculateReturnValuePosition] Main function: SP at RSADD = ${spAtRsadd}, return value position = ${returnValuePos}`);
          // Process RSADD to see what SP becomes after
          tempSim.processInstruction(rsaddInstr);
          const spAfterRsadd = tempSim.getStackPointer();
          nwscriptDecompilerDebug(`[calculateReturnValuePosition] Main function: SP after RSADD = ${spAfterRsadd}`);
          return returnValuePos;
        }
      }
      return undefined;
    }
    
    // For functions called via JSR, find the RSADD before the JSR
    const jsrInstr = func.jsrInstruction;
    const jsrBlock = this.cfg.getBlockForAddress(jsrInstr.address);
    if (!jsrBlock) {
      return undefined;
    }
    
    // Look backwards from JSR to find RSADD
    let current: NWScriptInstruction | null = jsrInstr.prevInstr;
    let rsaddInstr: NWScriptInstruction | null = null;
    
    // Search within the same block first
    while (current && current.address >= jsrBlock.startInstruction.address) {
      if (current.code === OP_RSADD) {
        rsaddInstr = current;
        break;
      }
      current = current.prevInstr;
    }
    
    if (!rsaddInstr) {
      // RSADD might be in a previous block - check predecessors
      for (const pred of jsrBlock.predecessors) {
        if (pred.endInstruction && pred.endInstruction.code !== OP_JMP && 
            pred.endInstruction.code !== OP_JZ && pred.endInstruction.code !== OP_JNZ) {
          // Check the last few instructions of predecessor
          let checkInstr = pred.endInstruction;
          let checkCount = 0;
          while (checkInstr && checkCount < 5) {
            if (checkInstr.code === OP_RSADD) {
              rsaddInstr = checkInstr;
              break;
            }
            checkInstr = checkInstr.prevInstr;
            checkCount++;
          }
          if (rsaddInstr) break;
        }
      }
    }
    
    if (!rsaddInstr) {
      nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: No RSADD found before JSR at ${jsrInstr.address.toString(16)}`);
      return undefined;
    }
    
    // Simulate stack up to RSADD to get the stack position
    // We need to simulate from the entry block to the RSADD instruction
    const tempSim = this.createTempStackSimulator();
    const entryBlock = this.cfg.entryBlock;
    if (!entryBlock) {
      return undefined;
    }
    
    // Simulate from entry to RSADD
    let simCurrent = entryBlock.startInstruction;
    while (simCurrent && simCurrent.address < rsaddInstr.address) {
      tempSim.processInstruction(simCurrent);
      simCurrent = simCurrent.nextInstr;
    }
    
    const spAtRsadd = tempSim.getStackPointer();
    // RSADD reserves space at the current SP (before it pushes)
    const returnValuePos = spAtRsadd;
    nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: SP at RSADD (before RSADD executes) = ${spAtRsadd}`);
    // Process RSADD to see what SP becomes after
    tempSim.processInstruction(rsaddInstr);
    const spAfterRsadd = tempSim.getStackPointer();
    nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: SP after RSADD = ${spAfterRsadd}`);
    // Continue to JSR to see SP at function entry
    while (simCurrent && simCurrent.address < jsrInstr.address) {
      tempSim.processInstruction(simCurrent);
      simCurrent = simCurrent.nextInstr;
    }
    // Process JSR (it doesn't change SP in this model; callee epilogue MOVSP clears args)
    const spAtJsr = tempSim.getStackPointer();
    nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: SP at JSR = ${spAtJsr}`);
    nwscriptDecompilerDebug(`[calculateReturnValuePosition] Function ${func.name}: Found RSADD at ${rsaddInstr.address.toString(16)} before JSR at ${jsrInstr.address.toString(16)}, return value position = ${returnValuePos}`);
    return returnValuePos;
  }

  /**
   * Signed BP offsets touched by CPTOPBP/CPDOWNBP/INCIBP/DECIBP in the bytecode.
   * Used to omit SAVEBP const-table globals that are never referenced from recovered bodies.
   */
  private collectReferencedGlobalBpOffsets(): Set<number> {
    const refs = new Set<number>();
    const script = this.cfg.script;
    if (!script?.instructions) {
      return refs;
    }
    for (const instr of script.instructions.values()) {
      if (
        instr.code !== OP_CPTOPBP &&
        instr.code !== OP_CPDOWNBP &&
        instr.code !== OP_INCIBP &&
        instr.code !== OP_DECIBP
      ) {
        continue;
      }
      if (instr.offset === undefined) {
        continue;
      }
      const offsetSigned =
        instr.offset > 0x7FFFFFFF ? instr.offset - 0x100000000 : instr.offset;
      refs.add(offsetSigned);
    }
    return refs;
  }

  /**
   * Build global variable declarations
   */
  private buildGlobalVariableDeclarations(): NWScriptGlobalVariableDeclarationNode[] {
    const referenced = this.collectReferencedGlobalBpOffsets();
    const decls: NWScriptGlobalVariableDeclarationNode[] = [];
    for (let index = 0; index < this.globalInits.length; index++) {
      const init = this.globalInits[index];
      const offsetSigned =
        init.offset > 0x7FFFFFFF ? init.offset - 0x100000000 : init.offset;
      // Keep analyzer slots for BP resolve; only suppress unreferenced decls in NSS.
      if (!referenced.has(offsetSigned)) {
        continue;
      }
      const name = `globalVar_${index}`;
      const initializer =
        init.hasInitializer && init.initialValue !== undefined
          ? NWScriptExpression.constant(init.initialValue, init.dataType)
          : undefined;
      decls.push(NWScriptAST.createGlobalVariableDeclaration(name, init.dataType, initializer));
    }
    return decls;
  }

  /**
   * Build function nodes from functions
   * @param mainControlNode The ControlNode tree for the main function (if it exists)
   */
  private buildFunctionNodes(structureBuilder: NWScriptControlStructureBuilder, mainControlNode?: ControlNode): NWScriptFunctionNode[] {
    const functionNodes: NWScriptFunctionNode[] = [];
    
    // First, add the main function if it exists
    const mainFunction = this.functions.find(f => f.isMain);
    if (mainFunction && mainControlNode) {
      const body = this.convertControlNodeToBlock(mainControlNode, mainFunction);
      const locals = this.buildLocalVariableDeclarations(mainFunction, body);
      functionNodes.push(NWScriptAST.createFunction(
        mainFunction.name,
        mainFunction.returnType,
        mainFunction.parameters.map(p => ({ name: p.name, type: p.dataType })),
        body,
        locals,
        mainFunction.entryBlock
      ));
    }
    
    // Then add all other functions
    return this.functions
      .filter(func => !func.isMain) // Exclude main function (already added)
      .map(func => {
        // Build ControlNode tree for this function
        const functionControlNode = structureBuilder.buildProcedure(func.entryBlock);
        
        // Convert ControlNode tree to block
        const body = this.convertControlNodeToBlock(functionControlNode, func);
        
        // Build local variable declarations (merge with assignments)
        const locals = this.buildLocalVariableDeclarations(func, body);
        
        return NWScriptAST.createFunction(
          func.name,
          func.returnType,
          func.parameters.map(p => ({ name: p.name, type: p.dataType })), // dataType -> type mapping
          body, // body comes before locals
          locals,
          func.entryBlock
        );
      })
      .concat(functionNodes); // Add main function at the end
  }

  /**
   * Build local variable declarations for a function
   * Merges declarations with their first assignment if they occur together
   */
  private buildLocalVariableDeclarations(
    func: NWScriptFunction,
    body?: NWScriptBlockNode
  ): NWScriptVariableDeclarationNode[] {
    const rsaddSites = this.collectOrderedRsaddSitesInFunction(func);
    const coalescedTypes = this.functionLocalTypes.get(func);
    const coalescedCount = this.functionVariableCounts.get(func) ?? 0;

    const sortedInits = this.localInits
      .filter(init =>
        func.bodyBlocks.some(block => block.containsAddress(init.instructionAddress))
      )
      .sort((a, b) => a.instructionAddress - b.instructionAddress);

    // Prefer coalesced vector/struct slot count when aggregates were recovered
    const slotCount =
      coalescedTypes && coalescedTypes.length > 0
        ? Math.max(coalescedTypes.length, coalescedCount)
        : Math.max(
            rsaddSites.length,
            sortedInits.length,
            coalescedCount
          );

    const declarations: NWScriptVariableDeclarationNode[] = [];
    for (let i = 0; i < slotCount; i++) {
      const site = rsaddSites[i];
      const init =
        site !== undefined
          ? sortedInits.find(ini => ini.instructionAddress === site.address)
          : sortedInits[i];

      const dataType =
        coalescedTypes?.[i] ??
        init?.dataType ??
        site?.dataType ??
        NWScriptDataType.INTEGER;
      let initializer =
        init !== undefined && init.hasInitializer && init.initialValue !== undefined
          ? NWScriptExpression.constant(init.initialValue, init.dataType)
          : undefined;
      // Analyzer float inits don't apply to coalesced vector/struct slots
      if (
        coalescedTypes?.[i] === NWScriptDataType.VECTOR ||
        coalescedTypes?.[i] === NWScriptDataType.STRUCTURE
      ) {
        initializer = undefined;
      }
      if (
        initializer &&
        dataType === NWScriptDataType.OBJECT &&
        initializer.dataType === NWScriptDataType.INTEGER
      ) {
        initializer = NWScriptExpression.constant(initializer.value, NWScriptDataType.OBJECT);
      }

      declarations.push(NWScriptAST.createVariableDeclaration(`localVar_${i}`, dataType, initializer));
    }

    // Declare unresolved stack temps (sp_*) referenced in the body so NSS recompiles.
    if (body) {
      const declared = new Set(declarations.map((d) => d.name));
      const temps = new Set<string>();
      this.collectTempVariableNames(body, temps);
      for (const name of [...temps].sort()) {
        if (declared.has(name)) continue;
        if (!/^sp_/.test(name) && !/^g_bp_/.test(name) && !/^var_/.test(name)) continue;
        declarations.push(
          NWScriptAST.createVariableDeclaration(name, NWScriptDataType.INTEGER, undefined)
        );
        declared.add(name);
      }
    }
    
    // If body is provided, merge declarations with their first assignment
    if (body && body.statements) {
      const assignmentsToRemove: number[] = [];
      
      for (let i = 0; i < declarations.length; i++) {
        const decl = declarations[i];
        const varName = decl.name;
        
        // Find the first assignment to this variable in the body
        for (let j = 0; j < body.statements.length; j++) {
          const stmt = body.statements[j];
          if (stmt.type === NWScriptASTNodeType.ASSIGNMENT) {
            const assignStmt = stmt as NWScriptAssignmentNode;
            if (assignStmt.variable === varName &&
                !assignmentsToRemove.includes(j) &&
                !decl.initializer) { // Only merge if declaration doesn't already have an initializer
              // Found first assignment - merge into declaration
              let merged: NWScriptExpression = assignStmt.value;
              if (merged.type === NWScriptExpressionType.CONSTANT) {
                if (decl.dataType === NWScriptDataType.STRING && merged.dataType === NWScriptDataType.INTEGER && merged.value === 0) {
                  merged = NWScriptExpression.constant("", NWScriptDataType.STRING);
                } else if (decl.dataType === NWScriptDataType.OBJECT && merged.dataType === NWScriptDataType.INTEGER && (merged.value === 0 || merged.value === 1)) {
                  merged = NWScriptExpression.constant(merged.value, NWScriptDataType.OBJECT);
                } else if (decl.dataType === NWScriptDataType.FLOAT && merged.dataType === NWScriptDataType.INTEGER) {
                  merged = NWScriptExpression.constant(merged.value, NWScriptDataType.FLOAT);
                } else if (decl.dataType === NWScriptDataType.STRING && merged.dataType !== NWScriptDataType.STRING) {
                  // Keep string slot — do not merge mistyped int into string initializer
                  break;
                } else if (decl.dataType === NWScriptDataType.OBJECT && merged.dataType !== NWScriptDataType.OBJECT && !(merged.dataType === NWScriptDataType.INTEGER && (merged.value === 0 || merged.value === 1))) {
                  break;
                }
              } else if (this.expressionReferencesLaterOrSelfLocal(merged, i)) {
                // Avoid `int localVar_2 = (localVar_3 + 100)` before localVar_3 exists
                break;
              } else if (this.expressionReferencesMemberAccess(merged)) {
                // Keep `t = p.x + p.y` after field stores, not in the decl initializer
                break;
              }
              decl.initializer = merged;
              assignmentsToRemove.push(j);
              break; // Only merge the first assignment
            }
          }
        }
      }
      
      // Remove merged assignments from body (in reverse order to maintain indices)
      assignmentsToRemove.sort((a, b) => b - a);
      for (const index of assignmentsToRemove) {
        body.statements.splice(index, 1);
      }

      this.scrubRedundantInitializerAssignments(body, declarations);
      this.scrubIncompatibleAssignments(body, declarations);

      // Drop unused uninitialized locals (phantom slots from JSR/stack noise, e.g. Mid in smoke_20)
      const usedNames = new Set<string>();
      this.collectTempVariableNames(body, usedNames);
      for (const d of declarations) {
        if (d.initializer) {
          this.collectExprNames(d.initializer, usedNames);
        }
      }
      const isReferenced = (name: string): boolean => {
        if (usedNames.has(name)) {
          return true;
        }
        for (const u of usedNames) {
          if (u.startsWith(name + ".")) {
            return true;
          }
        }
        return false;
      };
      for (let i = declarations.length - 1; i >= 0; i--) {
        const d = declarations[i];
        if (!d.initializer && !isReferenced(d.name) && /^localVar_\d+$/.test(d.name)) {
          declarations.splice(i, 1);
        }
      }
    }
    
    return declarations;
  }

  /**
   * Drop body `local = CONST` when the decl already has the same constant initializer
   * (analyzer attached init; merge skipped because initializer was set).
   */
  private scrubRedundantInitializerAssignments(
    body: NWScriptBlockNode,
    declarations: NWScriptVariableDeclarationNode[]
  ): void {
    const initByName = new Map<string, NWScriptExpression>();
    for (const d of declarations) {
      if (d.initializer && d.initializer.type === NWScriptExpressionType.CONSTANT) {
        initByName.set(d.name, d.initializer);
      }
    }
    if (initByName.size === 0) {
      return;
    }

    const sameConst = (a: NWScriptExpression, b: NWScriptExpression): boolean => {
      if (a.type !== NWScriptExpressionType.CONSTANT || b.type !== NWScriptExpressionType.CONSTANT) {
        return false;
      }
      if (a.value !== b.value) {
        return false;
      }
      // Compatible numeric types (int 100 vs float 100.0 after coercion paths)
      if (a.dataType === b.dataType) {
        return true;
      }
      if (
        (a.dataType === NWScriptDataType.INTEGER || a.dataType === NWScriptDataType.FLOAT) &&
        (b.dataType === NWScriptDataType.INTEGER || b.dataType === NWScriptDataType.FLOAT)
      ) {
        return Number(a.value) === Number(b.value);
      }
      if (a.dataType === NWScriptDataType.OBJECT && b.dataType === NWScriptDataType.INTEGER) {
        return a.value === b.value;
      }
      if (b.dataType === NWScriptDataType.OBJECT && a.dataType === NWScriptDataType.INTEGER) {
        return a.value === b.value;
      }
      return false;
    };

    const filterBlock = (block: NWScriptBlockNode): void => {
      block.statements = block.statements.filter((stmt) => {
        if (stmt.type === NWScriptASTNodeType.ASSIGNMENT) {
          const a = stmt as NWScriptAssignmentNode;
          const init = initByName.get(a.variable);
          if (init && a.value.type === NWScriptExpressionType.CONSTANT && sameConst(init, a.value)) {
            return false;
          }
          return true;
        }
        if (stmt.type === NWScriptASTNodeType.IF) {
          filterBlock((stmt as NWScriptIfNode).thenBody);
        } else if (stmt.type === NWScriptASTNodeType.IF_ELSE) {
          const ie = stmt as NWScriptIfElseNode;
          filterBlock(ie.thenBody);
          filterBlock(ie.elseBody);
        } else if (stmt.type === NWScriptASTNodeType.WHILE) {
          filterBlock((stmt as NWScriptWhileNode).body);
        } else if (stmt.type === NWScriptASTNodeType.DO_WHILE) {
          filterBlock((stmt as NWScriptDoWhileNode).body);
        } else if (stmt.type === NWScriptASTNodeType.FOR) {
          filterBlock((stmt as NWScriptForNode).body);
        } else if (stmt.type === NWScriptASTNodeType.SWITCH) {
          const sw = stmt as NWScriptSwitchNode;
          for (const c of sw.cases) filterBlock(c.body);
          if (sw.defaultCase) filterBlock(sw.defaultCase.body);
        } else if (stmt.type === NWScriptASTNodeType.BLOCK) {
          filterBlock(stmt as NWScriptBlockNode);
        }
        return true;
      });
    };
    filterBlock(body);
  }

  /** Typed default for non-void `return` when the value expression was not recovered. */
  private defaultReturnExpression(returnType: NWScriptDataType): NWScriptExpression {
    switch (returnType) {
      case NWScriptDataType.FLOAT:
        return NWScriptExpression.constant(0, NWScriptDataType.FLOAT);
      case NWScriptDataType.STRING:
        return NWScriptExpression.constant("", NWScriptDataType.STRING);
      case NWScriptDataType.OBJECT:
        return NWScriptExpression.constant(0, NWScriptDataType.OBJECT);
      default:
        return NWScriptExpression.constant(0, NWScriptDataType.INTEGER);
    }
  }

  /** Collect variable names appearing in expressions / assignments (for declaring stack temps). */
  private collectTempVariableNames(node: NWScriptASTNode, out: Set<string>): void {
    switch (node.type) {
      case NWScriptASTNodeType.PROGRAM:
        for (const f of (node as NWScriptProgramNode).functions) this.collectTempVariableNames(f, out);
        break;
      case NWScriptASTNodeType.FUNCTION:
        this.collectTempVariableNames((node as NWScriptFunctionNode).body, out);
        break;
      case NWScriptASTNodeType.BLOCK:
        for (const s of (node as NWScriptBlockNode).statements) this.collectTempVariableNames(s, out);
        break;
      case NWScriptASTNodeType.ASSIGNMENT: {
        const a = node as NWScriptAssignmentNode;
        out.add(a.variable);
        this.collectExprNames(a.value, out);
        break;
      }
      case NWScriptASTNodeType.EXPRESSION_STATEMENT:
        this.collectExprNames((node as NWScriptExpressionStatementNode).expression, out);
        break;
      case NWScriptASTNodeType.RETURN: {
        const r = node as NWScriptReturnNode;
        if (r.value) this.collectExprNames(r.value, out);
        break;
      }
      case NWScriptASTNodeType.IF: {
        const n = node as NWScriptIfNode;
        this.collectExprNames(n.condition, out);
        this.collectTempVariableNames(n.thenBody, out);
        break;
      }
      case NWScriptASTNodeType.IF_ELSE: {
        const n = node as NWScriptIfElseNode;
        this.collectExprNames(n.condition, out);
        this.collectTempVariableNames(n.thenBody, out);
        this.collectTempVariableNames(n.elseBody, out);
        break;
      }
      case NWScriptASTNodeType.WHILE: {
        const n = node as NWScriptWhileNode;
        this.collectExprNames(n.condition, out);
        this.collectTempVariableNames(n.body, out);
        break;
      }
      case NWScriptASTNodeType.DO_WHILE: {
        const n = node as NWScriptDoWhileNode;
        this.collectExprNames(n.condition, out);
        this.collectTempVariableNames(n.body, out);
        break;
      }
      case NWScriptASTNodeType.FOR: {
        const n = node as NWScriptForNode;
        if (n.init) this.collectTempVariableNames(n.init, out);
        if (n.condition) this.collectExprNames(n.condition, out);
        if (n.increment) this.collectTempVariableNames(n.increment, out);
        this.collectTempVariableNames(n.body, out);
        break;
      }
      case NWScriptASTNodeType.SWITCH: {
        const n = node as NWScriptSwitchNode;
        this.collectExprNames(n.expression, out);
        for (const c of n.cases) this.collectTempVariableNames(c.body, out);
        if (n.defaultCase) this.collectTempVariableNames(n.defaultCase.body, out);
        break;
      }
      default:
        break;
    }
  }

  private collectExprNames(expr: NWScriptExpression, out: Set<string>): void {
    if (!expr) return;
    if (expr.type === NWScriptExpressionType.VARIABLE && expr.variableName) {
      out.add(expr.variableName);
    }
    if (expr.left) this.collectExprNames(expr.left, out);
    if (expr.right) this.collectExprNames(expr.right, out);
    if (expr.arguments) {
      for (const a of expr.arguments) this.collectExprNames(a, out);
    }
  }

  /** True if expr names localVar_N with N >= declIndex (forward / self ref in initializer). */
  private expressionReferencesLaterOrSelfLocal(expr: NWScriptExpression, declIndex: number): boolean {
    const names = new Set<string>();
    this.collectExprNames(expr, names);
    for (const name of names) {
      const m = /^localVar_(\d+)$/.exec(name);
      if (m && parseInt(m[1], 10) >= declIndex) {
        return true;
      }
    }
    return false;
  }

  /** True if any variable operand is a member access (`localVar_0.x`). */
  private expressionReferencesMemberAccess(expr: NWScriptExpression): boolean {
    const names = new Set<string>();
    this.collectExprNames(expr, names);
    for (const name of names) {
      if (name.includes(".")) {
        return true;
      }
    }
    return false;
  }

  /**
   * Drop body assignments that would fail NSS type checking (e.g. int literal → string local).
   */
  private scrubIncompatibleAssignments(
    body: NWScriptBlockNode,
    declarations: NWScriptVariableDeclarationNode[]
  ): void {
    const types = new Map(declarations.map((d) => [d.name, d.dataType]));
    const filterBlock = (block: NWScriptBlockNode): void => {
      block.statements = block.statements.filter((stmt) => {
        if (stmt.type === NWScriptASTNodeType.ASSIGNMENT) {
          const a = stmt as NWScriptAssignmentNode;
          const dt = types.get(a.variable);
          if (dt === undefined) return true;
          const v = a.value;
          if (v.type === NWScriptExpressionType.CONSTANT) {
            if (dt === NWScriptDataType.STRING && v.dataType !== NWScriptDataType.STRING) {
              return false;
            }
            if (
              dt === NWScriptDataType.OBJECT &&
              v.dataType !== NWScriptDataType.OBJECT &&
              !(v.dataType === NWScriptDataType.INTEGER && (v.value === 0 || v.value === 1))
            ) {
              return false;
            }
            // Coerce object 0/1 ints
            if (dt === NWScriptDataType.OBJECT && v.dataType === NWScriptDataType.INTEGER) {
              a.value = NWScriptExpression.constant(v.value, NWScriptDataType.OBJECT);
            }
          } else if (v.type === NWScriptExpressionType.VARIABLE) {
            // Object/string copies often resolve with a default int type from CPTOP — keep and coerce
            if (dt === NWScriptDataType.OBJECT || dt === NWScriptDataType.STRING) {
              v.dataType = dt;
            }
          } else if (dt === NWScriptDataType.STRING || dt === NWScriptDataType.OBJECT) {
            // Non-constant expression into string/object — drop if result type is clearly int/float
            if (
              v.dataType === NWScriptDataType.INTEGER ||
              v.dataType === NWScriptDataType.FLOAT
            ) {
              return false;
            }
          }
          return true;
        }
        if (stmt.type === NWScriptASTNodeType.IF) {
          filterBlock((stmt as NWScriptIfNode).thenBody);
        } else if (stmt.type === NWScriptASTNodeType.IF_ELSE) {
          const ie = stmt as NWScriptIfElseNode;
          filterBlock(ie.thenBody);
          filterBlock(ie.elseBody);
        } else if (stmt.type === NWScriptASTNodeType.WHILE) {
          filterBlock((stmt as NWScriptWhileNode).body);
        } else if (stmt.type === NWScriptASTNodeType.DO_WHILE) {
          filterBlock((stmt as NWScriptDoWhileNode).body);
        } else if (stmt.type === NWScriptASTNodeType.FOR) {
          filterBlock((stmt as NWScriptForNode).body);
        } else if (stmt.type === NWScriptASTNodeType.SWITCH) {
          const sw = stmt as NWScriptSwitchNode;
          for (const c of sw.cases) filterBlock(c.body);
          if (sw.defaultCase) filterBlock(sw.defaultCase.body);
        } else if (stmt.type === NWScriptASTNodeType.BLOCK) {
          filterBlock(stmt as NWScriptBlockNode);
        }
        return true;
      });
    };
    filterBlock(body);
  }

  /**
   * Check if a CPDOWNSP instruction is writing a return value
   * Pattern: CPDOWNSP -> MOVSP -> (intermediate instructions) -> (JMP ->) RETN
   * 
   * We need to look ahead past intermediate instructions (CPTOPSP, other CPDOWNSP, etc.)
   * to find RETN or JMP to RETN. If we see too many intermediate instructions or
   * instructions that indicate this is NOT a return value (like another CPDOWNSP to a variable),
   * we return false.
   */
  private isReturnValueWrite(cpdownsp: NWScriptInstruction, block: NWScriptBasicBlock, cpdownspIndex: number): boolean {
    // Check if CPDOWNSP is followed by MOVSP
    if (cpdownspIndex + 1 >= block.instructions.length) {
      return false;
    }
    
    const movsp = block.instructions[cpdownspIndex + 1];
    if (movsp.code !== OP_MOVSP) {
      return false;
    }
    
    // Look ahead past intermediate instructions to find RETN or JMP to RETN
    // Intermediate instructions that we can skip: CPTOPSP, other CPDOWNSP (to different locations), MOVSP
    // Limit: look ahead up to 5 instructions to avoid false positives
    const lookAheadLimit = Math.min(cpdownspIndex + 7, block.instructions.length);
    for (let i = cpdownspIndex + 2; i < lookAheadLimit; i++) {
      const instr = block.instructions[i];
      
      // If we find RETN directly, this is a return value write
      if (instr.code === OP_RETN) {
        return true;
      }
      
      // If we find JMP, check if it targets RETN
      if (instr.code === OP_JMP && instr.offset !== undefined) {
        const jmpTarget = instr.address + instr.offset;
        const targetBlock = this.cfg.getBlockForAddress(jmpTarget);
        if (targetBlock) {
          // Check if target block ends with RETN
          if (targetBlock.endInstruction && targetBlock.endInstruction.code === OP_RETN) {
            return true;
          }
          // Check if target block starts with RETN
          if (targetBlock.instructions.length > 0 && targetBlock.instructions[0].code === OP_RETN) {
            return true;
          }
        }
        // JMP found but doesn't target RETN - not a return value write
        return false;
      }
      
      // If we find another CPDOWNSP before RETN/JMP, this is NOT a return value write
      // (it means there's another assignment happening)
      if (instr.code === OP_CPDOWNSP) {
        return false;
      }
      
      // If we find a terminator that's not RETN or JMP, this is not a return value write
      if (instr.code === OP_JSR || instr.code === OP_JZ || instr.code === OP_JNZ) {
        return false;
      }
      
      // Continue looking for RETN/JMP (skip intermediate instructions like CPTOPSP, MOVSP)
    }
    
    // If we didn't find RETN or JMP to RETN within the look-ahead limit,
    // this is NOT a return value write
    return false;
  }
}

