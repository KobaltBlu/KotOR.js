import type { ControlNode, BasicBlockNode, IfNode, IfElseNode, WhileNode, DoWhileNode, ForNode, SwitchNode, ExpressionRegionNode } from "@/nwscript/decompiler/NWScriptControlStructureBuilder";
import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import type { NWScriptGlobalInit } from "@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer";
import type { NWScriptLocalInit } from "@/nwscript/decompiler/NWScriptLocalVariableAnalyzer";
import type { NWScriptControlStructureBuilder } from "@/nwscript/decompiler/NWScriptControlStructureBuilder";
import { NWScriptAST, NWScriptASTNodeType, type NWScriptASTNode, type NWScriptProgramNode, type NWScriptFunctionNode, type NWScriptBlockNode, type NWScriptIfNode, type NWScriptIfElseNode, type NWScriptWhileNode, type NWScriptDoWhileNode, type NWScriptForNode, type NWScriptSwitchNode, type NWScriptSwitchCaseNode, type NWScriptSwitchDefaultNode, type NWScriptGlobalVariableDeclarationNode, type NWScriptVariableDeclarationNode } from "@/nwscript/decompiler/NWScriptAST";
import { NWScriptExpressionBuilder } from "@/nwscript/decompiler/NWScriptExpressionBuilder";
import {
  NWScriptStackSimulator,
  type NWScriptGlobalAggregateLayout,
  type NWScriptStackSnapshot,
} from "@/nwscript/decompiler/NWScriptStackSimulator";
import { NWScriptExpression, NWScriptExpressionType } from "@/nwscript/decompiler/NWScriptExpression";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { OP_RETN, OP_JMP, OP_CPDOWNSP, OP_CPDOWNBP, OP_MOVSP, OP_RSADD, OP_CPTOPSP, OP_CPTOPBP, OP_EQUAL, OP_NEQUAL, OP_GT, OP_GEQ, OP_LT, OP_LEQ, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_LOGANDII, OP_LOGORII, OP_JSR, OP_JZ, OP_JNZ, OP_CONST, OP_ACTION, OP_STORE_STATE, OP_STORE_STATEALL, OP_RESTOREBP, OP_NOP, OP_INCISP, OP_DECISP } from "@/nwscript/NWScriptOPCodes";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptANDChainDetector } from "@/nwscript/decompiler/NWScriptANDChainDetector";
import { NWScriptORChainDetector } from "@/nwscript/decompiler/NWScriptORChainDetector";
import { nwscriptDecompilerDebug, nwscriptDecompilerProfileEnabled } from "@/nwscript/decompiler/NWScriptDecompilerDebug";
import { LOGICAL_JOIN_MAX_DISTANCE } from "@/nwscript/decompiler/NWScriptShortCircuitRegion";
import {
  buildJsrCalleeArgSlotsByEntryPc,
  collectJsrReturnReservationAddresses,
  buildJsrUserRoutineMetaByEntryPc,
  instructionForwardStackSlotDelta,
  nwscriptDataTypeStackBytes,
  nwscriptParametersTotalBytes,
  type JsrUserRoutineMeta,
} from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  buildActionDoCommandThunkArgByActionAddress,
  buildAssignCommandThunkArgByActionAddress,
  buildDelayCommandThunkCalleeByActionAddress,
  type DelayCommandThunkArg,
} from "@/nwscript/decompiler/NWScriptStoreStateThunkSkip";
import { getUnaryDataType, stackSlotsForByteSize, stackSlotsForDataType, toSignedInt32 } from "@/nwscript/decompiler/NWScriptOpcodeSemantics";
import { classifyShortCircuitRegion } from "@/nwscript/decompiler/NWScriptShortCircuitRegion";

type DecompJumpHint =
  | { kind: "loop"; exit: NWScriptBasicBlock | null; header: NWScriptBasicBlock | null; increment: NWScriptBasicBlock | null }
  | { kind: "switch"; exit: NWScriptBasicBlock };

function vectorTriplesOverlap(leftStart: number, rightStart: number): boolean {
  return leftStart !== rightStart && leftStart < rightStart + 3 && rightStart < leftStart + 3;
}

/**
 * Canonical non-overlapping RSADDF triples. Size-12 CPDOWNSP stores (GetPosition rvalues)
 * win over CPTOPSP-only copies when two 12-byte float windows overlap.
 */
function partitionNonOverlappingVectorStarts(
  candidates: ReadonlyArray<{ start: number; isStore: boolean }>
): Set<number> {
  const sorted = [...candidates].sort((left, right) => {
    if (left.isStore !== right.isStore) return left.isStore ? -1 : 1;
    return left.start - right.start;
  });
  const accepted: number[] = [];
  for (const candidate of sorted) {
    if (accepted.some(start => start === candidate.start || vectorTriplesOverlap(start, candidate.start))) {
      continue;
    }
    accepted.push(candidate.start);
  }
  return new Set(accepted);
}
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
   * Used to calculate frame-relative return-value positions.
   */
  private functionEntryStackPointers: Map<NWScriptFunction | null, number> = new Map();
  
  /**
   * Track where variables live on the stack per function
   * Maps function -> stack position -> variable index
   * Key: stack position relative to the bottom of the procedure frame
   * Value: variable index in localInits array
   */
  private functionVariableStackPositions: Map<NWScriptFunction | null, Map<number, number>> = new Map();
  
  /**
   * Track variable allocations per function
   * Maps function to the number of variables allocated so far
   */
  private functionVariableCounts: Map<NWScriptFunction | null, number> = new Map();

  /** Stable local index for each RSADD site; stack positions alone can be reused by later scopes. */
  private functionVariableAllocationIndices:
    Map<NWScriptFunction | null, Map<number, number>> = new Map();

  /** Physical RSADDF triples proven by a 12-byte frame access to represent one vector local. */
  private functionVectorLocalAllocationIndices:
    Map<NWScriptFunction | null, Set<number>> = new Map();

  /** Allocation start → true when a size-12 CPDOWNSP store proved the window. */
  private functionVectorLocalStartProofs:
    Map<NWScriptFunction | null, Map<number, boolean>> = new Map();

  /** First allocation index → flattened fields for synthesized local user structs. */
  private functionStructureLocalLayouts:
    Map<NWScriptFunction | null, Map<number, NWScriptDataType[]>> = new Map();

  /** Physical global slots retain field access while whole-frame copies use one aggregate. */
  private globalVariableMap: Map<number, { name: string; dataType: NWScriptDataType }> = new Map();
  private globalAggregateLayouts: Map<number, NWScriptGlobalAggregateLayout> = new Map();

  /** Stable synthesized source name for each distinct flattened struct layout. */
  private structureTypeNames: Map<string, string> = new Map();

  /** O3 can keep a mutable scalar directly on the stack without an RSADD declaration. */
  private functionOptimizedScalarLocalSites: Map<
    NWScriptFunction,
    Map<number, {
      stackPosition: number;
      dataType: NWScriptDataType;
      initialValue: string | number;
    }>
  > = new Map();

  /** Vector frame analysis is procedure-wide and must run at most once per conversion. */
  private vectorLocalAnalysisComplete: Set<NWScriptFunction> = new Set();
  
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

  /** Caller return slots are temporaries, never source-level local declarations. */
  private jsrReturnReservationAddresses: Set<number> = new Set();

  /** Prevents emitting the same CFG basic block twice when it appears multiple times in the ControlNode tree. */
  private emittedBasicBlocksInCurrentProcedure: Set<NWScriptBasicBlock> = new Set();

  /** Headers whose BioWare `||` diamond has already been folded for this procedure. */
  private consumedShortCircuitDiamondHeaders: Set<NWScriptBasicBlock> = new Set();

  /** Guards `convertControlNode` against cyclic ControlNode trees. */
  private convertingControlNodes: Set<ControlNode> = new Set();

  /**
   * Stack state immediately after a structured condition block. Condition extraction runs on a
   * clone so it cannot replay instructions against (and corrupt) the traversal's live stack.
   */
  private conditionExitSnapshots: Map<NWScriptBasicBlock, NWScriptStackSnapshot> = new Map();

  /** Canonical exit state for every converted block, used to make later CFG arms path-sensitive. */
  private blockExitSnapshots: Map<NWScriptBasicBlock, NWScriptStackSnapshot> = new Map();

  /** Procedure entry frames and path-independent stack dataflow cache. */
  private functionEntrySnapshots: Map<NWScriptFunction, NWScriptStackSnapshot> = new Map();
  private inferredBlockEntrySnapshots: Map<NWScriptBasicBlock, NWScriptStackSnapshot> = new Map();
  private inferredBlockExitSnapshots: Map<NWScriptBasicBlock, NWScriptStackSnapshot> = new Map();
  private inferredBlockEntryFailed: Set<NWScriptBasicBlock> = new Set();
  private functionBodyBlocksByFunction: Map<NWScriptFunction, Set<NWScriptBasicBlock>> = new Map();
  private inferTempSimulator: NWScriptStackSimulator | null = null;

  /** Branch expression recovered while the owning basic block was evaluated exactly once. */
  private conditionExpressions: Map<NWScriptBasicBlock, NWScriptExpression> = new Map();

  /** Consumer ACTION PC → action expression stored by STORE_STATE/STORE_STATEALL. */
  private actionThunkArgumentByActionAddress: Map<number, NWScriptExpression | DelayCommandThunkArg> = new Map();

  /**
   * Upper bound (exclusive) for valid `localVar_i` indices when matching CPDOWNSP to RSADD slots.
   * {@link NWScriptLocalVariableAnalyzer} often under-counts (fixed −8 CPDOWNSP pattern); RSADD order in
   * this converter still records every slot in {@link functionVariableCounts}.
   */
  private getDeclaredLocalSlotCount(functionContext: NWScriptFunction | null): number {
    const fromRsadd =
      functionContext != null ? this.functionVariableCounts.get(functionContext) ?? 0 : 0;
    const fromAnalyzer = functionContext == null
      ? 0
      : this.localInits.filter(init =>
        !this.jsrReturnReservationAddresses.has(init.instructionAddress) &&
        functionContext.bodyBlocks.some(block => block.containsAddress(init.instructionAddress))
      ).length;
    return Math.max(fromAnalyzer, fromRsadd);
  }

  private getLocalInitsForFunction(
    functionContext: NWScriptFunction | null
  ): NWScriptLocalInit[] {
    if (!functionContext) return [];
    return this.localInits
      .filter(init =>
        !this.jsrReturnReservationAddresses.has(init.instructionAddress) &&
        functionContext.bodyBlocks.some(block => block.containsAddress(init.instructionAddress))
      )
      .sort((left, right) => left.instructionAddress - right.instructionAddress);
  }

  /**
   * Metadata indexed by the canonical `localVar_i` allocation order.
   *
   * The local initializer analyzer deliberately omits some non-canonical write patterns. It
   * therefore cannot be indexed directly with an ID derived from all RSADD sites: doing so
   * shifts every later type and can turn an integer INCISP target into an object or string.
   */
  private getLocalStackSlotsForFunction(
    functionContext: NWScriptFunction | null
  ): Array<{
    offset: number;
    dataType: NWScriptDataType;
    hasInitializer: boolean;
    initialValue?: any;
  }> {
    if (!functionContext) return [];
    const initsByAddress = new Map(
      this.getLocalInitsForFunction(functionContext)
        .map(init => [init.instructionAddress, init] as const)
    );
    return this.collectOrderedRsaddSitesInFunction(functionContext).map(site => {
      const init = initsByAddress.get(site.address);
      const optimized = this.functionOptimizedScalarLocalSites
        .get(functionContext)
        ?.get(site.address);
      return {
        offset: init?.offset ?? 0,
        dataType: site.dataType,
        hasInitializer: init?.hasInitializer ?? optimized !== undefined,
        initialValue: init?.initialValue ?? optimized?.initialValue,
      };
    });
  }

  /** Static SP-offset fallback using the same allocation IDs as source declarations. */
  private getLocalVariableOffsetMapForFunction(
    functionContext: NWScriptFunction
  ): Map<number, { name: string; dataType: NWScriptDataType }> {
    this.seedFunctionAllocationIndices(functionContext);
    const allocationIndices = this.functionVariableAllocationIndices.get(functionContext)!;
    const localVarMap = new Map<number, { name: string; dataType: NWScriptDataType }>();
    for (const init of this.getLocalInitsForFunction(functionContext)) {
      const index = allocationIndices.get(init.instructionAddress);
      if (index === undefined) continue;
      localVarMap.set(init.offset, {
        name: `localVar_${index}`,
        dataType: init.dataType,
      });
    }
    return localVarMap;
  }

  /**
   * True when this bytecode write has already been rendered as the initializer on a
   * source-level declaration. Expression/call initializers stay as assignments because
   * the local analyzer intentionally does not speculate about their value.
   */
  private isMaterializedDeclarationInitializer(
    functionContext: NWScriptFunction | null,
    instructionAddress: number
  ): boolean {
    return this.getLocalInitsForFunction(functionContext).some(init =>
      init.initializerWriteAddress === instructionAddress &&
      init.hasInitializer &&
      init.initialValue !== undefined
    );
  }

  private rsaddInstructionTypeToDataType(typeField: number | undefined): NWScriptDataType {
    return getUnaryDataType(typeField) ?? NWScriptDataType.INTEGER;
  }

  private registerLocalAllocation(
    functionContext: NWScriptFunction | null,
    instructionAddress: number,
    stackPosition: number
  ): number {
    let positions = this.functionVariableStackPositions.get(functionContext);
    if (!positions) {
      positions = new Map();
      this.functionVariableStackPositions.set(functionContext, positions);
    }

    let allocationIndices = this.functionVariableAllocationIndices.get(functionContext);
    if (!allocationIndices) {
      allocationIndices = new Map();
      this.functionVariableAllocationIndices.set(functionContext, allocationIndices);
    }

    let index = allocationIndices.get(instructionAddress);
    if (index === undefined) {
      index = this.functionVariableCounts.get(functionContext) ?? 0;
      allocationIndices.set(instructionAddress, index);
      this.functionVariableCounts.set(functionContext, index + 1);
    }
    positions.set(stackPosition, index);
    return index;
  }

  /**
   * Recover mutable O3 stack slots whose initial CONST replaces the usual RSADD/CPDOWNSP pair.
   * The slot is accepted only when every reachable definition at that physical depth names the
   * same scalar constant producer and an INCISP/DECISP proves that it is mutable storage.
   */
  private inferOptimizedScalarLocalSites(func: NWScriptFunction): void {
    if (this.functionOptimizedScalarLocalSites.has(func)) return;
    const recovered = new Map<number, {
      stackPosition: number;
      dataType: NWScriptDataType;
      initialValue: string | number;
    }>();
    this.functionOptimizedScalarLocalSites.set(func, recovered);

    const body = new Set(func.bodyBlocks);
    const entrySlots = nwscriptParametersTotalBytes(func.parameters) / 4 +
      (func.returnStackSlots ?? stackSlotsForDataType(func.returnType));
    const deltaFor = (instruction: NWScriptInstruction): number | null => {
      if (instruction.code === OP_JSR && instruction.offset !== undefined) {
        return -(
          this.jsrCalleeArgSlotsByEntryPc.get(
            instruction.address + toSignedInt32(instruction.offset)
          ) ?? 0
        );
      }
      return instructionForwardStackSlotDelta(instruction);
    };

    const entries = new Map<NWScriptBasicBlock, number | null>([
      [func.entryBlock, entrySlots],
    ]);
    const queue: NWScriptBasicBlock[] = [func.entryBlock];
    while (queue.length > 0) {
      const block = queue.shift()!;
      const entry = entries.get(block);
      if (entry === undefined || entry === null) continue;
      let depth = entry;
      let known = true;
      for (const instruction of block.instructions) {
        const delta = deltaFor(instruction);
        if (delta === null || depth + delta < 0) {
          known = false;
          break;
        }
        depth += delta;
      }
      if (!known) continue;
      for (const successor of this.cfg.getIntraProceduralSuccessors(block, false)) {
        if (!body.has(successor)) continue;
        const current = entries.get(successor);
        if (current === undefined) {
          entries.set(successor, depth);
          queue.push(successor);
        } else if (current !== null && current !== depth) {
          entries.set(successor, null);
        }
      }
    }

    const mutableSlots = new Set<number>();
    const constantProducers = new Map<number, NWScriptInstruction[]>();
    for (const block of func.bodyBlocks) {
      const entry = entries.get(block);
      if (entry === undefined || entry === null) continue;
      let depth = entry;
      for (const instruction of block.instructions) {
        if (
          (instruction.code === OP_INCISP || instruction.code === OP_DECISP) &&
          instruction.offset !== undefined
        ) {
          const offset = toSignedInt32(instruction.offset);
          if (offset % 4 === 0) mutableSlots.add(depth + offset / 4);
        }
        if (instruction.code === OP_CONST) {
          const producers = constantProducers.get(depth) ?? [];
          producers.push(instruction);
          constantProducers.set(depth, producers);
        }
        const delta = deltaFor(instruction);
        if (delta === null || depth + delta < 0) break;
        depth += delta;
      }
    }

    for (const slot of mutableSlots) {
      if (slot < entrySlots) continue;
      const producers = constantProducers.get(slot) ?? [];
      const unique = Array.from(new Map(
        producers.map(producer => [producer.address, producer] as const)
      ).values());
      if (unique.length !== 1) continue;
      const producer = unique[0];
      const dataType = getUnaryDataType(producer.type);
      if (
        dataType !== NWScriptDataType.INTEGER &&
        dataType !== NWScriptDataType.FLOAT &&
        dataType !== NWScriptDataType.STRING &&
        dataType !== NWScriptDataType.OBJECT
      ) continue;
      const initialValue = dataType === NWScriptDataType.INTEGER
        ? producer.integer
        : dataType === NWScriptDataType.FLOAT
          ? producer.float
          : dataType === NWScriptDataType.STRING
            ? producer.string
            : producer.object;
      if (typeof initialValue !== 'string' && typeof initialValue !== 'number') continue;
      recovered.set(producer.address, {
        stackPosition: slot * 4,
        dataType,
        initialValue,
      });
    }
  }

  private seedFunctionAllocationIndices(func: NWScriptFunction): void {
    if (this.functionVariableAllocationIndices.has(func)) return;
    this.inferOptimizedScalarLocalSites(func);
    const sites = this.collectOrderedRsaddSitesInFunction(func);
    const allocationIndices = new Map(
      sites.map((site, index) => [site.address, index])
    );
    this.functionVariableAllocationIndices.set(func, allocationIndices);
    this.functionVariableCounts.set(func, sites.length);
    let positions = this.functionVariableStackPositions.get(func);
    if (!positions) {
      positions = new Map();
      this.functionVariableStackPositions.set(func, positions);
    }
    for (const [address, site] of this.functionOptimizedScalarLocalSites.get(func) ?? []) {
      const index = allocationIndices.get(address);
      if (index !== undefined) positions.set(site.stackPosition, index);
    }
  }

  private getLocalAllocationIndicesForFunction(
    functionContext: NWScriptFunction | null
  ): Map<number, number> {
    if (!functionContext) return new Map();
    this.seedFunctionAllocationIndices(functionContext);
    return this.functionVariableAllocationIndices.get(functionContext)!;
  }

  private registerVectorLocalAtStackPosition(
    functionContext: NWScriptFunction | null,
    stackPosition: number,
    positions: Map<number, number>,
    isStore: boolean
  ): void {
    const first = positions.get(stackPosition);
    if (
      first === undefined ||
      positions.get(stackPosition + 4) !== first + 1 ||
      positions.get(stackPosition + 8) !== first + 2 ||
      this.getLocalStackSlotsForFunction(functionContext)
        .slice(first, first + 3)
        .some(slot => slot.dataType !== NWScriptDataType.FLOAT)
    ) {
      return;
    }
    this.addVectorLocalStartProof(functionContext, first, isStore);
    this.stackSimulator.setVectorLocalAllocationStarts(
      this.getVectorLocalAllocationStarts(functionContext)
    );
  }

  private addVectorLocalStartProof(
    functionContext: NWScriptFunction | null,
    start: number,
    isStore: boolean
  ): void {
    let proofs = this.functionVectorLocalStartProofs.get(functionContext);
    if (!proofs) {
      proofs = new Map();
      this.functionVectorLocalStartProofs.set(functionContext, proofs);
    }
    proofs.set(start, proofs.get(start) === true || isStore);
    this.rebuildCanonicalVectorStarts(functionContext);
  }

  private rebuildCanonicalVectorStarts(functionContext: NWScriptFunction | null): void {
    const proofs = this.functionVectorLocalStartProofs.get(functionContext) ?? new Map();
    const canonical = partitionNonOverlappingVectorStarts(
      [...proofs.entries()].map(([start, isStore]) => ({ start, isStore }))
    );
    this.functionVectorLocalAllocationIndices.set(functionContext, canonical);
    this.pruneStructureLayoutsOverlappingVectors(functionContext, canonical);
  }

  /**
   * A size-12 float store (GetPosition) is a vector local. An overlapping mixed-type copy
   * must not remain a synthesized struct that swallows the vector's first slot.
   */
  private pruneStructureLayoutsOverlappingVectors(
    functionContext: NWScriptFunction | null,
    vectorStarts: ReadonlySet<number>
  ): void {
    const layouts = this.getStructureLocalLayouts(functionContext);
    for (const [structStart, fields] of [...layouts]) {
      const structEnd = structStart + fields.length;
      const overlaps = [...vectorStarts].some(start =>
        start < structEnd && structStart < start + 3
      );
      if (overlaps) {
        layouts.delete(structStart);
      }
    }
  }

  private getVectorLocalAllocationStarts(
    functionContext: NWScriptFunction | null
  ): Set<number> {
    let starts = this.functionVectorLocalAllocationIndices.get(functionContext);
    if (!starts) {
      starts = new Set();
      this.functionVectorLocalAllocationIndices.set(functionContext, starts);
    }
    return starts;
  }

  private getStructureLocalLayouts(
    functionContext: NWScriptFunction | null
  ): Map<number, NWScriptDataType[]> {
    let layouts = this.functionStructureLocalLayouts.get(functionContext);
    if (!layouts) {
      layouts = new Map();
      this.functionStructureLocalLayouts.set(functionContext, layouts);
    }
    return layouts;
  }

  private getStructureTypeName(fieldTypes: NWScriptDataType[]): string {
    const signature = fieldTypes.join(',');
    let name = this.structureTypeNames.get(signature);
    if (!name) {
      name = `decompiled_struct_${this.structureTypeNames.size}`;
      this.structureTypeNames.set(signature, name);
    }
    return name;
  }

  /**
   * Prove vector locals before source emission.
   *
   * Runtime discovery at a 12-byte CPTOP/CPDOWN is too late when an uninitialized vector's
   * `.x/.y/.z` fields are assigned individually first. This small physical-frame dataflow tracks
   * which RSADD allocation occupies each dword and records any contiguous float triple later
   * accessed as a 12-byte value. Values/expressions are intentionally ignored; only stack shape
   * and allocation identity matter.
   */
  private precomputeVectorLocalAllocationStarts(func: NWScriptFunction): void {
    if (this.vectorLocalAnalysisComplete.has(func)) return;
    this.vectorLocalAnalysisComplete.add(func);
    this.seedFunctionAllocationIndices(func);
    const allocationIndices = this.functionVariableAllocationIndices.get(func)!;
    const localSlots = this.getLocalStackSlotsForFunction(func);
    const body = new Set(func.bodyBlocks);
    type FrameState = Array<number | null>;

    const transfer = (
      input: FrameState,
      instruction: NWScriptInstruction
    ): FrameState | null => {
      const state = [...input];
      if (instruction.code === OP_RSADD) {
        state.push(
          this.jsrReturnReservationAddresses.has(instruction.address)
            ? null
            : allocationIndices.get(instruction.address) ?? null
        );
        return state;
      }

      let delta: number | null;
      if (instruction.code === OP_JSR && instruction.offset !== undefined) {
        delta = -(
          this.jsrCalleeArgSlotsByEntryPc.get(
            instruction.address + toSignedInt32(instruction.offset)
          ) ?? 0
        );
      } else {
        delta = instructionForwardStackSlotDelta(instruction);
      }
      if (delta === null || state.length + delta < 0) return null;
      if (delta < 0) state.splice(state.length + delta, -delta);
      else for (let slot = 0; slot < delta; slot += 1) state.push(null);
      return state;
    };

    const merge = (left: FrameState, right: FrameState): FrameState | null => {
      if (left.length !== right.length) return null;
      return left.map((allocation, index) =>
        allocation === right[index] ? allocation : null
      );
    };
    const same = (left: FrameState, right: FrameState): boolean =>
      left.length === right.length &&
      left.every((allocation, index) => allocation === right[index]);

    const entrySlots =
      nwscriptParametersTotalBytes(func.parameters) / 4 +
      (func.returnStackSlots ?? stackSlotsForDataType(func.returnType));
    const entries = new Map<NWScriptBasicBlock, FrameState>([
      [
        func.entryBlock,
        new Array<number | null>(entrySlots).fill(null),
      ],
    ]);
    const queue: NWScriptBasicBlock[] = [func.entryBlock];
    while (queue.length > 0) {
      const block = queue.shift()!;
      let exit: FrameState | null = entries.get(block) ?? null;
      if (!exit) continue;
      for (const instruction of block.instructions) {
        exit = transfer(exit, instruction);
        if (!exit) break;
      }
      if (!exit) continue;
      for (const successor of this.cfg.getIntraProceduralSuccessors(block, false)) {
        if (!body.has(successor)) continue;
        const current = entries.get(successor);
        if (!current) {
          entries.set(successor, [...exit]);
          queue.push(successor);
          continue;
        }
        const merged = merge(current, exit);
        if (merged && !same(current, merged)) {
          entries.set(successor, merged);
          queue.push(successor);
        }
      }
    }

    for (const block of func.bodyBlocks) {
      let state: FrameState | null = entries.get(block) ?? null;
      if (!state) continue;
      for (const instruction of block.instructions) {
        if (
          (instruction.code === OP_CPTOPSP || instruction.code === OP_CPDOWNSP) &&
          (instruction.size ?? 0) > 4
        ) {
          const offset = toSignedInt32(instruction.offset);
          if (offset % 4 === 0) {
            const target = state.length + offset / 4;
            const first = state[target];
            const slots = (instruction.size ?? 0) / 4;
            const fieldTypes = first === null || first === undefined
              ? []
              : localSlots
                  .slice(first, first + slots)
                  .map(slot => slot.dataType);
            if (
              first !== null &&
              first !== undefined &&
              state
                .slice(target, target + slots)
                .every((allocation, field) => allocation === first + field) &&
              fieldTypes.length === slots
            ) {
              if (
                slots === 3 &&
                fieldTypes.every(dataType => dataType === NWScriptDataType.FLOAT)
              ) {
                this.addVectorLocalStartProof(func, first, instruction.code === OP_CPDOWNSP);
              } else {
                this.getStructureLocalLayouts(func).set(first, fieldTypes);
              }
            }
          }
        }
        state = transfer(state, instruction);
        if (!state) break;
      }
    }
    this.pruneStructureLayoutsOverlappingVectors(
      func,
      this.getVectorLocalAllocationStarts(func)
    );
  }

  /** Resolve one physical local slot to its source-level name, including vector fields. */
  private getLocalSlotSourceName(
    functionContext: NWScriptFunction | null,
    allocationIndex: number,
    wholeAggregate = false
  ): string {
    for (const vectorStart of this.getVectorLocalAllocationStarts(functionContext)) {
      if (allocationIndex >= vectorStart && allocationIndex < vectorStart + 3) {
        if (wholeAggregate) {
          return `localVar_${vectorStart}`;
        }
        const component = ['x', 'y', 'z'][allocationIndex - vectorStart];
        return `localVar_${vectorStart}.${component}`;
      }
    }
    for (const [structureStart, fields] of this.getStructureLocalLayouts(functionContext)) {
      if (
        allocationIndex >= structureStart &&
        allocationIndex < structureStart + fields.length
      ) {
        const field = allocationIndex - structureStart;
        return wholeAggregate && allocationIndex === structureStart
          ? `localVar_${structureStart}`
          : `localVar_${structureStart}.field_${field}`;
      }
    }
    return `localVar_${allocationIndex}`;
  }

  /** Reinterpret flattened physical fields when the surrounding ABI supplies nominal type. */
  private expressionForExpectedType(
    expression: NWScriptExpression | undefined,
    expectedType: NWScriptDataType
  ): NWScriptExpression | undefined {
    if (
      expression?.type === NWScriptExpressionType.AGGREGATE &&
      expectedType === NWScriptDataType.VECTOR &&
      expression.components.length === 3
    ) {
      return NWScriptExpression.vector(expression.components);
    }
    return expression;
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
        if (
          instr.code === OP_RSADD &&
          !this.jsrReturnReservationAddresses.has(instr.address)
        ) {
          out.push({
            address: instr.address,
            dataType: this.rsaddInstructionTypeToDataType(instr.type),
          });
        }
      }
    }
    for (const [address, site] of this.functionOptimizedScalarLocalSites.get(func) ?? []) {
      out.push({ address, dataType: site.dataType });
    }
    return out.sort((left, right) => left.address - right.address);
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
    
    // Stack and expression recovery share NWScriptStackSimulator's canonical opcode semantics.
    this.stackSimulator = new NWScriptStackSimulator();
    this.andChainDetector = new NWScriptANDChainDetector();
    this.orChainDetector = new NWScriptORChainDetector();

    this.jsrCalleeArgSlotsByEntryPc = buildJsrCalleeArgSlotsByEntryPc(functions, cfg.script);
    this.jsrUserRoutineMetaByEntryPc = buildJsrUserRoutineMetaByEntryPc(functions);
    this.jsrReturnReservationAddresses = collectJsrReturnReservationAddresses(functions, cfg.script);
    this.stackSimulator.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    this.stackSimulator.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);

    this.actionThunkArgumentByActionAddress = buildDelayCommandThunkCalleeByActionAddress(
      cfg.script,
      functions,
      (instr) =>
        instr.actionDefinition?.name === "DelayCommand" || instr.action === 7
    );
    for (const [address, expression] of buildActionDoCommandThunkArgByActionAddress(cfg.script, functions)) {
      this.actionThunkArgumentByActionAddress.set(address, expression);
    }
    for (const [address, expression] of buildAssignCommandThunkArgByActionAddress(cfg.script, functions)) {
      this.actionThunkArgumentByActionAddress.set(address, expression);
    }
    this.stackSimulator.setActionThunkArgumentByActionAddress(
      this.actionThunkArgumentByActionAddress
    );
    
    this.buildBlockToFunctionMap();
    this.inferGlobalAggregateLayouts();
    this.setupVariableMappings();
  }

  private createTempStackSimulator(
    functionContext: NWScriptFunction | null = null
  ): NWScriptStackSimulator {
    const s = new NWScriptStackSimulator();
    s.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    s.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    s.setGlobalVariables(this.globalVariableMap);
    s.setGlobalAggregateLayouts(this.globalAggregateLayouts);
    s.setVariableTypeObserver(this.parameterTypeObserver(functionContext));
    return s;
  }

  private createConfiguredTempStackSimulator(
    functionContext: NWScriptFunction | null,
    entry: NWScriptStackSnapshot
  ): NWScriptStackSimulator {
    const simulator = this.createTempStackSimulator(functionContext);
    this.configureTempStackSimulator(simulator, functionContext, entry);
    return simulator;
  }

  private configureTempStackSimulator(
    simulator: NWScriptStackSimulator,
    functionContext: NWScriptFunction | null,
    entry: NWScriptStackSnapshot
  ): void {
    if (functionContext) {
      simulator.setFunctionParameters(functionContext.parameters);
    }
    simulator.setGlobalVariables(this.stackSimulator.getGlobalVariables());
    simulator.setGlobalAggregateLayouts(this.globalAggregateLayouts);
    simulator.setLocalVariables(this.stackSimulator.getLocalVariables());
    simulator.setVariableStackPositions(
      this.functionVariableStackPositions.get(functionContext) ?? new Map()
    );
    simulator.setLocalVariableAllocationIndices(
      this.getLocalAllocationIndicesForFunction(functionContext)
    );
    simulator.setLocalVariableInits(this.getLocalStackSlotsForFunction(functionContext));
    simulator.setVectorLocalAllocationStarts(
      this.getVectorLocalAllocationStarts(functionContext)
    );
    simulator.setStructureLocalLayouts(
      this.getStructureLocalLayouts(functionContext)
    );
    simulator.setActionThunkArgumentByActionAddress(
      this.actionThunkArgumentByActionAddress
    );
    simulator.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    simulator.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    simulator.restoreStackSnapshot(entry);
  }

  private getFunctionBodyBlocks(functionContext: NWScriptFunction): Set<NWScriptBasicBlock> {
    let body = this.functionBodyBlocksByFunction.get(functionContext);
    if (!body) {
      body = new Set(functionContext.bodyBlocks);
      this.functionBodyBlocksByFunction.set(functionContext, body);
    }
    return body;
  }

  private simulateBlockExit(
    functionContext: NWScriptFunction | null,
    entry: NWScriptStackSnapshot,
    block: NWScriptBasicBlock
  ): NWScriptStackSnapshot {
    if (!this.inferTempSimulator) {
      this.inferTempSimulator = this.createTempStackSimulator(functionContext);
    }
    this.configureTempStackSimulator(this.inferTempSimulator, functionContext, entry);
    for (const instruction of block.instructions) {
      this.inferTempSimulator.processInstruction(instruction);
    }
    return this.inferTempSimulator.takeStackSnapshot();
  }

  private recoverStoreStateThunk(
    storeState: NWScriptInstruction,
    functionContext: NWScriptFunction | null
  ): void {
    const visited = new Set<number>();
    const recover = (
      nestedStoreState: NWScriptInstruction,
      entry: NWScriptStackSnapshot
    ): void => {
      if (visited.has(nestedStoreState.address)) return;
      visited.add(nestedStoreState.address);

      const jump = nestedStoreState.nextInstr;
      if (!jump || jump.code !== OP_JMP || jump.offset === undefined) return;
      const targetAddress = jump.address + toSignedInt32(jump.offset);
      let consumer = this.cfg.script.instructions.get(targetAddress);
      while (consumer && consumer.code !== OP_RETN) {
        if (
          consumer.code === OP_ACTION &&
          consumer.actionDefinition?.args.includes(NWScriptDataType.ACTION)
        ) {
          break;
        }
        consumer = consumer.nextInstr;
      }
      if (
        !consumer ||
        consumer.code !== OP_ACTION ||
        !consumer.actionDefinition?.args.includes(NWScriptDataType.ACTION)
      ) {
        return;
      }

      const simulator = this.createConfiguredTempStackSimulator(functionContext, entry);
      let recovered: NWScriptExpression | null = null;
      let instruction = jump.nextInstr;
      while (instruction && instruction.address < targetAddress) {
        if (
          instruction.code === OP_STORE_STATE ||
          instruction.code === OP_STORE_STATEALL
        ) {
          recover(instruction, simulator.takeStackSnapshot());
          simulator.setActionThunkArgumentByActionAddress(
            this.actionThunkArgumentByActionAddress
          );
        }
        const expression = simulator.processInstruction(instruction);
        if (expression?.type === NWScriptExpressionType.FUNCTION_CALL) {
          recovered = expression;
        }
        instruction = instruction.nextInstr;
      }
      if (recovered) {
        this.actionThunkArgumentByActionAddress.set(consumer.address, recovered);
        this.stackSimulator.setActionThunkArgumentByActionAddress(
          this.actionThunkArgumentByActionAddress
        );
      }
    };

    recover(storeState, this.stackSimulator.takeStackSnapshot());
  }

  private createTempExpressionBuilder(
    functionContext: NWScriptFunction | null = null
  ): NWScriptExpressionBuilder {
    const e = new NWScriptExpressionBuilder();
    e.setJsrCalleeArgSlotsByEntryPc(this.jsrCalleeArgSlotsByEntryPc);
    e.setJsrUserRoutineMetaByEntryPc(this.jsrUserRoutineMetaByEntryPc);
    e.setGlobalVariables(this.globalVariableMap);
    e.setGlobalAggregateLayouts(this.globalAggregateLayouts);
    e.setVariableTypeObserver(this.parameterTypeObserver(functionContext));
    return e;
  }

  private parameterTypeObserver(
    functionContext: NWScriptFunction | null
  ): ((name: string, dataType: NWScriptDataType) => void) | undefined {
    if (!functionContext) return undefined;
    return (name, dataType) => {
      const parameter = functionContext.parameters.find(candidate => candidate.name === name);
      if (!parameter || parameter.dataType === dataType) return;
      if (
        parameter.dataType === NWScriptDataType.INTEGER &&
        stackSlotsForDataType(parameter.dataType) === stackSlotsForDataType(dataType)
      ) {
        // Keep the existing identifier stable: statements already emitted earlier in this
        // procedure may refer to it, and parameter names have no semantic type requirement.
        parameter.dataType = dataType;
      }
    };
  }

  /** Consume JZ/JNZ only when the canonical stack actually holds the recovered condition. */
  private consumeStructuredCondition(
    conditionNode: ControlNode,
    condition: NWScriptExpression
  ): void {
    if (conditionNode.type !== 'basic_block' || !conditionNode.block.conditionInstruction) {
      return;
    }

    const simulatedExit = this.conditionExitSnapshots.get(conditionNode.block);
    if (simulatedExit) {
      this.stackSimulator.restoreStackSnapshot(simulatedExit);
      return;
    }

    const top = this.stackSimulator.peek();
    if (
      top?.slotWidth === 1 &&
      top.expression.dataType === condition.dataType &&
      top.expression.toNSS() === condition.toNSS()
    ) {
      this.stackSimulator.processInstruction(conditionNode.block.conditionInstruction);
    }
  }

  private convertBranchFromSnapshot(
    node: ControlNode,
    functionContext: NWScriptFunction | null,
    entry: NWScriptStackSnapshot
  ): { body: NWScriptBlockNode; exit: NWScriptStackSnapshot } {
    this.stackSimulator.restoreStackSnapshot(entry);
    const body = this.convertControlNodeToBlock(node, functionContext);
    return { body, exit: this.stackSimulator.takeStackSnapshot() };
  }

  private restoreControlFlowJoin(
    exits: NWScriptStackSnapshot[],
    context: string,
    fallback: NWScriptStackSnapshot
  ): void {
    const merged = this.stackSimulator.mergeStackSnapshots(exits, context, fallback);
    this.stackSimulator.restoreStackSnapshot(merged);
  }

  /**
   * Setup variable mappings for expression builder and stack simulator
   */
  private inferGlobalAggregateLayouts(): void {
    this.globalAggregateLayouts.clear();
    const initByOffset = new Map(
      this.globalInits.map(init => [toSignedInt32(init.offset), init] as const)
    );
    const candidates = new Map<number, NWScriptGlobalAggregateLayout>();

    for (const init of this.globalInits) {
      const slots = init.initializerStackSlots ?? 0;
      const expression = init.initialExpression;
      if (!expression || slots <= 1) continue;
      const startOffset = toSignedInt32(init.offset);
      const firstIndex = this.globalInits.indexOf(init);
      if (expression.dataType === NWScriptDataType.VECTOR && slots === 3) {
        candidates.set(startOffset, {
          name: `globalVar_${firstIndex}`,
          dataType: NWScriptDataType.VECTOR,
          fieldTypes: [
            NWScriptDataType.FLOAT,
            NWScriptDataType.FLOAT,
            NWScriptDataType.FLOAT,
          ],
        });
      } else if (
        expression.dataType === NWScriptDataType.STRUCTURE &&
        expression.structureFieldTypes.length === slots
      ) {
        candidates.set(startOffset, {
          name: `globalVar_${firstIndex}`,
          dataType: NWScriptDataType.STRUCTURE,
          fieldTypes: expression.structureFieldTypes,
        });
      }
    }

    for (const func of this.functions) {
      for (const block of func.bodyBlocks) {
        for (const instruction of block.instructions) {
          if (
            (instruction.code !== OP_CPTOPBP && instruction.code !== OP_CPDOWNBP) ||
            (instruction.size ?? 0) <= 4 ||
            (instruction.size ?? 0) % 4 !== 0 ||
            instruction.offset === undefined
          ) {
            continue;
          }

          const startOffset = toSignedInt32(instruction.offset);
          const slots = (instruction.size ?? 0) / 4;
          const isFormalAccess = func.parameters.some(parameter =>
            !parameter.resolvedViaSpOperand &&
            parameter.offset === startOffset &&
            (parameter.stackSlots ?? stackSlotsForDataType(parameter.dataType)) === slots
          );
          if (isFormalAccess) continue;

          const fields = Array.from({ length: slots }, (_, field) =>
            initByOffset.get(startOffset + field * 4)
          );
          if (fields.some(field => field === undefined)) continue;

          const fieldTypes = fields.map(field => field!.dataType);
          const firstIndex = this.globalInits.indexOf(fields[0]!);
          const dataType = slots === 3 && fieldTypes.every(type => type === NWScriptDataType.FLOAT)
            ? NWScriptDataType.VECTOR
            : NWScriptDataType.STRUCTURE;
          const current = candidates.get(startOffset);
          if (!current || current.fieldTypes.length < slots) {
            candidates.set(startOffset, {
              name: `globalVar_${firstIndex}`,
              dataType,
              fieldTypes,
            });
          }
        }
      }
    }

    const claimedOffsets = new Set<number>();
    for (const [startOffset, candidate] of Array.from(candidates.entries()).sort(
      ([left], [right]) => left - right
    )) {
      const offsets = candidate.fieldTypes.map((_, field) => startOffset + field * 4);
      if (offsets.some(offset => claimedOffsets.has(offset))) continue;
      this.globalAggregateLayouts.set(startOffset, candidate);
      offsets.forEach(offset => claimedOffsets.add(offset));
    }
  }

  private buildGlobalVariableMap(): Map<number, { name: string; dataType: NWScriptDataType }> {
    const result = new Map<number, { name: string; dataType: NWScriptDataType }>();
    for (let index = 0; index < this.globalInits.length; index++) {
      const init = this.globalInits[index];
      const offset = toSignedInt32(init.offset);
      const aggregateEntry = Array.from(this.globalAggregateLayouts.entries()).find(
        ([start, layout]) =>
          offset >= start && offset < start + layout.fieldTypes.length * 4
      );
      if (!aggregateEntry) {
        result.set(offset, { name: `globalVar_${index}`, dataType: init.dataType });
        continue;
      }

      const [start, aggregate] = aggregateEntry;
      const field = (offset - start) / 4;
      const suffix = aggregate.dataType === NWScriptDataType.VECTOR
        ? `.${['x', 'y', 'z'][field]}`
        : `.field_${field}`;
      result.set(offset, {
        name: `${aggregate.name}${suffix}`,
        dataType: aggregate.fieldTypes[field] ?? init.dataType,
      });
    }
    return result;
  }

  private setupVariableMappings(): void {
    this.globalVariableMap = this.buildGlobalVariableMap();
    this.stackSimulator.setGlobalVariables(this.globalVariableMap);
    this.stackSimulator.setGlobalAggregateLayouts(this.globalAggregateLayouts);
    
    // Setup local variables (per function)
    // This will be done per-function when processing
  }

  /**
   * Set function parameters for stack-aware expression recovery.
   */
  private setFunctionParametersForBuilders(func: NWScriptFunction): void {
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
      // `continue` often lands on a tiny trampoline block that only JMPs to the header.
      if (h.header != null && this.blockIsContinueTrampolineTo(target, h.header)) {
        return "continue";
      }
      // while/do-while: continue may land on the latch (incr + JMP header), not the header.
      if (h.header != null && this.blockIsLoopLatchContinueTarget(target, h.header)) {
        return "continue";
      }
    }

    return null;
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
    const dest = this.cfg.getBlockForAddress(end.address + toSignedInt32(end.offset));
    return dest === header;
  }

  /**
   * True when {@code block} is a while/do-while latch that continues the loop: it JMPs to
   * {@code header} (possibly after incr/CPDOWN).
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
        const dest = this.cfg.getBlockForAddress(ins.address + toSignedInt32(ins.offset));
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
   * True when {@code body} is a single break or continue (possibly wrapped in nested empty blocks).
   */
  private blockIsSoleJumpStatement(
    body: NWScriptBlockNode,
    kind: NWScriptASTNodeType.BREAK | NWScriptASTNodeType.CONTINUE
  ): boolean {
    let stmts = body.statements;
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
    if (nwscriptDecompilerProfileEnabled()) {
      console.log(`[NWScriptDecompiler] ast functions=${this.functions.length}`);
    }
    const functionNodes = this.buildFunctionNodes(structureBuilder, mainControlNode);

    // Function conversion can contribute aggregate type evidence, so emit globals afterwards.
    const globalVars = this.buildGlobalVariableDeclarations();
    
    // Main body should only be used if there's code outside of functions
    // For now, we'll leave it undefined since all code is in functions
    const mainBody: NWScriptBlockNode | undefined = undefined;
    
    // Create program node
    const structs = Array.from(this.structureTypeNames.entries()).map(
      ([signature, name]) => ({
        name,
        fields: signature.split(',').filter(Boolean).map((encoded, field) => ({
          name: `field_${field}`,
          type: Number.parseInt(encoded, 10) as NWScriptDataType,
        })),
      })
    );
    const program = NWScriptAST.createProgram(
      globalVars,
      functionNodes,
      mainBody,
      structs
    );
    
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
      this.consumedShortCircuitDiamondHeaders.clear();
      this.convertingControlNodes.clear();

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
      const entrySp = this.stackSimulator.initializeFunctionFrame(
        functionContext.returnType,
        functionContext.parameters,
        functionContext.returnStackSlots,
        functionContext.returnStructureFieldTypes
      );
      this.functionEntryStackPointers.set(functionContext, entrySp);
      this.functionEntrySnapshots.set(
        functionContext,
        this.stackSimulator.takeStackSnapshot()
      );
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
    if (this.convertingControlNodes.has(controlNode)) {
      return;
    }
    this.convertingControlNodes.add(controlNode);
    try {
    switch (controlNode.type) {
      case 'basic_block':
        nwscriptDecompilerDebug(`[ControlNode] Processing basic_block node, block ID: ${controlNode.block.id}, instructions: ${controlNode.block.instructions.length}`);
        this.convertBasicBlock(controlNode, functionContext, statements);
        break;
      
      case 'if':
        const ifNode = controlNode as IfNode;
        if (ifNode.condition.type === 'basic_block') {
          this.convertBasicBlock(ifNode.condition, functionContext, statements);
        }
        if (this.tryConvertShortCircuitValueIf(ifNode, functionContext, statements)) {
          break;
        }
        if (
          ifNode.condition.type === 'basic_block' &&
          this.tryConsumeShortCircuitDiamond(
            ifNode.condition.block,
            functionContext,
            statements
          )
        ) {
          // The recovered `if` wraps a compiler diamond. Fold the value, then convert
          // remaining body nodes (the source `if (lhs || rhs)` and anything after it).
          this.convertControlNode(ifNode.body, functionContext, statements);
          break;
        }
        statements.push(this.convertIfNode(controlNode, functionContext));
        break;

      case 'if_else':
        if (controlNode.condition.type === 'basic_block') {
          this.convertBasicBlock(controlNode.condition, functionContext, statements);
        }
        if (
          controlNode.condition.type === 'basic_block' &&
          this.tryConsumeShortCircuitDiamond(
            controlNode.condition.block,
            functionContext,
            statements
          )
        ) {
          this.convertControlNode(controlNode.thenBody, functionContext, statements);
          this.convertControlNode(controlNode.elseBody, functionContext, statements);
          break;
        }
        statements.push(this.convertIfElseNode(controlNode, functionContext));
        break;

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
        this.convertSwitchWithPrelude(controlNode, functionContext, statements);
        break;

      case 'sequence':
        // Convert each node in sequence
        nwscriptDecompilerDebug(`[ControlNode] Processing sequence node with ${controlNode.nodes.length} nodes`);
        for (let i = 0; i < controlNode.nodes.length; i++) {
          nwscriptDecompilerDebug(`[ControlNode] Sequence node ${i + 1}/${controlNode.nodes.length}: ${controlNode.nodes[i].type}`);
          this.convertControlNode(controlNode.nodes[i], functionContext, statements);
        }
        break;

      case 'expression_region':
        this.convertExpressionRegion(controlNode, functionContext, statements);
        break;
    }
    } finally {
      this.convertingControlNodes.delete(controlNode);
    }
  }

  /**
   * Compiler-generated `lhs && rhs` uses a conditional block whose fallthrough body ends in
   * LOGANDII. It computes a value; it is not a source-level `if`. Preserve that value on the
   * simulated stack and consume a following OR diamond when present.
   */
  private tryConvertShortCircuitValueIf(
    node: IfNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): boolean {
    if (node.condition.type !== 'basic_block') {
      return false;
    }
    const region = this.findShortCircuitAndValueRegion(node.condition.block);
    if (!region) return false;

    const excluded = new Set<NWScriptBasicBlock>();
    for (const block of region.blocks) {
      if (block.conditionInstruction?.code !== OP_JNZ || block.successors.size !== 2) continue;
      const branches = Array.from(block.successors);
      const orJoin = this.findShortCircuitJoin(branches[0], branches[1], OP_LOGORII);
      if (!orJoin) continue;
      const bypass = this.findShortCircuitBypass(branches[0], orJoin) ??
        this.findShortCircuitBypass(branches[1], orJoin);
      if (bypass) {
        for (const bypassBlock of bypass) excluded.add(bypassBlock);
      }
    }

    // Simulate the expression-producing fallthrough path. Conditional copies are consumed by
    // their JZ/JNZ, nested joins apply LOGANDII/LOGORII, and no source statement is emitted for
    // the compiler-only diamonds. Their common join remains for the enclosing source condition.
    for (const block of region.blocks
      .filter(block => !excluded.has(block))
      .sort((left, right) => left.startInstruction.address - right.startInstruction.address)) {
      this.convertBasicBlock({ type: 'basic_block', block }, functionContext, statements);
    }
    for (const block of excluded) {
      this.blockStatements.set(block, []);
      this.emittedBasicBlocksInCurrentProcedure.add(block);
    }
    return true;
  }

  /** Locate the forward CFG region that computes `lhs && rhs` before the JZ bypass join. */
  private findShortCircuitAndValueRegion(
    header: NWScriptBasicBlock
  ): { join: NWScriptBasicBlock; blocks: NWScriptBasicBlock[] } | undefined {
    const branch = header.conditionInstruction;
    if (branch?.code !== OP_JZ || branch.offset === undefined || header.successors.size !== 2) {
      return undefined;
    }
    const conditionIndex = header.instructions.indexOf(branch);
    const duplicate = conditionIndex > 0 ? header.instructions[conditionIndex - 1] : undefined;
    if (duplicate?.code !== OP_CPTOPSP && duplicate?.code !== OP_CPTOPBP) {
      return undefined;
    }

    const join = this.cfg.getBlockForAddress(branch.address + toSignedInt32(branch.offset));
    if (!join || !header.successors.has(join)) return undefined;
    const fallthrough = Array.from(header.successors).find(successor => successor !== join);
    if (!fallthrough) return undefined;

    const blocks = new Set<NWScriptBasicBlock>();
    const queued = new Set<NWScriptBasicBlock>([fallthrough]);
    const queue = [fallthrough];
    const joinAddress = join.startInstruction.address;
    while (queue.length > 0) {
      const block = queue.shift()!;
      if (block === join || blocks.has(block)) continue;
      if (block.startInstruction.address >= joinAddress) return undefined;
      blocks.add(block);
      for (const successor of this.cfg.getIntraProceduralSuccessors(block, false)) {
        if (
          successor !== join &&
          !this.cfg.isBackEdge(block, successor) &&
          !blocks.has(successor) &&
          !queued.has(successor)
        ) {
          queued.add(successor);
          queue.push(successor);
        }
      }
    }
    if (blocks.size === 0) return undefined;

    const finalCombine = Array.from(blocks).some(block =>
      block.instructions.some(instruction => instruction.code === OP_LOGANDII) &&
      this.cfg.getIntraProceduralSuccessors(block, false).includes(join)
    );
    if (!finalCombine) return undefined;

    return { join, blocks: Array.from(blocks) };
  }

  /** Return a source-order block list only for a genuinely linear ControlNode region. */
  private getLinearBasicBlocks(node: ControlNode): NWScriptBasicBlock[] | null {
    if (node.type === 'basic_block') return [node.block];
    if (node.type === 'expression_region') return [...node.evaluateBlocks];
    if (node.type !== 'sequence') return null;
    const result: NWScriptBasicBlock[] = [];
    for (const child of node.nodes) {
      const blocks = this.getLinearBasicBlocks(child);
      if (!blocks) return null;
      result.push(...blocks);
    }
    return result;
  }

  /**
   * Consume a compiler-only `&&` / `||` value region. Dummy bypass arms are never source
   * `if`s. The logical join is left unconverted so the following condition can combine
   * `[lhs, rhs]`.
   */
  private consumeShortCircuitRegion(
    header: NWScriptBasicBlock,
    evaluateBlocks: NWScriptBasicBlock[],
    bypassBlocks: NWScriptBasicBlock[],
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): void {
    for (const block of bypassBlocks) {
      this.blockStatements.set(block, []);
      this.emittedBasicBlocksInCurrentProcedure.add(block);
    }
    for (const block of evaluateBlocks) {
      this.convertBasicBlock({ type: 'basic_block', block }, functionContext, statements);
    }
    this.consumedShortCircuitDiamondHeaders.add(header);
  }

  private convertExpressionRegion(
    node: ExpressionRegionNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): void {
    if (this.consumedShortCircuitDiamondHeaders.has(node.header)) {
      return;
    }
    this.consumeShortCircuitRegion(
      node.header,
      node.evaluateBlocks,
      node.bypassBlocks,
      functionContext,
      statements
    );
  }

  /**
   * Consume the two-arm value diamond emitted for `lhs || rhs` / `lhs && rhs`.
   * The logical join is left unconverted so the following source `if`/`while`
   * can combine `[lhs, rhs]` itself.
   */
  private tryConsumeShortCircuitDiamond(
    header: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): boolean {
    if (this.consumedShortCircuitDiamondHeaders.has(header)) {
      return false;
    }
    const region = classifyShortCircuitRegion(this.cfg, header);
    if (!region) {
      return false;
    }
    this.consumeShortCircuitRegion(
      region.header,
      region.evaluateBlocks,
      region.bypassBlocks,
      functionContext,
      statements
    );
    return true;
  }

  /**
   * Recognize the compiler-only arm of a short-circuit OR diamond. The arm may be
   * split into several basic blocks, but it can only copy the existing boolean value
   * and jump to the logical join.
   *
   * BioWare nwnnsscomp emits a dummy `CPTOPSP; JZ join` rather than `CPTOPSP; JMP join`.
   * The JZ is unreachable on that arm (`lhs` is already known to be nonzero), so it is
   * only a pop of the extra copy; rhs still falls through to LOGORII.
   */
  private findShortCircuitBypass(
    start: NWScriptBasicBlock,
    join: NWScriptBasicBlock
  ): Set<NWScriptBasicBlock> | undefined {
    const blocks = new Set<NWScriptBasicBlock>();
    let block: NWScriptBasicBlock | undefined = start;
    let sawCopy = false;

    while (block && block !== join) {
      if (blocks.has(block)) return undefined;
      blocks.add(block);

      const condition = block.conditionInstruction;
      const isDummyJoinBranch =
        condition != null &&
        (condition.code === OP_JZ || condition.code === OP_JNZ) &&
        this.conditionalJumpTargets(block, condition).includes(join);

      for (const instruction of block.instructions) {
        if (instruction.code === OP_JMP) continue;
        if (isDummyJoinBranch && instruction === condition) continue;
        if (instruction.code !== OP_CPTOPSP && instruction.code !== OP_CPTOPBP) {
          return undefined;
        }
        sawCopy = true;
      }

      const successors = this.cfg.getIntraProceduralSuccessors(block, false)
        .filter(successor => !this.cfg.isBackEdge(block!, successor));
      if (isDummyJoinBranch) {
        return sawCopy ? blocks : undefined;
      }
      if (condition || successors.length !== 1) return undefined;
      block = successors[0];
    }

    return block === join && sawCopy ? blocks : undefined;
  }

  private conditionalJumpTargets(
    block: NWScriptBasicBlock,
    condition: NWScriptInstruction
  ): NWScriptBasicBlock[] {
    const targets: NWScriptBasicBlock[] = [];
    const taken = this.cfg.getBlockForAddress(
      condition.address + toSignedInt32(condition.offset)
    );
    if (taken) targets.push(taken);
    for (const successor of this.cfg.getIntraProceduralSuccessors(block, false)) {
      if (!this.cfg.isBackEdge(block, successor) && !targets.includes(successor)) {
        targets.push(successor);
      }
    }
    return targets;
  }

  private findShortCircuitJoin(
    left: NWScriptBasicBlock,
    right: NWScriptBasicBlock,
    logicalOpcode: number
  ): NWScriptBasicBlock | undefined {
    const startsWithLogical = (block: NWScriptBasicBlock): boolean => {
      const first = block.instructions.find(instruction => instruction.code !== OP_NOP);
      return first?.code === logicalOpcode;
    };
    const distances = (start: NWScriptBasicBlock): Map<NWScriptBasicBlock, number> => {
      const result = new Map<NWScriptBasicBlock, number>([[start, 0]]);
      const queue = [start];
      while (queue.length > 0) {
        const block = queue.shift()!;
        if (block.isExit || block.exitType === 'return') {
          continue;
        }
        const distance = result.get(block)!;
        if (distance >= LOGICAL_JOIN_MAX_DISTANCE) {
          continue;
        }
        for (const successor of this.cfg.getIntraProceduralSuccessors(block, false)) {
          if (this.cfg.isBackEdge(block, successor) || result.has(successor)) continue;
          result.set(successor, distance + 1);
          queue.push(successor);
        }
      }
      return result;
    };
    const fromLeft = distances(left);
    const fromRight = distances(right);
    return Array.from(fromLeft.keys())
      .filter(block => fromRight.has(block) && startsWithLogical(block))
      .sort((a, b) =>
        (fromLeft.get(a)! + fromRight.get(a)!) -
        (fromLeft.get(b)! + fromRight.get(b)!)
      )[0];
  }

  private stackShapesMatch(
    left: NWScriptStackSnapshot,
    right: NWScriptStackSnapshot
  ): boolean {
    return left.stackPointer === right.stackPointer &&
      left.basePointer === right.basePointer &&
      left.stack.length === right.stack.length &&
      left.stack.every((item, index) => item.slotWidth === right.stack[index].slotWidth);
  }

  /** Derive a block entry from the acyclic CFG path rooted at the procedure frame. */
  private inferBlockEntrySnapshot(
    block: NWScriptBasicBlock,
    functionContext: NWScriptFunction,
    visiting: Set<NWScriptBasicBlock>
  ): NWScriptStackSnapshot | undefined {
    const cached = this.inferredBlockEntrySnapshots.get(block);
    if (cached) return cached;
    if (this.inferredBlockEntryFailed.has(block)) return undefined;

    if (block === functionContext.entryBlock) {
      return this.functionEntrySnapshots.get(functionContext);
    }

    const functionBlocks = this.getFunctionBodyBlocks(functionContext);
    const incoming = this.cfg.getIntraProceduralPredecessors(block)
      .filter(predecessor =>
        functionBlocks.has(predecessor) &&
        !this.cfg.isBackEdge(predecessor, block)
      )
      .map(predecessor =>
        this.inferBlockExitSnapshot(predecessor, functionContext, visiting)
      )
      .filter((snapshot): snapshot is NWScriptStackSnapshot => snapshot !== undefined);
    if (incoming.length === 0) {
      this.inferredBlockEntryFailed.add(block);
      return undefined;
    }

    const reference = incoming[0];
    if (!incoming.every(snapshot => this.stackShapesMatch(snapshot, reference))) {
      this.inferredBlockEntryFailed.add(block);
      return undefined;
    }
    const merged = this.stackSimulator.mergeStackSnapshots(
      incoming,
      `block ${block.id} inferred entry`,
      reference
    );
    this.inferredBlockEntrySnapshots.set(block, merged);
    return merged;
  }

  /** Simulate a block on inferred input without changing AST traversal state. */
  private inferBlockExitSnapshot(
    block: NWScriptBasicBlock,
    functionContext: NWScriptFunction,
    visiting: Set<NWScriptBasicBlock>
  ): NWScriptStackSnapshot | undefined {
    const cached = this.inferredBlockExitSnapshots.get(block);
    if (cached) return cached;
    if (visiting.has(block)) return undefined;
    visiting.add(block);
    try {
      const entry = this.inferBlockEntrySnapshot(block, functionContext, visiting);
      if (!entry) return undefined;
      const exit = this.simulateBlockExit(functionContext, entry, block);
      this.inferredBlockExitSnapshots.set(block, exit);
      return exit;
    } catch {
      return undefined;
    } finally {
      visiting.delete(block);
    }
  }

  /**
   * Control-node recovery can leave sibling arms in a flat sequence. In that case the
   * live simulator contains the previous sibling's cleanup state, not this block's
   * incoming state. Restore the CFG-derived entry only when physical shapes disagree;
   * equal-shaped explicit branch snapshots keep their more precise path expressions.
   */
  private restoreProvenBlockEntry(
    block: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null
  ): void {
    let expected = functionContext
      ? this.inferBlockEntrySnapshot(block, functionContext, new Set())
      : undefined;

    if (!expected) {
      const incoming = this.cfg.getIntraProceduralPredecessors(block)
        .map(predecessor => this.blockExitSnapshots.get(predecessor))
        .filter((snapshot): snapshot is NWScriptStackSnapshot => snapshot !== undefined);
      const reference = incoming[0];
      if (
        reference &&
        incoming.every(snapshot => this.stackShapesMatch(snapshot, reference))
      ) {
        expected = this.stackSimulator.mergeStackSnapshots(
          incoming,
          `block ${block.id} entry`,
          reference
        );
      }
    }

    if (!expected) return;
    const current = this.stackSimulator.takeStackSnapshot();
    if (!this.stackShapesMatch(current, expected)) {
      this.stackSimulator.restoreStackSnapshot(expected);
    }
  }

  /**
   * Reconstruct the minimum physical frame required by a compiler-generated return epilogue.
   *
   * A structured traversal may visit a shared RETN block after an unrelated sibling arm. The
   * live value stack can consequently be shallower than the bytecode frame even when every CFG
   * path is valid. Pure MOVSP/RESTOREBP/NOP/RETN blocks contain no source expressions, so their
   * missing values can be recovered from the procedure ABI without inventing source semantics.
   * All other blocks retain strict underflow checking.
   */
  private restoreCompilerEpilogueFrame(
    block: NWScriptBasicBlock,
    functionContext: NWScriptFunction | null
  ): void {
    if (!functionContext || block.instructions.at(-1)?.code !== OP_RETN) return;
    if (!block.instructions.every(instruction =>
      instruction.code === OP_MOVSP ||
      instruction.code === OP_RESTOREBP ||
      instruction.code === OP_NOP ||
      instruction.code === OP_RETN
    )) return;

    let cleanupSlots = 0;
    for (const instruction of block.instructions) {
      if (instruction.code !== OP_MOVSP) continue;
      const offset = toSignedInt32(instruction.offset);
      if (offset > 0) return;
      cleanupSlots += stackSlotsForByteSize(Math.abs(offset), 'compiler epilogue MOVSP');
    }

    const returnSlots =
      functionContext.returnStackSlots ??
      stackSlotsForDataType(functionContext.returnType);
    const requiredSlots = cleanupSlots + returnSlots;
    if (this.stackSimulator.getStackSlotCount() >= requiredSlots) return;

    const entry = this.functionEntrySnapshots.get(functionContext);
    if (!entry) return;

    const stack: NWScriptStackSnapshot['stack'] = [];
    if (returnSlots > 0) {
      stack.push({
        expression: NWScriptExpression.unknown(
          'compiler epilogue return-value reservation',
          functionContext.returnType
        ),
        address: block.startInstruction.address,
        slotWidth: returnSlots,
      });
    }
    for (let slot = 0; slot < cleanupSlots; slot++) {
      stack.push({
        expression: NWScriptExpression.unknown('compiler epilogue frame slot'),
        address: block.startInstruction.address,
        slotWidth: 1,
      });
    }

    this.stackSimulator.restoreStackSnapshot({
      stack,
      stackPointer: requiredSlots * 4,
      basePointer: entry.basePointer,
    });
    nwscriptDecompilerDebug(
      `[Block] Reconstructed ${requiredSlots}-slot ABI frame for return epilogue ${block.id}`
    );
  }

  /**
   * Convert a basic block to AST statements
   */
  private convertBasicBlock(
    blockNode: BasicBlockNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[],
    throughAddress?: number
  ): void {
    const block = blockNode.block;

    // Check if we've already processed this block
    if (this.blockStatements.has(block)) {
      if (this.emittedBasicBlocksInCurrentProcedure.has(block)) {
        return;
      }
      this.emittedBasicBlocksInCurrentProcedure.add(block);
      statements.push(...this.blockStatements.get(block)!);
      return;
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
      const entrySp = this.stackSimulator.initializeFunctionFrame(
        functionContext.returnType,
        functionContext.parameters,
        functionContext.returnStackSlots,
        functionContext.returnStructureFieldTypes
      );
      this.functionEntryStackPointers.set(functionContext, entrySp);
      this.functionEntrySnapshots.set(
        functionContext,
        this.stackSimulator.takeStackSnapshot()
      );
    }

    this.restoreProvenBlockEntry(block, functionContext);
    this.restoreCompilerEpilogueFrame(block, functionContext);
    
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
    this.stackSimulator.setLocalVariableAllocationIndices(
      this.getLocalAllocationIndicesForFunction(functionContext)
    );
    this.stackSimulator.setLocalVariableInits(
      this.getLocalStackSlotsForFunction(functionContext)
    );
    this.stackSimulator.setVectorLocalAllocationStarts(
      this.getVectorLocalAllocationStarts(functionContext)
    );
    this.stackSimulator.setStructureLocalLayouts(
      this.getStructureLocalLayouts(functionContext)
    );
    
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
      if (throughAddress !== undefined && instruction.address > throughAddress) {
        break;
      }

      if (
        instruction.code === OP_STORE_STATE ||
        instruction.code === OP_STORE_STATEALL
      ) {
        this.recoverStoreStateThunk(instruction, functionContext);
      }

      // Track variable allocations (RSADD reserves space for a variable)
      // IMPORTANT: Do this BEFORE processing the instruction, so we capture the stack position
      // where the variable will live (before RSADD pushes the default value)
      let isRsadd = false;
      if (
        instruction.code === OP_RSADD &&
        !this.jsrReturnReservationAddresses.has(instruction.address)
      ) {
        isRsadd = true;
        // RSADD pushes a default value onto the stack (0, 0.0, '', etc.)
        // The variable lives at the current stack position (before RSADD executes)
        // After RSADD, SP moves up by 4, and the variable is at the old SP position
        const stackPosBeforeRsadd = this.stackSimulator.getStackPointer();
        const variableIndex = this.registerLocalAllocation(
          functionContext,
          instruction.address,
          stackPosBeforeRsadd
        );
        
        nwscriptDecompilerDebug(`[RSADD] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${stackPosBeforeRsadd}, Variable index: ${variableIndex}, Function: ${functionContext?.name || 'main'}`);
        
        // Update the canonical simulator's variable position map.
        this.stackSimulator.setVariableStackPositions(variableStackPositions);
        
        nwscriptDecompilerDebug(`[RSADD] Recorded variable ${variableIndex} at stack position ${stackPosBeforeRsadd}`);
        nwscriptDecompilerDebug(`[RSADD] Variable stack positions map:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
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
        if (instruction.size === 12) {
          this.registerVectorLocalAtStackPosition(
            functionContext,
            cpdownspTargetPos,
            variableStackPositions,
            true
          );
        }
        nwscriptDecompilerDebug(`[CPDOWNSP-PRE] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${cpdownspSpBefore}, Offset: ${offsetSigned}, Target pos: ${cpdownspTargetPos}`);
      }

      if (instruction.code === OP_CPTOPSP && instruction.size === 12) {
        this.registerVectorLocalAtStackPosition(
          functionContext,
          this.stackSimulator.getStackPointer() + toSignedInt32(instruction.offset),
          variableStackPositions,
          false
        );
      }
      
      // Process instruction through stack simulator
      // This ensures the stack state is correct when we check for return values
      const expr = this.stackSimulator.processInstruction(instruction);

      if (
        (instruction.code === OP_JZ || instruction.code === OP_JNZ) &&
        expr
      ) {
        this.conditionExpressions.set(block, expr);
      }

      if (
        instruction.code === OP_MOVSP &&
        instruction.prevInstr?.code !== OP_CPDOWNSP &&
        instruction.prevInstr?.code !== OP_CPDOWNBP
      ) {
        for (const discarded of this.stackSimulator.getDiscardedExpressions()) {
          if (discarded.type === NWScriptExpressionType.FUNCTION_CALL) {
            blockStatements.push(NWScriptAST.createExpressionStatement(discarded));
          }
        }
      }
      
      // Skip creating statements for RSADD (it's just variable allocation)
      if (isRsadd) {
        continue;
      }

      if (instruction.code === OP_JMP && instruction.offset !== undefined) {
        const targetAddr = instruction.address + toSignedInt32(instruction.offset);
        const targetBlock = this.cfg.getBlockForAddress(targetAddr);
        const jumpKind = this.classifyStructuredJumpTarget(targetBlock);
        if (jumpKind === "continue" && blockNode.suppressTerminalLoopJump) {
          continue;
        }
        if (jumpKind === "break") {
          blockStatements.push(NWScriptAST.createBreak());
          continue;
        }
        if (jumpKind === "continue") {
          blockStatements.push(NWScriptAST.createContinue());
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
          const returnValueFramePos = entrySP + returnValueOffset;

          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Return value frame position: ${entrySP} + ${returnValueOffset} = ${returnValueFramePos}`);
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] CPDOWNSP frame target position: ${cpdownspTargetPos}`);
          nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] Current SP: ${cpdownspSpBefore}, CPDOWNSP offset: ${instruction.offset ? (instruction.offset > 0x7FFFFFFF ? instruction.offset - 0x100000000 : instruction.offset) : 'undefined'}`);
          
          if (cpdownspTargetPos === returnValueFramePos) {
            nwscriptDecompilerDebug(`[RETURN-DETECT] ✓ MATCH! Address: 0x${instruction.address.toString(16).padStart(8, '0')}, Current SP: ${cpdownspSpBefore}, Target pos: ${cpdownspTargetPos}, Entry SP: ${entrySP}, Return offset: ${returnValueOffset}`);
            
            // Get the return value expression from the stack
            returnValueExpr = this.expressionForExpectedType(
              expr ?? this.stackSimulator.peek()?.expression,
              functionContext.returnType
            );
            nwscriptDecompilerDebug(`[RETURN-DETECT] Stack top expression: ${returnValueExpr ? returnValueExpr.toNSS() : 'undefined'}`);
            
            const allowReturnValueStatement =
              functionContext !== null &&
              functionContext.returnType !== NWScriptDataType.VOID;

            // Create the return statement immediately (not wait for RETN)
            if (returnValueExpr && allowReturnValueStatement) {
              isReturnWrite = true;
              this.returnValueExpressions.set(block, returnValueExpr);
              blockStatements.push(NWScriptAST.createReturn(returnValueExpr));
              nwscriptDecompilerDebug(`[RETURN-DETECT] ✓ Created return statement with expression: ${returnValueExpr.toNSS()}`);
            } else {
              nwscriptDecompilerDebug(`[RETURN-DETECT] ✗ WARNING: No expression on stack for return value`);
            }
          } else {
            nwscriptDecompilerDebug(`[RETURN-DETECT-CHECK] ✗ No match: CPDOWNSP frame target ${cpdownspTargetPos} !== return position ${returnValueFramePos}`);
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
          returnValueExpr = this.expressionForExpectedType(
            expr ?? this.stackSimulator.peek()?.expression,
            functionContext?.returnType ?? NWScriptDataType.INTEGER
          );
          const allowReturnValueStatement =
            functionContext !== null &&
            functionContext.returnType !== NWScriptDataType.VOID;
          nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, target pos: ${cpdownspTargetPos} not mapped to local, block leads to return -> treating as return write`);
          if (returnValueExpr && allowReturnValueStatement) {
            isReturnWrite = true;
            this.returnValueExpressions.set(block, returnValueExpr);
            blockStatements.push(NWScriptAST.createReturn(returnValueExpr));
            nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] ✓ Created return statement with expression: ${returnValueExpr.toNSS()}`);
          } else {
            nwscriptDecompilerDebug(`[RETURN-DETECT-FLOW] ✗ WARNING: No expression on stack for return value`);
          }
        }
      }
      
      // Check for special instructions
      if (instruction.code === OP_RETN) {
        // RETN just tells the program to return to the address after the last JSR
        // The actual return statement was already created when we saw the CPDOWNSP
        // But if we didn't see a CPDOWNSP (void function), we still need to create a return
        if (!isReturnWrite && !returnValueExpr) {
          // Void return (no value)
          blockStatements.push(NWScriptAST.createReturn(undefined));
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
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Address: 0x${instruction.address.toString(16).padStart(8, '0')}, SP before: ${cpdownspSpBefore}, Offset: ${instruction.offset ? ((instruction.offset > 0x7FFFFFFF ? instruction.offset - 0x100000000 : instruction.offset)) : 0} (0x${instruction.offset?.toString(16)}), Target pos: ${targetStackPos}`);
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Stack size after: ${this.stackSimulator.getStackSize()}, Has expr: ${!!expr}`);
        
        // Get the expression from the stack (CPDOWNSP copies from top of stack)
        // The instruction was already processed at line 501, so use that result
        const valueExpr = expr || this.stackSimulator.peek()?.expression;
        
        if (!valueExpr) {
          nwscriptDecompilerDebug(`[CPDOWNSP] No expression found - skipping assignment`);
          // No value to assign - skip
          continue;
        }

        if (this.isMaterializedDeclarationInitializer(functionContext, instruction.address)) {
          continue;
        }
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Expression type: ${valueExpr.type}, Value: ${JSON.stringify(valueExpr).substring(0, 100)}`);
        nwscriptDecompilerDebug(`[CPDOWNSP] Variable stack positions map:`, Array.from(variableStackPositions.entries()).map(([pos, idx]) => `pos ${pos} -> var ${idx}`).join(', '));
        
        // Look up which variable lives at this stack position
        const varIndex = this.stackSimulator.getLocalVariableIndexAtStackPosition(targetStackPos);
        
        nwscriptDecompilerDebug(`[CPDOWNSP] Looking up variable at position ${targetStackPos}: found index ${varIndex}`);
        
        const slotCap = this.getDeclaredLocalSlotCount(functionContext);
        if (
          instruction.size !== undefined &&
          instruction.size > 4 &&
          valueExpr.type === NWScriptExpressionType.AGGREGATE
        ) {
          const targetIndices = valueExpr.components.map((_, component) =>
            this.stackSimulator.getLocalVariableIndexAtStackPosition(
              targetStackPos + component * 4
            )
          );
          if (targetIndices.every((index): index is number =>
            index !== undefined && index >= 0 && index < slotCap
          )) {
            for (let component = 0; component < targetIndices.length; component += 1) {
              blockStatements.push(NWScriptAST.createAssignment(
                this.getLocalSlotSourceName(functionContext, targetIndices[component]),
                valueExpr.components[component],
                false
              ));
            }
            continue;
          }
        }
        if (varIndex !== undefined && varIndex >= 0 && varIndex < slotCap) {
          // This is an assignment to a local variable
          const varName = this.getLocalSlotSourceName(
            functionContext,
            varIndex,
            (instruction.size ?? 4) > 4
          );
          nwscriptDecompilerDebug(`[CPDOWNSP] ✓ Creating assignment: ${varName} = <expression>`);
          blockStatements.push(NWScriptAST.createAssignment(varName, valueExpr, false));
          continue;
        }
        
        nwscriptDecompilerDebug(`[CPDOWNSP] ✗ No variable found for assignment at position ${targetStackPos}`);
        continue;
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
        if (
          instruction.code === OP_CPDOWNBP &&
          expr.type === NWScriptExpressionType.AGGREGATE &&
          expr.components.every(component => component.type === NWScriptExpressionType.ASSIGNMENT)
        ) {
          for (const assignment of expr.components) {
            blockStatements.push(NWScriptAST.createExpressionStatement(assignment));
          }
          continue;
        }
        // Direct frame mutations (CPDOWNBP, INC/DEC) are complete source statements.
        if (expr.type === NWScriptExpressionType.ASSIGNMENT) {
          blockStatements.push(NWScriptAST.createExpressionStatement(expr));
          continue;
        }
        if (
          expr.type === NWScriptExpressionType.UNARY_OP &&
          (expr.operator === '++' || expr.operator === '--' ||
            expr.operator === 'post++' || expr.operator === 'post--')
        ) {
          blockStatements.push(NWScriptAST.createExpressionStatement(expr));
          continue;
        }

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
          // Void calls complete immediately. Non-void calls stay in the value stack and are
          // emitted only if a later MOVSP explicitly discards their unused result.
          if (expr.dataType === NWScriptDataType.VOID) {
            blockStatements.push(NWScriptAST.createExpressionStatement(expr));
          }
        }
        // For other expression types, be conservative and skip them
        // Most expressions are intermediate values
      }
    }
    
    // Cache the statements
    const exitSnapshot = this.stackSimulator.takeStackSnapshot();
    this.blockExitSnapshots.set(block, exitSnapshot);
    if (block.conditionInstruction) {
      this.conditionExitSnapshots.set(block, exitSnapshot);
    }
    this.blockStatements.set(block, blockStatements);
    this.emittedBasicBlocksInCurrentProcedure.add(block);
    statements.push(...blockStatements);
  }

  /**
   * Convert IfNode to AST
   */
  private convertIfNode(node: IfNode, functionContext: NWScriptFunction | null): NWScriptIfNode {
    // NOTE: Pre-condition instructions (RSADD, CPDOWNSP, etc.) are already processed
    // in convertControlNode before this method is called. We only need to extract the condition.
    // DO NOT process the header block again here - it would duplicate work and corrupt stack state.
    
    nwscriptDecompilerDebug(`[convertIfNode] Extracting condition from if node, condition type: ${node.condition.type}`);
    
    // Extract condition from condition block
    // The stack state should already be correct from pre-condition processing
    let condition = this.extractConditionFromBlock(node.condition, functionContext, node);
    if (node.invertCondition) {
      condition = NWScriptExpression.unaryOp('!', condition, NWScriptDataType.INTEGER);
    }
    
    nwscriptDecompilerDebug(`[convertIfNode] Initial condition extracted, type: ${condition.type}`);
    if (condition.type === 'variable') {
      nwscriptDecompilerDebug(`[convertIfNode] Variable name: ${condition.variableName}`);
    } else if (condition.type === 'comparison') {
      nwscriptDecompilerDebug(`[convertIfNode] Comparison operator: ${condition.operator}`);
    } else if (condition.type === 'logical') {
      nwscriptDecompilerDebug(`[convertIfNode] Logical operator: ${condition.operator}`);
    }
    
    // Check if the body contains LOGANDII / LOGORII that combines with the outer condition (short-circuit chains)
    let actualBodyNode: ControlNode = node.body;
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

    this.consumeStructuredCondition(node.condition, condition);
    const branchEntry = this.stackSimulator.takeStackSnapshot();
    const thenBranch = this.convertBranchFromSnapshot(actualBodyNode, functionContext, branchEntry);
    const thenBody = thenBranch.body;
    this.restoreControlFlowJoin(
      [branchEntry, thenBranch.exit],
      `if block ${node.condition.type === 'basic_block' ? node.condition.block.id : 'unknown'} join`,
      branchEntry
    );
    
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
    // Extract condition from condition block
    let condition = this.extractConditionFromBlock(node.condition, functionContext);
    if (node.invertCondition) {
      condition = NWScriptExpression.unaryOp('!', condition, NWScriptDataType.INTEGER);
    }
    
    // Check if we need to look at predecessor blocks for cross-block AND chains
    // This handles cases where the LOGANDII is in a previous block
    if (
      node.condition.type === 'basic_block' &&
      !this.conditionExpressions.has(node.condition.block)
    ) {
      const headerBlock = node.condition.block;
      let foundCombinedCondition = false;
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
                foundCombinedCondition = true;
                break;
              }
            }
          }
          if (foundCombinedCondition) {
            break; // Found and set combined condition
          }
        }
      }
    }
    
    this.consumeStructuredCondition(node.condition, condition);
    const branchEntry = this.stackSimulator.takeStackSnapshot();
    const thenBranch = this.convertBranchFromSnapshot(node.thenBody, functionContext, branchEntry);
    const elseBranch = this.convertBranchFromSnapshot(node.elseBody, functionContext, branchEntry);
    const thenBody = thenBranch.body;
    const elseBody = elseBranch.body;
    this.restoreControlFlowJoin(
      [thenBranch.exit, elseBranch.exit],
      `if/else block ${node.condition.type === 'basic_block' ? node.condition.block.id : 'unknown'} join`,
      branchEntry
    );
    
    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === 'basic_block' ? node.condition.block : undefined;

    // Break-bounded while latch: `if (n > N) break; else continue;` is fallthrough to the
    // loop back-edge; source usually only writes the break arm.
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
    const condition = this.convertAndExtractLoopCondition(
      node.condition,
      functionContext,
      []
    );
    const loopEntry = this.stackSimulator.takeStackSnapshot();

    let body: NWScriptBlockNode;
    let bodyExit: NWScriptStackSnapshot;

    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === "basic_block" ? node.condition.block : undefined;

    this.pushLoopJumpHints(node);
    try {
      const branch = this.convertBranchFromSnapshot(node.body, functionContext, loopEntry);
      body = branch.body;
      bodyExit = branch.exit;
    } finally {
      this.popJumpHint();
    }

    this.restoreControlFlowJoin([loopEntry, bodyExit!], 'while loop join', loopEntry);

    return NWScriptAST.createWhile(condition, body, headerBlock);
  }

  /**
   * Convert DoWhileNode to AST
   */
  private convertDoWhileNode(node: DoWhileNode, functionContext: NWScriptFunction | null): NWScriptDoWhileNode {
    const loopEntry = this.stackSimulator.takeStackSnapshot();
    let body: NWScriptBlockNode;

    // Get header block for metadata (if condition is a basic block)
    const headerBlock = node.condition.type === "basic_block" ? node.condition.block : undefined;

    this.pushLoopJumpHints(node);
    try {
      body = this.convertBranchFromSnapshot(node.body, functionContext, loopEntry).body;
    } finally {
      this.popJumpHint();
    }

    // A do/while condition executes after the first body iteration.
    const conditionPrefixStatements: NWScriptASTNode[] = [];
    const condition = this.convertAndExtractLoopCondition(
      node.condition,
      functionContext,
      conditionPrefixStatements
    );
    if (conditionPrefixStatements.length > 0) {
      body.statements.push(...conditionPrefixStatements);
      // createBlock aliases children and statements; replace children after mutation so
      // the post-test prefix is represented exactly once.
      body.children = [...body.statements];
    }
    const loopExit = this.stackSimulator.takeStackSnapshot();
    this.restoreControlFlowJoin([loopEntry, loopExit], 'do/while loop join', loopExit);

    // Note: createDoWhile signature is: (body, condition, headerBlock?)
    return NWScriptAST.createDoWhile(body, condition, headerBlock);
  }

  /**
   * Convert ForNode to AST
   */
  private convertForNode(node: ForNode, functionContext: NWScriptFunction | null): NWScriptForNode {
    const init = node.init ? this.convertControlNodeToBlock(node.init, functionContext) : undefined;

    const condition = this.convertAndExtractLoopCondition(
      node.condition,
      functionContext,
      []
    );
    const loopEntry = this.stackSimulator.takeStackSnapshot();

    const headerBlock =
      node.condition.type === "basic_block" ? node.condition.block : undefined;

    let body: NWScriptBlockNode;
    let increment: NWScriptBlockNode | undefined;

    this.pushLoopJumpHints(node);
    try {
      body = this.convertBranchFromSnapshot(node.body, functionContext, loopEntry).body;
      increment = node.increment
        ? this.convertControlNodeToBlock(node.increment, functionContext)
        : undefined;
    } finally {
      this.popJumpHint();
    }

    const iterationExit = this.stackSimulator.takeStackSnapshot();
    this.restoreControlFlowJoin([loopEntry, iterationExit], 'for loop join', loopEntry);

    return NWScriptAST.createFor(body, init, condition, increment, headerBlock);
  }

  /** Execute every block in a split short-circuit condition and read the final branch value. */
  private convertAndExtractLoopCondition(
    conditionNode: ControlNode,
    functionContext: NWScriptFunction | null,
    prefixStatements: NWScriptASTNode[]
  ): NWScriptExpression {
    const blocks = this.getLinearBasicBlocks(conditionNode);
    if (!blocks || blocks.length === 0) {
      return NWScriptExpression.unknown('loop condition is not a linear bytecode region');
    }
    for (const block of blocks) {
      this.convertBasicBlock({ type: 'basic_block', block }, functionContext, prefixStatements);
    }
    const terminal = [...blocks].reverse().find(block => block.conditionInstruction);
    if (!terminal) {
      return NWScriptExpression.unknown('loop condition has no conditional branch');
    }
    return this.extractConditionFromBlock(
      { type: 'basic_block', block: terminal },
      functionContext
    );
  }

  /**
   * Emit switch-header side effects (e.g. `nRandom = Random(...)`) once, then the switch.
   */
  private convertSwitchWithPrelude(
    node: SwitchNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): void {
    const expression = this.emitSwitchPrelude(node, functionContext, statements);
    statements.push(this.convertSwitchNode(node, functionContext, expression));
  }

  private emitSwitchPrelude(
    node: SwitchNode,
    functionContext: NWScriptFunction | null,
    statements: NWScriptASTNode[]
  ): NWScriptExpression {
    const headerBlock =
      node.expression.type === "basic_block" ? node.expression.block : undefined;
    const producer = node.discriminantInstruction;
    const producerBlock = producer
      ? this.cfg.getBlockForAddress(producer.address) ?? undefined
      : headerBlock;

    if (producerBlock) {
      this.convertBasicBlock(
        { type: 'basic_block', block: producerBlock },
        functionContext,
        statements,
        producer?.address
      );
    }

    for (const dispatch of node.switchDispatchBlocks ?? []) {
      if (dispatch === producerBlock || dispatch === headerBlock) {
        continue;
      }
      this.blockStatements.set(dispatch, []);
      this.emittedBasicBlocksInCurrentProcedure.add(dispatch);
    }

    const peeked = this.stackSimulator.peek()?.expression;
    if (peeked) {
      return peeked;
    }
    if (producer) {
      return this.extractExpressionUpToInstruction(producer, functionContext);
    }
    return this.extractExpressionFromBlock(node.expression, functionContext);
  }

  /**
   * Convert SwitchNode to AST
   */
  private convertSwitchNode(
    node: SwitchNode,
    functionContext: NWScriptFunction | null,
    expression: NWScriptExpression
  ): NWScriptSwitchNode {
    const headerBlock =
      node.expression.type === "basic_block" ? node.expression.block : undefined;

    const branchEntry = this.stackSimulator.takeStackSnapshot();

    this.pushSwitchJumpHints(node);
    try {
      const cases: NWScriptSwitchCaseNode[] = [];
      const exits: NWScriptStackSnapshot[] = [];
      for (const switchCase of node.cases) {
        const branch = this.convertBranchFromSnapshot(
          switchCase.body,
          functionContext,
          branchEntry
        );
        const caseBody = branch.body;
        exits.push(branch.exit);
        const caseValueExpr = NWScriptExpression.constant(
          switchCase.value,
          NWScriptDataType.INTEGER
        );
        cases.push(NWScriptAST.createSwitchCase(caseValueExpr, caseBody));
      }

      let defaultCase: NWScriptSwitchDefaultNode | undefined;
      if (node.defaultCase) {
        const branch = this.convertBranchFromSnapshot(
          node.defaultCase,
          functionContext,
          branchEntry
        );
        exits.push(branch.exit);
        defaultCase = NWScriptAST.createSwitchDefault(branch.body);
      } else {
        exits.push(branchEntry);
      }

      this.restoreControlFlowJoin(exits, 'switch join', branchEntry);

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
    if (conditionNode.type === 'basic_block' && conditionNode.block.conditionInstruction) {
      const block = conditionNode.block;
      const alreadyRecovered = this.conditionExpressions.get(block);
      if (alreadyRecovered) {
        return alreadyRecovered;
      }
      const conditionInstruction = block.conditionInstruction;
      const entry = this.stackSimulator.takeStackSnapshot();
      const simulator = this.createConfiguredTempStackSimulator(functionContext, entry);
      let condition: NWScriptExpression | null = null;

      for (const instruction of block.instructions) {
        if (instruction === conditionInstruction) {
          condition = simulator.peek()?.expression ?? null;
        }
        simulator.processInstruction(instruction);
        if (instruction === conditionInstruction) {
          break;
        }
      }

      this.conditionExitSnapshots.set(block, simulator.takeStackSnapshot());
      if (condition) {
        return condition;
      }
      return NWScriptExpression.unknown(
        `condition block ${block.id} did not produce a branch value`
      );
    }

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
          this.andChainDetector.setGlobalVariables(this.globalVariableMap);
          
          const localVarMap = this.getLocalVariableOffsetMapForFunction(functionContext);
          this.andChainDetector.setLocalVariables(localVarMap);

          this.orChainDetector.setFunctionParameters(functionContext.parameters);
          this.orChainDetector.setGlobalVariables(this.globalVariableMap);
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
                  const hasLogAndII = bodyBlock.instructions.some((instr: NWScriptInstruction) => instr.code === OP_LOGANDII);
                  nwscriptDecompilerDebug(`[extractConditionFromBlock] Body block ${bodyBlock.id} has LOGANDII in instruction list: ${hasLogAndII}`);
                  
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
                    
                    const tempStackSim = this.createTempStackSimulator(functionContext);
                    if (functionContext) {
                      tempStackSim.setFunctionParameters(functionContext.parameters);
                    }
                    tempStackSim.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                    tempStackSim.setLocalVariables(this.stackSimulator.getLocalVariables());
                    // Use the existing variable stack positions map
                    tempStackSim.setVariableStackPositions(varStackPositions);
                    tempStackSim.setLocalVariableAllocationIndices(
                      this.getLocalAllocationIndicesForFunction(functionContext)
                    );
                    const functionLocalInits = this.getLocalInitsForFunction(functionContext);
                    const functionLocalSlots = this.getLocalStackSlotsForFunction(functionContext);
                    tempStackSim.setLocalVariableInits(functionLocalSlots);
                    tempStackSim.setVectorLocalAllocationStarts(
                      this.getVectorLocalAllocationStarts(functionContext)
                    );
                    tempStackSim.setStructureLocalLayouts(
                      this.getStructureLocalLayouts(functionContext)
                    );
                    
                    const tempExprBuilder = this.createTempExpressionBuilder(functionContext);
                    if (functionContext) {
                      tempExprBuilder.setFunctionParameters(functionContext.parameters);
                    }
                    tempExprBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                    tempExprBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
                    // Use the existing variable stack positions map
                    tempExprBuilder.setVariableStackPositions(varStackPositions);
                    tempExprBuilder.setLocalVariableAllocationIndices(
                      this.getLocalAllocationIndicesForFunction(functionContext)
                    );
                    tempExprBuilder.setLocalVariableInits(functionLocalSlots);
                    tempExprBuilder.setVectorLocalAllocationStarts(
                      this.getVectorLocalAllocationStarts(functionContext)
                    );
                    tempExprBuilder.setStructureLocalLayouts(
                      this.getStructureLocalLayouts(functionContext)
                    );
                    
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
                      
                      const bodyStackSim = this.createTempStackSimulator(functionContext);
                      if (functionContext) {
                        bodyStackSim.setFunctionParameters(functionContext.parameters);
                      }
                      bodyStackSim.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                      bodyStackSim.setLocalVariables(this.stackSimulator.getLocalVariables());
                      // Use the existing variable stack positions map (same as tempStackSim)
                      bodyStackSim.setVariableStackPositions(varStackPositions);
                      bodyStackSim.setLocalVariableAllocationIndices(
                        this.getLocalAllocationIndicesForFunction(functionContext)
                      );
                      bodyStackSim.setLocalVariableInits(functionLocalSlots);
                      bodyStackSim.setVectorLocalAllocationStarts(
                        this.getVectorLocalAllocationStarts(functionContext)
                      );
                      bodyStackSim.setStructureLocalLayouts(
                        this.getStructureLocalLayouts(functionContext)
                      );
                      
                      // Re-process all instructions from the start to get the correct stack state
                      // This ensures MOVSP and other stack manipulation instructions are tracked
                      for (let i = 0; i <= equalInstrIndex; i++) {
                        const instr = block.instructions[i];
                        bodyStackSim.processInstruction(instr);
                      }
                      
                      const bodyExprBuilder = this.createTempExpressionBuilder(functionContext);
                      if (functionContext) {
                        bodyExprBuilder.setFunctionParameters(functionContext.parameters);
                      }
                      bodyExprBuilder.setGlobalVariables(this.stackSimulator.getGlobalVariables());
                      bodyExprBuilder.setLocalVariables(this.stackSimulator.getLocalVariables());
                      // Use the existing variable stack positions map
                      bodyExprBuilder.setVariableStackPositions(varStackPositions);
                      bodyExprBuilder.setLocalVariableAllocationIndices(
                        this.getLocalAllocationIndicesForFunction(functionContext)
                      );
                      bodyExprBuilder.setLocalVariableInits(functionLocalSlots);
                      bodyExprBuilder.setVectorLocalAllocationStarts(
                        this.getVectorLocalAllocationStarts(functionContext)
                      );
                      bodyExprBuilder.setStructureLocalLayouts(
                        this.getStructureLocalLayouts(functionContext)
                      );
                      
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
        const tempExprBuilder = this.createTempExpressionBuilder(functionContext);
        if (functionContext) {
          tempExprBuilder.setFunctionParameters(functionContext.parameters);
          tempExprBuilder.setGlobalVariables(this.globalVariableMap);
          
          const localVarMap = this.getLocalVariableOffsetMapForFunction(functionContext);
          tempExprBuilder.setLocalVariables(localVarMap);
        }
        
        // Get variable stack positions for this function
        const variableStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map();
        tempExprBuilder.setVariableStackPositions(variableStackPositions);
        tempExprBuilder.setLocalVariableAllocationIndices(
          this.getLocalAllocationIndicesForFunction(functionContext)
        );
        tempExprBuilder.setLocalVariableInits(
          this.getLocalStackSlotsForFunction(functionContext)
        );
        tempExprBuilder.setVectorLocalAllocationStarts(
          this.getVectorLocalAllocationStarts(functionContext)
        );
        tempExprBuilder.setStructureLocalLayouts(
          this.getStructureLocalLayouts(functionContext)
        );
        
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
    
    return NWScriptExpression.unknown('unable to recover structured condition');
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
    const tempExprBuilder = this.createTempExpressionBuilder(functionContext);
    if (functionContext) {
      tempExprBuilder.setFunctionParameters(functionContext.parameters);
      tempExprBuilder.setGlobalVariables(this.globalVariableMap);
      
      const localVarMap = this.getLocalVariableOffsetMapForFunction(functionContext);
      tempExprBuilder.setLocalVariables(localVarMap);
    }
    
    // Get variable stack positions for this function
    const variableStackPositions = this.functionVariableStackPositions.get(functionContext) || new Map();
    tempExprBuilder.setVariableStackPositions(variableStackPositions);
    tempExprBuilder.setLocalVariableAllocationIndices(
      this.getLocalAllocationIndicesForFunction(functionContext)
    );
    tempExprBuilder.setLocalVariableInits(
      this.getLocalStackSlotsForFunction(functionContext)
    );
    tempExprBuilder.setVectorLocalAllocationStarts(
      this.getVectorLocalAllocationStarts(functionContext)
    );
    tempExprBuilder.setStructureLocalLayouts(
      this.getStructureLocalLayouts(functionContext)
    );
    
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

    const tempExprBuilder = this.createTempExpressionBuilder(functionContext);
    if (functionContext) {
      tempExprBuilder.setFunctionParameters(functionContext.parameters);
      tempExprBuilder.setGlobalVariables(this.globalVariableMap);

      const localVarMap = this.getLocalVariableOffsetMapForFunction(functionContext);
      tempExprBuilder.setLocalVariables(localVarMap);
    }

    const variableStackPositions =
      this.functionVariableStackPositions.get(functionContext) || new Map();
    tempExprBuilder.setVariableStackPositions(variableStackPositions);
    tempExprBuilder.setLocalVariableAllocationIndices(
      this.getLocalAllocationIndicesForFunction(functionContext)
    );
    tempExprBuilder.setLocalVariableInits(
      this.getLocalStackSlotsForFunction(functionContext)
    );
    tempExprBuilder.setVectorLocalAllocationStarts(
      this.getVectorLocalAllocationStarts(functionContext)
    );
    tempExprBuilder.setStructureLocalLayouts(
      this.getStructureLocalLayouts(functionContext)
    );

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
      sp = nwscriptParametersTotalBytes(fc.parameters) +
        nwscriptDataTypeStackBytes(fc.returnType);
      this.functionEntryStackPointers.set(fc, sp);
    }

    const map = new Map<number, number>();
    this.functionVariableStackPositions.set(fc, map);

    let cur: NWScriptInstruction | null | undefined = fc.entryBlock.startInstruction;
    const visited = new Set<number>();
    while (
      cur &&
      cur.address < endExclusiveAddr &&
      !visited.has(cur.address)
    ) {
      visited.add(cur.address);
      if (
        cur.code === OP_RSADD &&
        !this.jsrReturnReservationAddresses.has(cur.address)
      ) {
        this.registerLocalAllocation(fc, cur.address, sp);
      }

      if (cur.code === OP_JSR && cur.offset !== undefined) {
        const targetPc = cur.address + toSignedInt32(cur.offset);
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
  }

  /**
   * Run the canonical stack through the instruction that produces a switch discriminant.
   * The value must remain live: compiler dispatch rows copy it and the switch-exit MOVSP
   * removes it. Restoring the entry snapshot here made that cleanup consume a real local.
   */
  private extractExpressionUpToInstruction(
    target: NWScriptInstruction,
    functionContext: NWScriptFunction | null
  ): NWScriptExpression {
    const block = this.cfg.getBlockForAddress(target.address);
    if (!block) {
      return NWScriptExpression.unknown('switch discriminant instruction is not in the CFG');
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
    this.stackSimulator.setLocalVariableAllocationIndices(
      this.getLocalAllocationIndicesForFunction(efCtx)
    );
    this.stackSimulator.setLocalVariableInits(
      this.getLocalStackSlotsForFunction(efCtx)
    );
    this.stackSimulator.setVectorLocalAllocationStarts(
      this.getVectorLocalAllocationStarts(efCtx)
    );
    this.stackSimulator.setStructureLocalLayouts(
      this.getStructureLocalLayouts(efCtx)
    );

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
    return NWScriptExpression.unknown('unable to recover switch discriminant');
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
      this.stackSimulator.setLocalVariableAllocationIndices(
        this.getLocalAllocationIndicesForFunction(efFn)
      );
      this.stackSimulator.setLocalVariableInits(
        this.getLocalStackSlotsForFunction(efFn)
      );
      this.stackSimulator.setVectorLocalAllocationStarts(
        this.getVectorLocalAllocationStarts(efFn)
      );
      this.stackSimulator.setStructureLocalLayouts(
        this.getStructureLocalLayouts(efFn)
      );

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
    
    return NWScriptExpression.unknown('unable to recover block expression');
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
    this.seedFunctionAllocationIndices(func);
    this.precomputeVectorLocalAllocationStarts(func);
    // Setup local variables for this function
    // We only need to map CPDOWNSP offsets (for writes) - CPTOPSP uses stack-aware resolution
    const localVarMap = this.getLocalVariableOffsetMapForFunction(func);
    
    // The stack simulator uses stack-aware resolution for CPTOPSP reads.
    this.stackSimulator.setLocalVariables(localVarMap);
    this.stackSimulator.setVariableStackPositions(
      this.functionVariableStackPositions.get(func) ?? new Map()
    );
    this.stackSimulator.setLocalVariableAllocationIndices(
      this.getLocalAllocationIndicesForFunction(func)
    );
    this.stackSimulator.setLocalVariableInits(
      this.getLocalStackSlotsForFunction(func)
    );
    this.stackSimulator.setVectorLocalAllocationStarts(
      this.getVectorLocalAllocationStarts(func)
    );
    this.stackSimulator.setStructureLocalLayouts(
      this.getStructureLocalLayouts(func)
    );
    this.stackSimulator.setVariableTypeObserver(this.parameterTypeObserver(func));
    
    // Setup function parameters
    this.setFunctionParametersForBuilders(func);
    
    // Model a procedure relative to the bottom of its own ABI frame. Absolute caller SP is
    // irrelevant and cannot be recovered by linearly walking bytecode across branches/callees.
    const entrySP = nwscriptParametersTotalBytes(func.parameters) +
      (func.returnStackSlots ?? stackSlotsForDataType(func.returnType)) * 4;
    this.functionEntryStackPointers.set(func, entrySP);
    if (func.returnType !== NWScriptDataType.VOID) {
      this.functionReturnValueOffsets.set(func, -entrySP);
    } else {
      this.functionReturnValueOffsets.delete(func);
    }
  }
  
  /**
   * Build global variable declarations
   */
  private buildGlobalVariableDeclarations(): NWScriptGlobalVariableDeclarationNode[] {
    const declarations: NWScriptGlobalVariableDeclarationNode[] = [];
    const aggregateComponentOffsets = new Set<number>();
    for (const [start, layout] of this.globalAggregateLayouts) {
      for (let field = 1; field < layout.fieldTypes.length; field++) {
        aggregateComponentOffsets.add(start + field * 4);
      }
    }

    for (let index = 0; index < this.globalInits.length; index++) {
      const init = this.globalInits[index];
      const offset = toSignedInt32(init.offset);
      if (aggregateComponentOffsets.has(offset)) continue;

      const aggregate = this.globalAggregateLayouts.get(offset);
      if (aggregate) {
        const initializer = init.initialExpression &&
          init.initializerStackSlots === aggregate.fieldTypes.length
          ? init.initialExpression
          : undefined;
        declarations.push(NWScriptAST.createGlobalVariableDeclaration(
          aggregate.name,
          aggregate.dataType,
          initializer,
          aggregate.dataType === NWScriptDataType.STRUCTURE
            ? this.getStructureTypeName(aggregate.fieldTypes)
            : undefined
        ));
        continue;
      }

      const name = `globalVar_${index}`;
      const initializer = init.initialExpression ?? (
        init.hasInitializer && init.initialValue !== undefined
          ? NWScriptExpression.constant(init.initialValue, init.dataType)
          : undefined
      );

      declarations.push(NWScriptAST.createGlobalVariableDeclaration(
        name,
        init.dataType,
        initializer
      ));
    }
    return declarations;
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
      this.repairNonVoidTerminalReturn(mainFunction, body);
      const locals = this.buildLocalVariableDeclarations(mainFunction, body);
      const mainNode = NWScriptAST.createFunction(
        mainFunction.name,
        mainFunction.returnType,
        mainFunction.parameters.map(p => ({
          name: p.name,
          type: p.dataType,
          structName: p.structureFieldTypes
            ? this.getStructureTypeName(p.structureFieldTypes)
            : undefined,
        })),
        body,
        locals,
        mainFunction.entryBlock
      );
      if (mainFunction.returnStructureFieldTypes) {
        mainNode.returnStructName = this.getStructureTypeName(
          mainFunction.returnStructureFieldTypes
        );
      }
      functionNodes.push(mainNode);
    }
    
    // Then add all other functions
    return this.functions
      .filter(func => !func.isMain) // Exclude main function (already added)
      .map(func => {
        const functionControlNode = structureBuilder.buildProcedure(func.entryBlock);
        
        // Convert ControlNode tree to block
        const body = this.convertControlNodeToBlock(functionControlNode, func);
        this.repairNonVoidTerminalReturn(func, body);
        
        // Build local variable declarations (merge with assignments)
        const locals = this.buildLocalVariableDeclarations(func, body);
        
        const functionNode = NWScriptAST.createFunction(
          func.name,
          func.returnType,
          func.parameters.map(p => ({
            name: p.name,
            type: p.dataType,
            structName: p.structureFieldTypes
              ? this.getStructureTypeName(p.structureFieldTypes)
              : undefined,
          })),
          body, // body comes before locals
          locals,
          func.entryBlock
        );
        if (func.returnStructureFieldTypes) {
          functionNode.returnStructName = this.getStructureTypeName(
            func.returnStructureFieldTypes
          );
        }
        return functionNode;
      })
      .concat(functionNodes); // Add main function at the end
  }

  /**
   * Restore a lexically trailing value-return block omitted from the structured tree.
   * Shared epilogues are sometimes visited while converting a branch and then suppressed by
   * block de-duplication at procedure scope. The expression was still recovered from its
   * CPDOWNSP, so append the latest bytecode return only when the emitted non-void body can fall
   * through (or replace its illegal bare RETN artifact).
   */
  private repairNonVoidTerminalReturn(
    func: NWScriptFunction,
    body: NWScriptBlockNode
  ): void {
    if (func.returnType === NWScriptDataType.VOID || this.astBlockAlwaysTerminates(body)) return;
    const candidate = Array.from(this.returnValueExpressions.entries())
      .filter(([block, expression]) =>
        func.bodyBlocks.includes(block) && expression.type !== NWScriptExpressionType.UNKNOWN
      )
      .sort(([left], [right]) =>
        right.startInstruction.address - left.startInstruction.address
      )[0]?.[1];
    if (!candidate) return;

    const last = body.statements.at(-1) as (NWScriptASTNode & { value?: NWScriptExpression }) | undefined;
    if (last?.type === NWScriptASTNodeType.RETURN && !last.value) {
      body.statements.pop();
    }
    body.statements.push(NWScriptAST.createReturn(candidate));
    body.children = [...body.statements];
  }

  private astBlockAlwaysTerminates(block: NWScriptBlockNode): boolean {
    const last = block.statements.at(-1);
    if (!last) return false;
    if (last.type === NWScriptASTNodeType.RETURN) {
      return !!(last as NWScriptASTNode & { value?: NWScriptExpression }).value;
    }
    if (last.type === NWScriptASTNodeType.IF_ELSE) {
      const branch = last as NWScriptIfElseNode;
      return this.astBlockAlwaysTerminates(branch.thenBody) &&
        this.astBlockAlwaysTerminates(branch.elseBody);
    }
    return false;
  }

  /** Build local declarations without hoisting a later control-dependent assignment. */
  private buildLocalVariableDeclarations(
    func: NWScriptFunction,
    _body?: NWScriptBlockNode
  ): NWScriptVariableDeclarationNode[] {
    const rsaddSites = this.collectOrderedRsaddSitesInFunction(func);

    const sortedInits = this.localInits
      .filter(init =>
        !this.jsrReturnReservationAddresses.has(init.instructionAddress) &&
        func.bodyBlocks.some(block => block.containsAddress(init.instructionAddress))
      )
      .sort((a, b) => a.instructionAddress - b.instructionAddress);

    const slotCount = Math.max(
      rsaddSites.length,
      sortedInits.length,
      this.functionVariableCounts.get(func) ?? 0
    );

    const declarations: NWScriptVariableDeclarationNode[] = [];
    const vectorStarts = this.functionVectorLocalAllocationIndices.get(func) ?? new Set<number>();
    const structureLayouts = this.getStructureLocalLayouts(func);
    const aggregateComponents = new Set<number>();
    for (const start of vectorStarts) {
      aggregateComponents.add(start + 1);
      aggregateComponents.add(start + 2);
    }
    for (const [start, fields] of structureLayouts) {
      for (let field = 1; field < fields.length; field += 1) {
        aggregateComponents.add(start + field);
      }
    }
    for (let i = 0; i < slotCount; i++) {
      if (vectorStarts.has(i)) {
        declarations.push(NWScriptAST.createVariableDeclaration(
          `localVar_${i}`,
          NWScriptDataType.VECTOR
        ));
        continue;
      }
      if (aggregateComponents.has(i)) continue;
      const site = rsaddSites[i];
      const init =
        site !== undefined
          ? sortedInits.find(ini => ini.instructionAddress === site.address)
          : sortedInits[i];
      const optimized = site === undefined
        ? undefined
        : this.functionOptimizedScalarLocalSites.get(func)?.get(site.address);

      const dataType = vectorStarts.has(i)
        ? NWScriptDataType.VECTOR
        : structureLayouts.has(i)
          ? NWScriptDataType.STRUCTURE
          : init?.dataType ?? site?.dataType ?? NWScriptDataType.INTEGER;
      const initializer =
        !vectorStarts.has(i) &&
        !structureLayouts.has(i) &&
        ((init?.hasInitializer && init.initialValue !== undefined) || optimized !== undefined)
          ? NWScriptExpression.constant(
              init?.initialValue ?? optimized!.initialValue,
              init?.dataType ?? optimized!.dataType
            )
          : undefined;

      const structureFields = structureLayouts.get(i);
      declarations.push(NWScriptAST.createVariableDeclaration(
        `localVar_${i}`,
        dataType,
        initializer,
        structureFields ? this.getStructureTypeName(structureFields) : undefined
      ));
    }

    return declarations;
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
    
    // Walk to the next semantic barrier. The block boundary and explicit terminators already
    // bound this search; a fixed instruction limit rejected valid large compiler epilogues.
    for (let i = cpdownspIndex + 2; i < block.instructions.length; i++) {
      const instr = block.instructions[i];
      
      // If we find RETN directly, this is a return value write
      if (instr.code === OP_RETN) {
        return true;
      }
      
      // If we find JMP, check if it targets RETN
      if (instr.code === OP_JMP && instr.offset !== undefined) {
        const jmpTarget = instr.address + toSignedInt32(instr.offset);
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
    
    // No return terminator was reachable in this block.
    return false;
  }
}
