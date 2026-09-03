import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { EdgeType } from "@/nwscript/decompiler/NWScriptEdge";
import { OP_JZ, OP_JNZ, OP_JMP, OP_RETN, OP_RESTOREBP, OP_NOP, OP_INCISP, OP_DECIBP, OP_INCIBP, OP_DECISP, OP_CPTOPSP, OP_CPDOWNSP, OP_CPTOPBP, OP_CPDOWNBP, OP_EQUAL, OP_CONST, OP_MOVSP, OP_ACTION, OP_JSR, OP_RSADD } from "@/nwscript/NWScriptOPCodes";
import { nwscriptDecompilerDebug } from "@/nwscript/decompiler/NWScriptDecompilerDebug";
import { toSignedInt32 } from "@/nwscript/decompiler/NWScriptOpcodeSemantics";
import {
  indexShortCircuitRegions,
  LOGICAL_JOIN_MAX_DISTANCE,
  type NWScriptShortCircuitRegion,
} from "@/nwscript/decompiler/NWScriptShortCircuitRegion";

/**
 * ControlNode represents a node in the control flow tree.
 * This is a hierarchical representation of control structures.
 */
export type ControlNode =
  | BasicBlockNode
  | IfNode
  | IfElseNode
  | WhileNode
  | DoWhileNode
  | ForNode
  | SwitchNode
  | SequenceNode
  | ExpressionRegionNode;

/**
 * A basic block node (leaf node)
 */
export interface BasicBlockNode {
  type: 'basic_block';
  block: NWScriptBasicBlock;
  /** The terminal JMP is the loop's structural latch, not a source-level continue. */
  suppressTerminalLoopJump?: boolean;
}

/**
 * If statement node
 */
export interface IfNode {
  type: 'if';
  condition: ControlNode; // Condition block
  body: ControlNode; // Then body
  invertCondition?: boolean;
}

/**
 * If-else statement node
 */
export interface IfElseNode {
  type: 'if_else';
  condition: ControlNode; // Condition block
  thenBody: ControlNode; // Then body
  elseBody: ControlNode; // Else body
  invertCondition?: boolean;
}

/**
 * While loop node
 */
export interface WhileNode {
  type: 'while';
  condition: ControlNode; // Condition block
  body: ControlNode; // Loop body
  /** Loop exit merge (non-body) — for decompiler break/continue on bare JMP */
  loopExitBlock?: NWScriptBasicBlock;
  /** Condition / header block */
  loopHeaderBlock?: NWScriptBasicBlock;
}

/**
 * Do-while loop node
 */
export interface DoWhileNode {
  type: 'do_while';
  body: ControlNode; // Loop body
  condition: ControlNode; // Condition block
  loopExitBlock?: NWScriptBasicBlock;
  loopHeaderBlock?: NWScriptBasicBlock;
}

/**
 * For loop node
 */
export interface ForNode {
  type: 'for';
  init: ControlNode | null; // Initialization
  condition: ControlNode; // Condition block
  increment: ControlNode | null; // Increment block
  body: ControlNode; // Loop body
  loopExitBlock?: NWScriptBasicBlock;
  loopHeaderBlock?: NWScriptBasicBlock;
  /** Canonical increment basic block when identified as a for-loop */
  forIncrementBlock?: NWScriptBasicBlock | null;
}

/**
 * Switch statement node
 */
export interface SwitchNode {
  type: 'switch';
  expression: ControlNode; // Switch expression
  /** When set, evaluator used this CPTOP (merged ladder) instead of expression block alone */
  discriminantInstruction?: NWScriptInstruction;
  cases: SwitchCase[]; // Case blocks
  defaultCase: ControlNode | null; // Default case
  /** Merge / cleanup after dispatch — break in switch jumps here */
  switchExitBlock?: NWScriptBasicBlock;
  /** Compiler compare/JNZ ladder rows; not source statements. */
  switchDispatchBlocks?: NWScriptBasicBlock[];
}

/**
 * Switch case
 */
export interface SwitchCase {
  value: number; // Case value
  body: ControlNode; // Case body
}

/**
 * Sequence of control nodes (linear execution)
 */
export interface SequenceNode {
  type: 'sequence';
  nodes: ControlNode[]; // Sequence of nodes
}

/**
 * Compiler-generated `&&` / `||` value diamond. Not a source-level `if`.
 */
export interface ExpressionRegionNode {
  type: 'expression_region';
  header: NWScriptBasicBlock;
  join: NWScriptBasicBlock;
  evaluateBlocks: NWScriptBasicBlock[];
  bypassBlocks: NWScriptBasicBlock[];
  operator: 'and' | 'or';
}

/**
 * Region helper: represents a region of blocks with entry and exit points
 */
export interface Region {
  blocks: Set<NWScriptBasicBlock>; // All blocks in the region
  entry: NWScriptBasicBlock; // Entry block
  exits: Set<NWScriptBasicBlock>; // Exit blocks
}

/**
 * Procedure wrapper: represents a procedure/function with entry, blocks, and exits
 */
export interface Procedure {
  entry: NWScriptBasicBlock; // Entry block
  blocks: Set<NWScriptBasicBlock>; // All blocks in the procedure
  exitBlocks: Set<NWScriptBasicBlock>; // Exit blocks (RETN blocks)
}

/**
 * Represents a control structure in the decompiled code.
 */
export enum ControlStructureType {
  IF = 'if',
  IF_ELSE = 'if_else',
  WHILE = 'while',
  DO_WHILE = 'do_while',
  FOR = 'for',
  SWITCH = 'switch'
}

export interface NWScriptControlStructure {
  type: ControlStructureType;
  headerBlock: NWScriptBasicBlock;
  bodyBlocks: NWScriptBasicBlock[];
  elseBlocks?: NWScriptBasicBlock[];
  conditionBlock?: NWScriptBasicBlock;
  /** Ordered blocks that jointly compute a short-circuit loop condition. */
  conditionBlocks?: NWScriptBasicBlock[];
  incrementBlock?: NWScriptBasicBlock;
  initBlock?: NWScriptBasicBlock; // For loop initialization block
  exitBlock: NWScriptBasicBlock;
  nestedStructures: NWScriptControlStructure[];
  // Switch-specific fields
  switchCases?: Map<number, NWScriptBasicBlock>; // Case value -> case block
  defaultBlock?: NWScriptBasicBlock; // Default case block
  /** CPTOP/CPTOBP at the chosen ladder seed — may live in a successor block vs {@link headerBlock}. */
  switchDiscriminantInstruction?: NWScriptInstruction;
  /** Blocks that implement the compiler's compare/JNZ dispatch ladder. */
  switchDispatchBlocks?: NWScriptBasicBlock[];
  switchCaseFallThrough?: Map<number, boolean>; // Case value -> has fall-through (no break)
  // Else-if chain fields
  elseIfBlocks?: Array<{ block: NWScriptBasicBlock; conditionBlock: NWScriptBasicBlock }>; // Else-if blocks in chain
  // Break/Continue fields
  breakBlocks?: NWScriptBasicBlock[]; // Blocks containing break statements
  continueBlocks?: NWScriptBasicBlock[]; // Blocks containing continue statements
}

/**
 * Reconstructs high-level control structures from the control flow graph.
 * Identifies if/else, loops, and other control flow patterns.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptControlStructureBuilder.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptControlStructureBuilder {
  private cfg: NWScriptControlFlowGraph;
  private structures: NWScriptControlStructure[] = [];
  private processedBlocks: Set<NWScriptBasicBlock> = new Set();
  /** Basic blocks touched by merged switch-dispatch probing — avoids re-identifying the same CMP ladder from interior headers */
  private switchDispatchOccupiedBlocks: Set<number> = new Set();
  private shortCircuitByHeader: Map<NWScriptBasicBlock, NWScriptShortCircuitRegion> = new Map();
  private shortCircuitCovering: Map<NWScriptBasicBlock, NWScriptShortCircuitRegion> = new Map();
  private lastProcedure: Procedure | null = null;
  /** Successful/failed switch probes keyed by header. Includes {@code null} misses. */
  private switchIdentifyCache: Map<NWScriptBasicBlock, NWScriptControlStructure | null> = new Map();
  /** ControlNode trees keyed by procedure entry so each subroutine is structured once. */
  private procedureTreeCache: Map<NWScriptBasicBlock, ControlNode> = new Map();

  constructor(cfg: NWScriptControlFlowGraph) {
    this.cfg = cfg;
  }

  private indexLogicalRegions(): void {
    const indexed = indexShortCircuitRegions(this.cfg);
    this.shortCircuitByHeader = indexed.byHeader;
    this.shortCircuitCovering = indexed.covering;
  }

  private shortCircuitForBlock(block: NWScriptBasicBlock): NWScriptShortCircuitRegion | undefined {
    return this.shortCircuitCovering.get(block) ?? this.shortCircuitByHeader.get(block);
  }

  /**
   * Analyze the CFG and identify all control structures
   */
  analyze(): NWScriptControlStructure[] {
    this.structures = [];
    this.processedBlocks.clear();
    this.indexLogicalRegions();

    if (!this.cfg.entryBlock) {
      return [];
    }

    // First, identify loops using dominator information from CFG
    this.identifyLoops();

    // Process blocks in reverse post-order to handle nested structures
    const blocks = this.cfg.getReversePostOrder();

    for (const block of blocks) {
      if (this.processedBlocks.has(block)) {
        continue;
      }

      // Try to identify different control structures
      // Try loops first (they're more specific)
      const loop = this.identifyLoop(block);
      if (loop) {
        this.structures.push(loop);
        // Nested recovery is performed while building ControlNode trees. Doing it here
        // on whole-function if/switch bodies is quadratic in large retail scripts.
        this.processedBlocks.add(loop.headerBlock);
        if (loop.exitBlock) {
          this.processedBlocks.add(loop.exitBlock);
        }
        continue;
      }

      // Then try switch (before if/else, as switch is more specific)
      const switchStruct = this.identifySwitch(block);
      if (switchStruct) {
        this.structures.push(switchStruct);
        // Dispatch rows are compiler scaffolding, not nested source statements.
        for (const dispatchBlock of switchStruct.switchDispatchBlocks ?? [switchStruct.headerBlock]) {
          this.processedBlocks.add(dispatchBlock);
        }
        if (switchStruct.exitBlock) {
          this.processedBlocks.add(switchStruct.exitBlock);
        }
        continue;
      }

      const shortCircuit = this.shortCircuitForBlock(block);
      if (shortCircuit) {
        for (const covered of shortCircuit.coveredBlocks) {
          this.processedBlocks.add(covered);
        }
        continue;
      }

      // Then try if/else
      const ifElse = this.identifyIfElse(block);
      if (ifElse) {
        this.structures.push(ifElse);
        // Only mark header and exit as processed - body blocks may contain nested structures
        this.processedBlocks.add(ifElse.headerBlock);
        if (ifElse.exitBlock) {
          this.processedBlocks.add(ifElse.exitBlock);
        }
        continue;
      }
    }

    return this.structures;
  }

  /**
   * Identify loops using the CFG's natural loop / back-edge discovery (dominance-based).
   * The previous successor-dominance check was inverted and missed real loop headers.
   */
  private identifyLoops(): void {
    for (const block of this.cfg.blocks.values()) {
      block.isLoopHeader = false;
      block.isLoopBody = false;
    }

    for (const [header, loopBlocks] of this.cfg.naturalLoops) {
      header.isLoopHeader = true;
      for (const b of loopBlocks) {
        if (b !== header) {
          b.isLoopBody = true;
        }
      }
    }
  }

  /**
   * Blocks that belong to nested structures nested under {@code root} for occupancy
   * purposes (omit {@code exitBlock}s so merges stay scannable).
   */
  private collectNestedInteriorBlocks(root: NWScriptControlStructure): Set<NWScriptBasicBlock> {
    const interior = new Set<NWScriptBasicBlock>();
    const visit = (s: NWScriptControlStructure): void => {
      interior.add(s.headerBlock);
      s.bodyBlocks.forEach(b => interior.add(b));
      s.elseBlocks?.forEach(b => interior.add(b));
      s.switchDispatchBlocks?.forEach(b => interior.add(b));
      s.switchCases?.forEach(b => interior.add(b));
      if (s.defaultBlock) {
        interior.add(s.defaultBlock);
      }
      for (const inner of s.nestedStructures) {
        visit(inner);
      }
    };
    visit(root);
    return interior;
  }

  /**
   * Recursively find nested control structures within a parent structure
   * @param depth recursion depth across nestedStructures recovery
   */
  private findNestedStructures(structure: NWScriptControlStructure, depth = 0, ancestorHeaders: Set<NWScriptBasicBlock> = new Set()): void {
    // Every recursive level adds a distinct header. The ancestor set is the primary cycle guard;
    // this graph-derived bound protects corrupted CFGs without limiting valid source nesting.
    if (depth > this.cfg.blocks.size) {
      console.warn('[NWScriptControlStructureBuilder] invalid nested structure cycle');
      return;
    }

    if (ancestorHeaders.has(structure.headerBlock)) {
      return;
    }

    const pathFromRoot = new Set(ancestorHeaders);
    pathFromRoot.add(structure.headerBlock);
    /** Skip blocks already folded into another nested subtree (prevents exponential re-identify / stack overflows). */
    const occupiedInterior = new Set<NWScriptBasicBlock>();

    // Create a set of all blocks in this structure (for boundary checking)
    const structureBlocks = new Set<NWScriptBasicBlock>();
    structureBlocks.add(structure.headerBlock);
    structure.bodyBlocks.forEach(b => structureBlocks.add(b));
    if (structure.elseBlocks) {
      structure.elseBlocks.forEach(b => structureBlocks.add(b));
    }
    if (structure.exitBlock) {
      structureBlocks.add(structure.exitBlock);
    }

    // Find nested structures in the body blocks
    // Process blocks in order to find nested structures
    for (const bodyBlock of structure.bodyBlocks) {
      if (occupiedInterior.has(bodyBlock)) {
        continue;
      }
      // Skip if this block is already part of a nested structure we found
      const isInNested = structure.nestedStructures.some(nested =>
        nested.headerBlock === bodyBlock ||
        nested.bodyBlocks.includes(bodyBlock) ||
        nested.elseBlocks?.includes(bodyBlock)
      );
      if (isInNested) {
        continue;
      }

      // Try to find nested loops
      const nestedLoop = this.identifyLoop(bodyBlock);
      if (nestedLoop) {
        // Verify the nested loop is actually within this structure
        if (structureBlocks.has(nestedLoop.headerBlock) && 
            nestedLoop.bodyBlocks.every(b => structureBlocks.has(b))) {
          this.findNestedStructures(nestedLoop, depth + 1, pathFromRoot);
          structure.nestedStructures.push(nestedLoop);
          for (const b of this.collectNestedInteriorBlocks(nestedLoop)) {
            occupiedInterior.add(b);
          }
          // Don't mark as processed - let the code generator handle it
        }
        continue;
      }

      // Try nested switch before if/else (mirrors analyze(); dispatch blocks look like CMP+JNZ "if"s)
      const nestedSwitch = this.identifySwitch(bodyBlock);
      if (nestedSwitch) {
        // Verify the nested switch is actually within this structure
        if (structureBlocks.has(nestedSwitch.headerBlock) &&
            nestedSwitch.bodyBlocks.every(b => structureBlocks.has(b))) {
          this.findNestedStructures(nestedSwitch, depth + 1, pathFromRoot);
          structure.nestedStructures.push(nestedSwitch);
          for (const b of this.collectNestedInteriorBlocks(nestedSwitch)) {
            occupiedInterior.add(b);
          }
        }
        continue;
      }

      // Try to find nested if/else
      const nestedIfElse = this.identifyIfElse(bodyBlock);
      if (nestedIfElse) {
        // Verify the nested if/else is actually within this structure
        if (structureBlocks.has(nestedIfElse.headerBlock) &&
            nestedIfElse.bodyBlocks.every(b => structureBlocks.has(b)) &&
            (!nestedIfElse.elseBlocks || nestedIfElse.elseBlocks.every(b => structureBlocks.has(b)))) {
          this.findNestedStructures(nestedIfElse, depth + 1, pathFromRoot);
          structure.nestedStructures.push(nestedIfElse);
          for (const b of this.collectNestedInteriorBlocks(nestedIfElse)) {
            occupiedInterior.add(b);
          }
          // Don't mark as processed - let the code generator handle it
        }
        continue;
      }
    }

    // Find nested structures in else blocks
    if (structure.elseBlocks) {
      const occupiedInteriorElse = new Set<NWScriptBasicBlock>();
      for (const elseBlock of structure.elseBlocks) {
        if (occupiedInteriorElse.has(elseBlock)) {
          continue;
        }
        // Skip if this block is already part of a nested structure we found
        const isInNested = structure.nestedStructures.some(nested =>
          nested.headerBlock === elseBlock ||
          nested.bodyBlocks.includes(elseBlock) ||
          nested.elseBlocks?.includes(elseBlock)
        );
        if (isInNested) {
          continue;
        }

        // Try to find nested loops
        const nestedLoop = this.identifyLoop(elseBlock);
        if (nestedLoop) {
          if (structureBlocks.has(nestedLoop.headerBlock) && 
              nestedLoop.bodyBlocks.every(b => structureBlocks.has(b))) {
            this.findNestedStructures(nestedLoop, depth + 1, pathFromRoot);
            structure.nestedStructures.push(nestedLoop);
            for (const b of this.collectNestedInteriorBlocks(nestedLoop)) {
              occupiedInteriorElse.add(b);
            }
          }
          continue;
        }

        const nestedSwitchElse = this.identifySwitch(elseBlock);
        if (nestedSwitchElse) {
          if (structureBlocks.has(nestedSwitchElse.headerBlock) &&
              nestedSwitchElse.bodyBlocks.every(b => structureBlocks.has(b))) {
            this.findNestedStructures(nestedSwitchElse, depth + 1, pathFromRoot);
            structure.nestedStructures.push(nestedSwitchElse);
            for (const b of this.collectNestedInteriorBlocks(nestedSwitchElse)) {
              occupiedInteriorElse.add(b);
            }
          }
          continue;
        }

        // Try to find nested if/else
        const nestedIfElse = this.identifyIfElse(elseBlock);
        if (nestedIfElse) {
          if (structureBlocks.has(nestedIfElse.headerBlock) &&
              nestedIfElse.bodyBlocks.every(b => structureBlocks.has(b)) &&
              (!nestedIfElse.elseBlocks || nestedIfElse.elseBlocks.every(b => structureBlocks.has(b)))) {
            this.findNestedStructures(nestedIfElse, depth + 1, pathFromRoot);
            structure.nestedStructures.push(nestedIfElse);
            for (const b of this.collectNestedInteriorBlocks(nestedIfElse)) {
              occupiedInteriorElse.add(b);
            }
          }
          continue;
        }
      }
    }
  }

  /**
   * Identify if/else structure
   * Pattern: Block with JZ/JNZ -> two successor paths
   */
  private identifyIfElse(block: NWScriptBasicBlock, skipElseIfChainDetection = false): NWScriptControlStructure | null {
    if (this.shortCircuitCovering.has(block)) {
      return null;
    }
    if (block.exitType !== 'conditional') {
      return null;
    }

    const conditionInstr = block.conditionInstruction;
    if (!conditionInstr || (conditionInstr.code !== OP_JZ && conditionInstr.code !== OP_JNZ)) {
      return null;
    }

    // Dispatch interiors and cached switch headers are not source-level ifs. Do not
    // re-run the 36-prefix switch probe here; identifySwitch already did that work.
    if (
      this.switchDispatchOccupiedBlocks.has(block.id) ||
      this.isSwitchDispatchContinuation(block) ||
      this.switchIdentifyCache.get(block)
    ) {
      return null;
    }

    // Get intra-procedural successors only (exclude CALL/RETURN edges)
    // This ensures we only look at actual conditional branches, not function call edges
    const successors = this.cfg.getIntraProceduralSuccessors(block, false);
    if (successors.length !== 2) {
      // If not exactly 2 successors, it's not a simple if/else
      return null;
    }

    // Use CFG edge types to determine true and false paths
    // The CFG already correctly identifies TRUE_BRANCH and FALSE_BRANCH edges
    let truePath: NWScriptBasicBlock | null = null;
    let falsePath: NWScriptBasicBlock | null = null;

    for (const successor of successors) {
      const edge = this.cfg.getEdge(block, successor);
      if (edge) {
        if (edge.type === EdgeType.TRUE_BRANCH) {
          truePath = successor;
        } else if (edge.type === EdgeType.FALSE_BRANCH) {
          falsePath = successor;
        }
      }
    }

    // Fallback: If edge types aren't available, use address-based detection
    if (!truePath || !falsePath) {
      const isJZ = conditionInstr.code === OP_JZ;
      const jumpTarget = conditionInstr.offset !== undefined 
        ? conditionInstr.address + toSignedInt32(conditionInstr.offset)
        : null;
      
      const succ1 = successors[0];
      const succ2 = successors[1];
      
      if (jumpTarget !== null) {
        if (succ1.startInstruction.address === jumpTarget) {
          if (isJZ) {
            falsePath = succ1; // JZ jumps on false
            truePath = succ2;   // Fallthrough is true
          } else {
            truePath = succ1;   // JNZ jumps on true
            falsePath = succ2;  // Fallthrough is false
          }
        } else if (succ2.startInstruction.address === jumpTarget) {
          if (isJZ) {
            falsePath = succ2; // JZ jumps on false
            truePath = succ1;   // Fallthrough is true
          } else {
            truePath = succ2;   // JNZ jumps on true
            falsePath = succ1;  // Fallthrough is false
          }
        } else {
          // Can't determine from addresses, use heuristic based on instruction type
          if (isJZ) {
            truePath = succ1;   // JZ: first is usually fallthrough (true)
            falsePath = succ2;  // Second is usually jump (false)
          } else {
            truePath = succ1;   // JNZ: first is usually jump (true)
            falsePath = succ2;  // Second is usually fallthrough (false)
          }
        }
      } else {
        // No jump target, use heuristic
        if (isJZ) {
          truePath = succ1;
          falsePath = succ2;
        } else {
          truePath = succ1;
          falsePath = succ2;
        }
      }
    }

    if (!truePath || !falsePath) {
      return null;
    }

    // The compiler lowers an early return to a value write followed by a jump into the
    // procedure epilogue. Treat that arm as a terminating `if` before generic merge search;
    // otherwise the epilogue wins the merge tie and shared tail code is duplicated into else.
    if (
      this.jumpsDirectlyToProcedureEpilogue(truePath) &&
      !this.jumpsDirectlyToProcedureEpilogue(falsePath)
    ) {
      return {
        type: ControlStructureType.IF,
        headerBlock: block,
        bodyBlocks: [truePath],
        exitBlock: falsePath,
        nestedStructures: [],
      };
    }

    // Find the merge point (where both paths converge)
    let mergePoint = this.findMergePoint(truePath, falsePath);
    if (!mergePoint) {
      const ipdom = this.cfg.getImmediatePostDominator(block);
      if (
        ipdom &&
        ipdom !== block &&
        ipdom !== truePath &&
        ipdom !== falsePath &&
        !ipdom.isExit &&
        ipdom.exitType !== 'return'
      ) {
        mergePoint = ipdom;
      }
    }
    if (!mergePoint) {
      const truePathExits = this.pathReachesExit(truePath);
      const falsePathExits = this.pathReachesExit(falsePath);

      if (truePathExits && !falsePathExits) {
        return {
          type: ControlStructureType.IF,
          headerBlock: block,
          bodyBlocks: [truePath],
          exitBlock: falsePath,
          nestedStructures: [],
        };
      }
      if (!truePathExits && falsePathExits) {
        return {
          type: ControlStructureType.IF,
          headerBlock: block,
          bodyBlocks: [falsePath],
          exitBlock: truePath,
          nestedStructures: [],
        };
      }
      return {
        type: ControlStructureType.IF,
        headerBlock: block,
        bodyBlocks: [truePath],
        exitBlock: falsePath,
        nestedStructures: [],
      };
    }

    // Collect body blocks
    const trueBodyBlocks = this.collectBlocksBetween(truePath, mergePoint);
    const falseBodyBlocks = this.collectBlocksBetween(falsePath, mergePoint);

    const structure: NWScriptControlStructure = {
      type: falseBodyBlocks.length > 0 ? ControlStructureType.IF_ELSE : ControlStructureType.IF,
      headerBlock: block,
      bodyBlocks: trueBodyBlocks,
      elseBlocks: falseBodyBlocks.length > 0 ? falseBodyBlocks : undefined,
      exitBlock: mergePoint,
      nestedStructures: []
    };

    // Detect else-if chains
    if (!skipElseIfChainDetection) {
      this.detectElseIfChain(structure);
    }

    // Mark break/continue blocks
    this.markBreakContinueBlocks(structure);

    return structure;
  }

  /**
   * Detect else-if chains in an if/else structure
   * Else-if chains compile as: if -> JZ to else-if -> JMP to end, else-if -> JZ to next/else -> JMP to end
   */
  private detectElseIfChain(structure: NWScriptControlStructure): void {
    if (!structure.elseBlocks || structure.elseBlocks.length === 0) {
      return;
    }

    const elseIfBlocks: Array<{ block: NWScriptBasicBlock; conditionBlock: NWScriptBasicBlock }> = [];
    let currentElseBlock: NWScriptBasicBlock | undefined = structure.elseBlocks[0];
    const visited = new Set<NWScriptBasicBlock>();

    // Check if the else block starts with another if/else
    while (currentElseBlock) {
      if (visited.has(currentElseBlock)) {
        break;
      }
      visited.add(currentElseBlock);

      // Check if this else block contains a conditional (else-if)
      if (currentElseBlock.exitType === 'conditional' && currentElseBlock.conditionInstruction) {
        const nestedIf = this.identifyIfElse(currentElseBlock, true);
        if (nestedIf) {
          // Check if this nested if has a JMP to the same exit as the parent
          // This indicates it's part of an else-if chain
          const hasJMPToExit = this.hasJMPToBlock(currentElseBlock, structure.exitBlock);
          if (hasJMPToExit) {
            elseIfBlocks.push({
              block: nestedIf.bodyBlocks[0] || currentElseBlock,
              conditionBlock: nestedIf.headerBlock
            });

            // Continue with the nested if's else block (if any)
            if (nestedIf.elseBlocks && nestedIf.elseBlocks.length > 0) {
              currentElseBlock = nestedIf.elseBlocks[0];
            } else {
              break;
            }
          } else {
            break;
          }
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (elseIfBlocks.length > 0) {
      structure.elseIfBlocks = elseIfBlocks;
    }
  }

  /**
   * Check if a block has a JMP instruction that targets a specific block
   */
  private hasJMPToBlock(block: NWScriptBasicBlock, targetBlock: NWScriptBasicBlock): boolean {
    for (const instr of block.instructions) {
      if (instr.code === OP_JMP && instr.offset !== undefined) {
        const targetAddr = instr.address + toSignedInt32(instr.offset);
        const target = this.cfg.getBlockForAddress(targetAddr);
        if (target === targetBlock) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Blocks reachable inside one switch arm (from a case or default entry), without stepping into
   * another arm's entry. Follows intra-procedural successors and {@code OP_JMP} targets so
   * multi-block cases (e.g. {@code if (TRUE) break;} inside {@code case 2:}) are covered.
   */
  private switchArmReachableBlocks(
    armEntry: NWScriptBasicBlock,
    otherArmEntries: Set<NWScriptBasicBlock>,
    stopBlocks: ReadonlySet<NWScriptBasicBlock> = new Set()
  ): Set<NWScriptBasicBlock> {
    const out = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [armEntry];
    while (queue.length > 0) {
      const b = queue.shift()!;
      if (out.has(b) || stopBlocks.has(b)) {
        continue;
      }
      out.add(b);
      for (const instr of b.instructions) {
        if (instr.code === OP_JMP && instr.offset !== undefined) {
          const t = this.cfg.getBlockForAddress(instr.address + toSignedInt32(instr.offset));
          if (t && !otherArmEntries.has(t) && !stopBlocks.has(t) && !out.has(t)) {
            queue.push(t);
          }
        }
      }
      for (const s of this.cfg.getIntraProceduralSuccessors(b, false)) {
        if (otherArmEntries.has(s) || stopBlocks.has(s)) {
          continue;
        }
        if (!out.has(s)) {
          queue.push(s);
        }
      }
    }
    return out;
  }

  /** True if any {@code OP_JMP} along one switch arm reaches {@code target} (multi-block cases). */
  private caseBodyHasJmpToBlock(
    caseEntry: NWScriptBasicBlock,
    target: NWScriptBasicBlock,
    otherArmEntries: Set<NWScriptBasicBlock>
  ): boolean {
    const reach = this.switchArmReachableBlocks(caseEntry, otherArmEntries);
    for (const b of reach) {
      if (this.hasJMPToBlock(b, target)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Mark blocks that contain break or continue statements
   */
  private markBreakContinueBlocks(structure: NWScriptControlStructure): void {
    const breakBlocks: NWScriptBasicBlock[] = [];
    const continueBlocks: NWScriptBasicBlock[] = [];

    // Check all body blocks for break/continue
    const allBodyBlocks = [
      ...structure.bodyBlocks,
      ...(structure.elseBlocks || []),
      ...(structure.switchCases ? Array.from(structure.switchCases.values()) : []),
      ...(structure.defaultBlock ? [structure.defaultBlock] : [])
    ];

    const loopBackEdgeTargets =
      structure.type === ControlStructureType.WHILE ||
      structure.type === ControlStructureType.DO_WHILE ||
      structure.type === ControlStructureType.FOR
        ? [...structure.headerBlock.predecessors].filter(
            pred => pred.isLoopBody && pred !== structure.headerBlock
          )
        : [];

    for (const bodyBlock of allBodyBlocks) {
      // Continue before break — `break` clears stack to switch/loop exits; outer loop still classifies jumps.
      if (
        structure.type === ControlStructureType.WHILE ||
        structure.type === ControlStructureType.DO_WHILE ||
        structure.type === ControlStructureType.FOR
      ) {
        const incr = structure.incrementBlock;
        /** `for (;; i++)` emits `i = i + 1` (often no INCISP/DECISP) — patch sites target increment PC or loop-back preds of header */
        let hitContinue =
          !!(incr && this.hasJMPToBlock(bodyBlock, incr)) ||
          !!loopBackEdgeTargets.some(t => this.hasJMPToBlock(bodyBlock, t));
        /** Do/while continues can target condition header directly (no separate increment block). */
        if (
          !hitContinue &&
          (structure.type === ControlStructureType.WHILE ||
            structure.type === ControlStructureType.DO_WHILE) &&
          this.hasJMPToBlock(bodyBlock, structure.headerBlock)
        ) {
          hitContinue = true;
        }
        if (hitContinue) {
          continueBlocks.push(bodyBlock);
          continue;
        }
      }

      // Break: merge / loop exit block (switch arms may span multiple basic blocks)
      let breaksToExit = false;
      if (
        structure.type === ControlStructureType.SWITCH &&
        structure.switchCases &&
        structure.exitBlock
      ) {
        const armEntries = new Set<NWScriptBasicBlock>(Array.from(structure.switchCases.values()));
        if (structure.defaultBlock) {
          armEntries.add(structure.defaultBlock);
        }
        if (armEntries.has(bodyBlock)) {
          const others = new Set(armEntries);
          others.delete(bodyBlock);
          breaksToExit = this.caseBodyHasJmpToBlock(bodyBlock, structure.exitBlock, others);
        } else {
          breaksToExit = this.hasJMPToBlock(bodyBlock, structure.exitBlock);
        }
      } else {
        breaksToExit = this.hasJMPToBlock(bodyBlock, structure.exitBlock);
      }
      if (breaksToExit) {
        breakBlocks.push(bodyBlock);
      }
    }

    if (breakBlocks.length > 0) {
      structure.breakBlocks = breakBlocks;
    }
    if (continueBlocks.length > 0) {
      structure.continueBlocks = continueBlocks;
    }
  }

  /**
   * Linear chain prefixes from {@code start} for ladders split across basic blocks (CF often splits CPTOP+EQUAL ladders).
   */
  private linearSwitchChainPrefixes(start: NWScriptBasicBlock, maxBlocks: number): NWScriptBasicBlock[][] {
    const prefixes: NWScriptBasicBlock[][] = [];
    const chain: NWScriptBasicBlock[] = [start];
    prefixes.push([...chain]);
    let cur = start;
    for (let depth = 1; depth < maxBlocks; depth++) {
      const succs = this.cfg.getIntraProceduralSuccessors(cur, false);
      if (succs.length !== 1) {
        break;
      }
      const next = succs[0];
      /** Do not insist on single predecessor — KotOR CFG may merge early; stop if we revisit. */
      if (chain.includes(next)) {
        break;
      }
      chain.push(next);
      prefixes.push([...chain]);
      cur = next;
    }
    return prefixes;
  }

  /**
   * Merge instructions along a CMP ladder beyond single-successor chains by following bytecode
   * fall-through (nextInstr after each block terminator) across 2-way splits. Capped tightly to
   * avoid sucking unrelated control-flow; {@link tryIdentifySwitchFromInstructions} still requires
   * ≥2 matched case rows plus a default JMP.
   */
  private switchDispatchExtendedMerge(start: NWScriptBasicBlock): NWScriptInstruction[] {
    const out: NWScriptInstruction[] = [];
    const seen = new Set<number>();
    let cur: NWScriptBasicBlock | null = start;
    // The row grammar, terminal-JMP check, and visited set bound this walk without imposing a
    // source-size limit on generated animation/state tables.
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      out.push(...cur.instructions);
      // The unconditional default JMP terminates every compiler switch dispatcher. Following
      // it walks into case/merge code, makes unrelated later constructs part of the probe, and
      // turns deeply nested retail scripts into an expensive near-quadratic scan.
      if (cur.endInstruction.code === OP_JMP || cur.endInstruction.code === OP_RETN) {
        break;
      }
      const succs = this.cfg.getIntraProceduralSuccessors(cur, false);
      if (succs.length === 1) {
        cur = succs[0];
        continue;
      }
      // A switch comparison branches to its case on JNZ. Ordinary if/else ladders use JZ and
      // cannot contribute another valid dispatcher row, so do not probe through their arms.
      if (succs.length === 2 && cur.endInstruction.code === OP_JNZ) {
        const na = cur.endInstruction?.nextInstr?.address;
        if (na === undefined) {
          break;
        }
        const ft = this.cfg.getBlockForAddress(na);
        if (!ft || !succs.includes(ft)) {
          break;
        }
        cur = ft;
        continue;
      }
      break;
    }
    return out;
  }

  private getSwitchProbeInstructionSequences(start: NWScriptBasicBlock): NWScriptInstruction[][] {
    const sequences: NWScriptInstruction[][] = [];
    for (const chain of this.linearSwitchChainPrefixes(start, 8)) {
      sequences.push(([] as NWScriptInstruction[]).concat(...chain.map((b) => b.instructions)));
    }
    const extended = this.switchDispatchExtendedMerge(start);
    if (extended.length > 0) {
      sequences.push(extended);
    }
    return sequences;
  }

  /**
   * One switch case row: optional CPTOP discriminant load, then CONST + EQUAL + JZ/JNZ.
   * Many compilers only emit CPTOP once before the first case; later rows start at CONST.
   */
  private tryParseSwitchCaseRow(
    instructions: NWScriptInstruction[],
    startIdx: number,
    requireDiscriminantCopy: boolean
  ): {
    branchIdx: number;
    constInstr: NWScriptInstruction;
    jnzInstr: NWScriptInstruction;
  } | null {
    let i = startIdx;
    if (requireDiscriminantCopy) {
      if (i >= instructions.length) {
        return null;
      }
      const op = instructions[i].code;
      if (op !== OP_CPTOPSP && op !== OP_CPTOPBP) {
        return null;
      }
      i++;
    }
    while (i < instructions.length && instructions[i].code === OP_NOP) {
      i++;
    }
    const constIdx = i;
    if (
      instructions[constIdx]?.code !== OP_CONST ||
      instructions[constIdx]?.type !== NWScriptDataType.INTEGER
    ) {
      return null;
    }
    const equalIdx = constIdx + 1;
    if (instructions[equalIdx]?.code !== OP_EQUAL) {
      return null;
    }
    const branchIdx = equalIdx + 1;
    // The NWScript switch dispatcher branches *to* a matching case with JNZ.
    // Accepting JZ also turns ordinary `if (a == x && b == y)` ladders into
    // phantom switches because their false edges happen to converge near a JMP.
    if (instructions[branchIdx]?.code !== OP_JNZ) {
      return null;
    }
    return {
      branchIdx,
      constInstr: instructions[constIdx],
      jnzInstr: instructions[branchIdx],
    };
  }

  /**
   * Try to parse switch structure from merged instructions (possibly spanning several linear blocks).
   */
  private tryIdentifySwitchFromInstructions(headerBlock: NWScriptBasicBlock, instructions: NWScriptInstruction[]): NWScriptControlStructure | null {
    let best: NWScriptControlStructure | null = null;
    let bestDistinctCases = -1;

    for (let seedIdx = 0; seedIdx + 4 < instructions.length; seedIdx++) {
      const cand = this.tryBuildSwitchStructureFromSeed(headerBlock, instructions, seedIdx);
      const n =
        cand?.switchCases && cand.switchCases.size > 0
          ? cand.switchCases.size
          : 0;
      if (n >= 2 && n > bestDistinctCases) {
        best = cand!;
        bestDistinctCases = n;
      }
    }

    return best;
  }

  private tryBuildSwitchStructureFromSeed(
    headerBlock: NWScriptBasicBlock,
    instructions: NWScriptInstruction[],
    seedIdx: number
  ): NWScriptControlStructure | null {
    // Probing concatenates the header with later fall-through blocks.  The discriminant must be
    // produced by the candidate header itself; otherwise a predecessor containing ordinary code
    // (for example an `else` assignment immediately before a switch) is misclassified as a second
    // copy of the successor's switch and its real statements disappear into the dispatch node.
    if (this.cfg.getBlockForAddress(instructions[seedIdx].address) !== headerBlock) {
      return null;
    }
    // Extended probing may cross conditional fall-through edges to collect later dispatch rows.
    // The discriminator seed itself must still precede the first control transfer; otherwise an
    // enclosing `if` block can incorrectly claim a switch that starts in only one of its arms.
    // Subsequent rows are already rejected as seeds by the retained-discriminator grammar below.
    if (instructions.slice(0, seedIdx).some(instruction =>
      instruction.code === OP_JZ ||
      instruction.code === OP_JNZ ||
      instruction.code === OP_JMP ||
      instruction.code === OP_RETN
    )) {
      return null;
    }
    const caseJNZs: Array<{ instr: NWScriptInstruction; caseValue: number | null; caseBlock: NWScriptBasicBlock | null }> = [];

    const pushCaseRow = (jnzInstr: NWScriptInstruction, caseConst: NWScriptInstruction): void => {
      const caseValue = caseConst.integer;
      const caseTargetAddr =
        jnzInstr.offset !== undefined
          ? jnzInstr.address + toSignedInt32(jnzInstr.offset)
          : null;

      let caseBlock: NWScriptBasicBlock | null = null;
      if (caseTargetAddr !== null) {
        caseBlock = this.cfg.getBlockForAddress(caseTargetAddr);
      }

      if (caseBlock && caseValue !== undefined) {
        caseJNZs.push({
          instr: jnzInstr,
          caseValue,
          caseBlock,
        });
      }
    };

    // `seedIdx` is the final instruction that produces the discriminant. Every case
    // row then starts by copying that retained value. Requiring the producer before
    // the first row prevents the second row of a real switch from being recognized as
    // a smaller nested switch.
    const firstRow = this.tryParseSwitchCaseRow(instructions, seedIdx + 1, true);
    if (!firstRow) {
      return null;
    }
    pushCaseRow(firstRow.jnzInstr, firstRow.constInstr);
    let scanPos = firstRow.branchIdx + 1;

    while (scanPos < instructions.length) {
      const nextRow = this.tryParseSwitchCaseRow(instructions, scanPos, true);
      if (!nextRow) {
        break;
      }
      pushCaseRow(nextRow.jnzInstr, nextRow.constInstr);
      scanPos = nextRow.branchIdx + 1;
    }

    if (caseJNZs.length < 2) {
      return null;
    }

    const rawVals = caseJNZs.filter((c) => c.caseValue !== null).map((c) => c.caseValue!);
    if (new Set(rawVals).size !== rawVals.length) {
      return null;
    }

    const lastCaseJNZ = caseJNZs[caseJNZs.length - 1].instr;
    const lastCaseJNZIndex = instructions.indexOf(lastCaseJNZ);
    if (lastCaseJNZIndex < 0) {
      return null;
    }

    let defaultJMP: NWScriptInstruction | null = null;
    let defaultTarget: NWScriptBasicBlock | null = null;

    const scanHorizon = Math.min(instructions.length, lastCaseJNZIndex + 1 + 96);
    for (let j = lastCaseJNZIndex + 1; j < scanHorizon; j++) {
      const cand = instructions[j];
      if (cand.code === OP_JMP && cand.offset !== undefined) {
        defaultJMP = cand;
        defaultTarget = this.cfg.getBlockForAddress(
          cand.address + toSignedInt32(cand.offset)
        );
        break;
      }
    }

    if (!defaultJMP || !defaultTarget) {
      return null;
    }

    const caseBlocks = new Set<NWScriptBasicBlock>();
    const caseValueMap = new Map<number, NWScriptBasicBlock>();

    for (const caseJNZ of caseJNZs) {
      if (caseJNZ.caseBlock && caseJNZ.caseValue !== null) {
        caseBlocks.add(caseJNZ.caseBlock);
        caseValueMap.set(caseJNZ.caseValue, caseJNZ.caseBlock);
      }
    }

    if (caseBlocks.size === 0) {
      return null;
    }

    // The compiler retains the integer discriminator on the stack throughout the dispatch
    // ladder.  When there is no source-level default arm, the ladder's final JMP lands directly
    // on the canonical `MOVSP -4` discriminator cleanup.  That target is a stronger exit signal
    // than the header's post-dominator: inside an enclosing branch the immediate post-dominator
    // can be the function epilogue, causing a nested switch to absorb every later statement.
    const directCleanupExit =
      defaultTarget?.instructions[0]?.code === OP_MOVSP &&
      defaultTarget.instructions[0].offset === -4
        ? defaultTarget
        : null;
    const exitBlock =
      directCleanupExit ??
      this.findSwitchExit(Array.from(caseBlocks), defaultTarget, headerBlock);

    if (!exitBlock) {
      return null;
    }

    const bodyBlocks: NWScriptBasicBlock[] = Array.from(caseBlocks);
    if (defaultTarget && defaultTarget !== exitBlock) {
      bodyBlocks.push(defaultTarget);
    }

    const filteredBodyBlocks = bodyBlocks.filter((b) => b !== exitBlock);
    const defaultJumpIndex = instructions.indexOf(defaultJMP);
    const switchDispatchBlocks = Array.from(new Set(
      instructions
        .slice(seedIdx, defaultJumpIndex + 1)
        .map(instruction => this.cfg.getBlockForAddress(instruction.address))
        .filter((owner): owner is NWScriptBasicBlock => owner !== null)
    ));

    const structure: NWScriptControlStructure = {
      type: ControlStructureType.SWITCH,
      headerBlock,
      bodyBlocks: filteredBodyBlocks,
      exitBlock,
      nestedStructures: [],
      switchCases: caseValueMap,
      defaultBlock: defaultTarget && defaultTarget !== exitBlock ? defaultTarget : undefined,
      switchDiscriminantInstruction: instructions[seedIdx],
      switchDispatchBlocks,
    };

    this.detectSwitchFallThrough(structure);
    this.markBreakContinueBlocks(structure);

    return structure;
  }

  private isSwitchDispatchContinuation(block: NWScriptBasicBlock): boolean {
    return Array.from(block.predecessors).some(predecessor =>
      predecessor.endInstruction.code === OP_JNZ &&
      predecessor.endInstruction.nextInstr?.address === block.startInstruction.address
    );
  }

  private occupySwitchDispatch(structure: NWScriptControlStructure): void {
    for (const owner of structure.switchDispatchBlocks ?? [structure.headerBlock]) {
      this.switchDispatchOccupiedBlocks.add(owner.id);
    }
  }

  private identifySwitch(block: NWScriptBasicBlock): NWScriptControlStructure | null {
    if (this.switchDispatchOccupiedBlocks.has(block.id)) {
      return null;
    }
    if (this.isSwitchDispatchContinuation(block)) {
      return null;
    }
    const cached = this.switchIdentifyCache.get(block);
    if (cached !== undefined) {
      if (cached) {
        this.occupySwitchDispatch(cached);
      }
      return cached;
    }

    let best: { structure: NWScriptControlStructure; merged: NWScriptInstruction[] } | null = null;

    for (const merged of this.getSwitchProbeInstructionSequences(block)) {
      if (merged.length < 5) {
        continue;
      }
      const structure = this.tryIdentifySwitchFromInstructions(block, merged);
      if (!structure) {
        continue;
      }
      const n = structure.switchCases?.size ?? 0;
      const bestN = best?.structure.switchCases?.size ?? -1;
      if (!best || n > bestN || (n === bestN && merged.length < best.merged.length)) {
        best = { structure, merged };
      }
    }

    if (!best) {
      this.switchIdentifyCache.set(block, null);
      return null;
    }

    // Extended probing deliberately follows fall-through beyond the dispatcher so it can see
    // large ladders split across many blocks.  Only reserve the blocks that actually contain the
    // selected ladder, however. Reserving every probed block hides later, independent switches
    // (and any other construct reached after the switch exit).
    this.occupySwitchDispatch(best.structure);
    this.switchIdentifyCache.set(block, best.structure);
    return best.structure;
  }

  /**
   * Detect switch case fall-through
   * Cases without break statements (JMP to exit) fall through to the next case
   */
  private detectSwitchFallThrough(structure: NWScriptControlStructure): void {
    if (!structure.switchCases || structure.switchCases.size === 0) {
      return;
    }

    const fallThroughMap = new Map<number, boolean>();

    const armEntries = new Set<NWScriptBasicBlock>(Array.from(structure.switchCases.values()));
    if (structure.defaultBlock) {
      armEntries.add(structure.defaultBlock);
    }
    const exit = structure.exitBlock;

    // Sort cases by value to check fall-through in order
    const sortedCases = Array.from(structure.switchCases.entries())
      .sort((a, b) => a[0] - b[0]);

    for (let i = 0; i < sortedCases.length; i++) {
      const [caseValue, caseBlock] = sortedCases[i];
      const others = new Set(armEntries);
      others.delete(caseBlock);
      // Multi-block cases: break may live after inner if (see compiler_smoke_test case 2).
      const hasBreak =
        !!exit && this.caseBodyHasJmpToBlock(caseBlock, exit, others);

      // If no break, it falls through to the next case (or default)
      fallThroughMap.set(caseValue, !hasBreak);
    }

    if (fallThroughMap.size > 0) {
      structure.switchCaseFallThrough = fallThroughMap;
    }
  }

  /**
   * Find the exit block of a switch statement
   * Cases may have break statements (JMP to exit) or fall through
   */
  private findSwitchExit(caseBlocks: NWScriptBasicBlock[], defaultBlock: NWScriptBasicBlock | null, headerBlock: NWScriptBasicBlock): NWScriptBasicBlock | null {
    // Try to find a common exit point
    // Cases with break will have JMP to exit
    // Cases without break will fall through to next case or default
    
    // First, check if there's a post-dominator
    const ipdom = this.cfg.getImmediatePostDominator(headerBlock);
    if (ipdom && !caseBlocks.includes(ipdom) && ipdom !== defaultBlock) {
      return ipdom;
    }

    // Check case arms for JMP leaving the arm (break → common merge / exit), including multi-block cases
    const exitCandidates = new Set<NWScriptBasicBlock>();
    const armEntries = new Set<NWScriptBasicBlock>(caseBlocks);
    if (defaultBlock) {
      armEntries.add(defaultBlock);
    }

    const collectJmpOutFromArm = (armEntry: NWScriptBasicBlock): void => {
      const others = new Set(armEntries);
      others.delete(armEntry);
      const stopBlocks = new Set<NWScriptBasicBlock>();
      if (ipdom) {
        stopBlocks.add(ipdom);
      }
      const reach = this.switchArmReachableBlocks(armEntry, others, stopBlocks);
      for (const b of reach) {
        for (const instr of b.instructions) {
          if (instr.code === OP_JMP && instr.offset !== undefined) {
            const t = this.cfg.getBlockForAddress(
              instr.address + toSignedInt32(instr.offset)
            );
            if (
              t &&
              !reach.has(t) &&
              !caseBlocks.includes(t) &&
              t !== defaultBlock &&
              t !== headerBlock
            ) {
              exitCandidates.add(t);
            }
          }
        }
      }
    };

    for (const caseBlock of caseBlocks) {
      collectJmpOutFromArm(caseBlock);
    }
    if (defaultBlock && !caseBlocks.includes(defaultBlock)) {
      collectJmpOutFromArm(defaultBlock);
    }

    // If all cases have the same exit, that's the switch exit
    if (exitCandidates.size === 1) {
      return Array.from(exitCandidates)[0];
    }

    // If default exists and is different from cases, use it as exit
    if (defaultBlock && !caseBlocks.includes(defaultBlock)) {
      return defaultBlock;
    }

    // Fallback: use the first case block's successor that's not another case
    for (const caseBlock of caseBlocks) {
      const intraSuccs = this.cfg.getIntraProceduralSuccessors(caseBlock, false);
      for (const succ of intraSuccs) {
        if (!caseBlocks.includes(succ) && succ !== defaultBlock) {
          return succ;
        }
      }
    }

    return defaultBlock || null;
  }

  /**
   * Identify loop structure from a block marked as a **natural loop header** (see the CFG's
   * {@code naturalLoops} map and dominance-based back edges in {@link NWScriptControlFlowGraph}).
   */
  private identifyLoop(block: NWScriptBasicBlock): NWScriptControlStructure | null {
    if (!block.isLoopHeader) {
      return null;
    }

    const naturalLoop = this.cfg.getNaturalLoop(block);
    if (naturalLoop.size === 0) {
      return null;
    }

    const successorsOutsideLoop = (candidate: NWScriptBasicBlock) =>
      this.cfg.getIntraProceduralSuccessors(candidate, false)
        .filter(successor => !naturalLoop.has(successor));

    const conditionIndex = block.conditionInstruction
      ? block.instructions.indexOf(block.conditionInstruction)
      : -1;
    const hasDiscardedMutationPrefix = conditionIndex > 0 &&
      block.instructions.slice(0, conditionIndex).some((instruction, index, prefix) =>
        (instruction.code === OP_INCISP || instruction.code === OP_DECISP ||
          instruction.code === OP_INCIBP || instruction.code === OP_DECIBP) &&
        prefix.slice(index + 1).some(next => next.code === OP_MOVSP)
      );
    const headerIsPreTest =
      block.exitType === 'conditional' &&
      successorsOutsideLoop(block).length > 0 &&
      !hasDiscardedMutationPrefix;
    let conditionBlock = block;
    let conditionBlocks: NWScriptBasicBlock[] = [block];
    let type = ControlStructureType.WHILE;

    if (!headerIsPreTest) {
      const postTestCandidates = Array.from(naturalLoop)
        .filter(candidate =>
          candidate.exitType === 'conditional' &&
          successorsOutsideLoop(candidate).length > 0 &&
          this.cfg.getIntraProceduralSuccessors(candidate, false)
            .some(successor => naturalLoop.has(successor))
        )
        .sort((left, right) => right.startInstruction.address - left.startInstruction.address);
      if (hasDiscardedMutationPrefix) {
        conditionBlock = block;
        type = ControlStructureType.DO_WHILE;
      } else if (postTestCandidates.length === 0) {
        return null;
      } else {
        conditionBlock = postTestCandidates[0];
        const inLoopSuccessors = this.cfg
          .getIntraProceduralSuccessors(conditionBlock, false)
          .filter(successor => naturalLoop.has(successor));
        const returnsStraightToHeader = inLoopSuccessors.some(successor => {
          let current: NWScriptBasicBlock | undefined = successor;
          const seen = new Set<NWScriptBasicBlock>();
        while (current && !seen.has(current)) {
            if (current === block) return true;
            seen.add(current);
            if (
              current.instructions.some(instruction =>
                instruction.code !== OP_JMP && instruction.code !== OP_NOP
              )
            ) {
              return false;
            }
            const next = this.cfg.getIntraProceduralSuccessors(current, false);
            if (next.length !== 1) return false;
            current = next[0];
          }
          return false;
        });

        if (conditionBlock !== block && !returnsStraightToHeader) {
          // A short-circuit pre-test is split across multiple blocks: the natural header
          // branches to RHS/bypass blocks, and a later conditional performs the real exit.
          type = ControlStructureType.WHILE;
          conditionBlocks = [
            ...this.collectBlocksBetween(block, conditionBlock)
              .filter(candidate => naturalLoop.has(candidate)),
            conditionBlock,
          ].filter((candidate, index, all) => all.indexOf(candidate) === index)
            .sort((left, right) =>
              left.startInstruction.address - right.startInstruction.address
            );
        } else {
          type = ControlStructureType.DO_WHILE;
          conditionBlocks = [conditionBlock];
        }
      }
    }

    const exitBlock = successorsOutsideLoop(conditionBlock)[0] ??
      Array.from(naturalLoop)
        .flatMap(candidate => successorsOutsideLoop(candidate))[0];

    if (!exitBlock) {
      return null;
    }

    const isPureLatch = (candidate: NWScriptBasicBlock): boolean =>
      candidate !== conditionBlock &&
      candidate.instructions.length === 1 &&
      candidate.endInstruction.code === OP_JMP &&
      candidate.successors.has(block);
    const conditionSet = new Set(conditionBlocks);
    const bodyBlocks = Array.from(naturalLoop)
      .filter(candidate =>
        !conditionSet.has(candidate) &&
        !candidate.isUnreachable &&
        !isPureLatch(candidate)
      )
      .sort((left, right) => left.startInstruction.address - right.startInstruction.address);

    const structure: NWScriptControlStructure = {
      type,
      headerBlock: block,
      conditionBlock,
      conditionBlocks,
      bodyBlocks: bodyBlocks,
      exitBlock: exitBlock,
      nestedStructures: []
    };

    // Mark break/continue blocks
    this.markBreakContinueBlocks(structure);

    // Check if it might be a for loop (has initialization and increment)
    const forLoop = this.identifyForLoop(structure);
    if (forLoop) {
      return forLoop;
    }

    return structure;
  }

  /**
   * Attempt to identify a for loop pattern
   * Pattern: initialization -> condition -> body -> increment -> JMP back to condition
   * 
   * For loop compilation pattern:
   *   1. Initializer block (before header)
   *   2. Condition block (header) with JZ to exit
   *   3. Body blocks
   *   4. Increment block (in body, before back edge)
   *   5. JMP back to condition (back edge)
   */
  private identifyForLoop(whileLoop: NWScriptControlStructure): NWScriptControlStructure | null {
    // Look for initialization block before the loop header
    const headerPreds = Array.from(whileLoop.headerBlock.predecessors);
    if (headerPreds.length < 2) {
      return null; // Need at least init and back edge
    }

    // Find the initialization block (not part of loop body, not the back edge)
    // The init block should be a predecessor that's not in the loop body
    let initBlock: NWScriptBasicBlock | null = null;
    const loopMembers = this.cfg.getNaturalLoop(whileLoop.headerBlock);
    for (const pred of headerPreds) {
      if (!loopMembers.has(pred) && pred !== whileLoop.headerBlock) {
        const isLinearInitializer =
          pred.exitType === 'fallthrough' &&
          pred.endInstruction.nextInstr?.address === whileLoop.headerBlock.startInstruction.address;
        if (!isLinearInitializer) {
          continue;
        }
        // Check if this predecessor has a path to the header that doesn't go through the loop body
        // This helps distinguish init blocks from other predecessors
        const intraSuccs = this.cfg.getIntraProceduralSuccessors(pred, false);
        if (intraSuccs.includes(whileLoop.headerBlock)) {
          initBlock = pred;
          break;
        }
      }
    }

    if (!initBlock) {
      return null;
    }
    const hasInitializerMutation = initBlock.instructions.some(instruction =>
      // O3 folds `RSADD; CONST; CPDOWNSP; MOVSP` into a persistent CONST stack slot.
      instruction.code === OP_CONST ||
      instruction.code === OP_CPDOWNSP ||
      instruction.code === OP_CPDOWNBP ||
      instruction.code === OP_INCISP ||
      instruction.code === OP_DECISP ||
      instruction.code === OP_INCIBP ||
      instruction.code === OP_DECIBP
    );
    if (!hasInitializerMutation) {
      return null;
    }

    // Find the increment block in the loop body
    // The increment block should be the last block before the back edge to the header
    // It should contain increment/decrement operations and have a JMP back to header
    const incrementBlock = this.findIncrementBlock(whileLoop.bodyBlocks, whileLoop.headerBlock);

    if (incrementBlock) {
      // Verify that increment block connects back to header (back edge)
      const incrementSuccs = this.cfg.getIntraProceduralSuccessors(incrementBlock, false);
      if (!incrementSuccs.includes(whileLoop.headerBlock)) {
        // Increment block doesn't connect back to header - not a for loop
        return null;
      }

      // Validate that init, condition, and increment reference the same variable
      // This reduces false positives (e.g., while loops with unrelated increments)
      if (!this.validateForLoopVariable(initBlock, whileLoop.headerBlock, incrementBlock)) {
        // Variables don't match - likely not a for loop
        return null;
      }

      // Create for loop structure
      const forLoop: NWScriptControlStructure = {
        type: ControlStructureType.FOR,
        headerBlock: whileLoop.headerBlock,
        bodyBlocks: whileLoop.bodyBlocks.filter(block => block !== incrementBlock),
        conditionBlock: whileLoop.conditionBlock ?? whileLoop.headerBlock,
        conditionBlocks: whileLoop.conditionBlocks,
        initBlock: initBlock, // Initialization block
        incrementBlock: incrementBlock,
        exitBlock: whileLoop.exitBlock,
        nestedStructures: []
      };

      // Mark break/continue blocks
      this.markBreakContinueBlocks(forLoop);

      return forLoop;
    }

    return null;
  }

  /**
   * Validate that init, condition, and increment blocks reference the same variable
   * This helps reduce false positives where a while loop has an unrelated increment
   */
  private validateForLoopVariable(
    initBlock: NWScriptBasicBlock,
    conditionBlock: NWScriptBasicBlock,
    incrementBlock: NWScriptBasicBlock
  ): boolean {
    // Extract variable offsets from each block
    const initOffsets = this.extractVariableOffsets(initBlock);
    const conditionOffsets = this.extractVariableOffsets(conditionBlock);
    const incrementOffsets = this.extractVariableOffsets(incrementBlock);

    // Check if there's a common offset between init, condition, and increment
    // For a valid for loop, the same variable should be:
    // - Written in init (CPDOWNSP/CPDOWNBP)
    // - Read in condition (CPTOPSP/CPTOPBP)
    // - Modified in increment (INCISP/DECISP/INCIBP/DECIBP or CPDOWNSP/CPDOWNBP)

    // Find common offsets
    const initSet = new Set(initOffsets);
    const conditionSet = new Set(conditionOffsets);
    const incrementSet = new Set(incrementOffsets);

    // Check if there's overlap between all three
    for (const offset of initSet) {
      if (conditionSet.has(offset) && incrementSet.has(offset)) {
        return true; // Found a common variable
      }
    }

    // Also check if increment modifies a variable that's read in condition
    // (init might not write to the same variable if it's already initialized)
    for (const offset of incrementSet) {
      if (conditionSet.has(offset)) {
        return true; // Increment and condition share a variable
      }
    }

    // If no common variable found, it's likely not a for loop
    return false;
  }

  /**
   * Extract variable offsets from a block
   * Returns array of offsets (can be SP or BP offsets)
   */
  private extractVariableOffsets(block: NWScriptBasicBlock): number[] {
    const offsets: number[] = [];

    for (const instr of block.instructions) {
      // Variable read/write operations
      if (instr.code === OP_CPTOPSP || instr.code === OP_CPDOWNSP ||
          instr.code === OP_CPTOPBP || instr.code === OP_CPDOWNBP) {
        if (instr.offset !== undefined) {
          offsets.push(instr.offset);
        }
      }
      // Increment/decrement operations
      else if (instr.code === OP_INCISP || instr.code === OP_DECISP ||
               instr.code === OP_INCIBP || instr.code === OP_DECIBP) {
        if (instr.offset !== undefined) {
          offsets.push(instr.offset);
        }
      }
    }

    return offsets;
  }

  /**
   * Find increment/decrement block in loop body
   * The increment block should be the last block before the back edge to the header
   * It should contain increment/decrement operations and have a JMP back to header
   */
  private findIncrementBlock(bodyBlocks: NWScriptBasicBlock[], loopHeader: NWScriptBasicBlock): NWScriptBasicBlock | null {
    // Look for blocks with increment/decrement operations that connect back to header
    // The increment block is typically the last block in the loop body before the back edge
    const candidates: Array<{ block: NWScriptBasicBlock; hasIncrement: boolean; connectsToHeader: boolean }> = [];
    
    for (const block of bodyBlocks) {
      // Check if block has increment/decrement operations
      let hasIncrement = false;
      for (const instr of block.instructions) {
        if (instr.code === OP_INCISP || instr.code === OP_DECISP ||
            instr.code === OP_INCIBP || instr.code === OP_DECIBP) {
          hasIncrement = true;
          break;
        }
      }
      
      // Check if block connects back to header (back edge)
      const intraSuccs = this.cfg.getIntraProceduralSuccessors(block, false);
      const connectsToHeader = intraSuccs.includes(loopHeader);
      
      // Also check if block ends with JMP to header
      const endsWithJMPToHeader = block.endInstruction.code === OP_JMP &&
        block.endInstruction.offset !== undefined &&
        this.cfg.getBlockForAddress(
          block.endInstruction.address + toSignedInt32(block.endInstruction.offset)
        ) === loopHeader;
      
      if (hasIncrement && (connectsToHeader || endsWithJMPToHeader)) {
        candidates.push({ block, hasIncrement, connectsToHeader: connectsToHeader || endsWithJMPToHeader });
      }
    }
    
    if (candidates.length === 0) {
      // `i = i + 1` has no INC*/DEC* — infer increment block from backedges into header inside loop body
      let best: NWScriptBasicBlock | null = null;
      let bestAddr = -1;
      for (const b of bodyBlocks) {
        if (b === loopHeader) continue;
        const intraSuccs = this.cfg.getIntraProceduralSuccessors(b, false);
        if (!intraSuccs.includes(loopHeader)) continue;
        const addr = b.startInstruction.address;
        if (addr > bestAddr) {
          bestAddr = addr;
          best = b;
        }
      }
      return best;
    }
    
    // Prefer blocks that directly connect to header
    const directConnections = candidates.filter(c => c.connectsToHeader);
    if (directConnections.length > 0) {
      // If multiple candidates, prefer the one closest to the header (lowest address)
      directConnections.sort((a, b) => 
        a.block.startInstruction.address - b.block.startInstruction.address
      );
      return directConnections[0].block;
    }
    
    // Fallback: return first candidate
    return candidates[0].block;
  }

  /**
   * Collect blocks between start and end (excluding end)
   * If end is null, collect all reachable blocks
   */
  /**
   * Collect all blocks between start and end (exclusive of end)
   * Uses BFS to collect blocks in a more predictable order
   * Only follows intra-procedural edges (excludes CALL/RETURN edges)
   */
  private collectBlocksBetween(start: NWScriptBasicBlock, end: NWScriptBasicBlock | null): NWScriptBasicBlock[] {
    if (!end) {
      return [start];
    }
    const blocks: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [start];

    // Use BFS instead of DFS for more predictable ordering
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current === end || visited.has(current)) {
        continue;
      }

      // Skip unreachable blocks
      if (current.isUnreachable) {
        continue;
      }

      visited.add(current);
      blocks.push(current);

      if (this.jumpsDirectlyToProcedureEpilogue(current)) {
        continue;
      }

      // Only follow intra-procedural successors (exclude CALL/RETURN edges)
      const intraSuccs = this.cfg.getIntraProceduralSuccessors(current, false);
      for (const successor of intraSuccs) {
        if (end === null || successor !== end) {
          if (!visited.has(successor)) {
            queue.push(successor);
          }
        }
      }
    }

    // Note: Blocks are collected in BFS order, but will be re-sorted by CFG execution order
    // in buildStructureBody for correct statement ordering
    return blocks;
  }

  /** True when {@code start} can reach a RETN / graph exit without treating the whole CFG as a body. */
  private pathReachesExit(start: NWScriptBasicBlock): boolean {
    const visited = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [start];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current) || current.isUnreachable) {
        continue;
      }
      visited.add(current);
      if (current.isExit || current.exitType === 'return') {
        return true;
      }
      if (this.jumpsDirectlyToProcedureEpilogue(current)) {
        return true;
      }
      if (visited.size > LOGICAL_JOIN_MAX_DISTANCE) {
        return false;
      }
      for (const successor of this.cfg.getIntraProceduralSuccessors(current, false)) {
        if (!visited.has(successor)) {
          queue.push(successor);
        }
      }
    }
    return false;
  }

  /** True when a block's terminal JMP only enters MOVSP/RESTOREBP/NOP cleanup and RETN. */
  private jumpsDirectlyToProcedureEpilogue(block: NWScriptBasicBlock): boolean {
    if (!block.instructions.some(instruction => instruction.code === OP_CPDOWNSP)) {
      return false;
    }
    const jump = block.endInstruction;
    if (jump.code !== OP_JMP || jump.offset === undefined) return false;
    let current = this.cfg.getBlockForAddress(
      jump.address + toSignedInt32(jump.offset)
    );
    const visited = new Set<NWScriptBasicBlock>();
    while (current && !visited.has(current)) {
      visited.add(current);
      if (current.instructions.some(instruction =>
        instruction.code !== OP_MOVSP &&
        instruction.code !== OP_RESTOREBP &&
        instruction.code !== OP_NOP &&
        instruction.code !== OP_JMP &&
        instruction.code !== OP_RETN
      )) {
        return false;
      }
      if (current.instructions.some(instruction => instruction.code === OP_RETN)) return true;
      const successors = this.cfg.getIntraProceduralSuccessors(current, false);
      if (successors.length !== 1) return false;
      current = successors[0];
    }
    return false;
  }

  /**
   * Collect loop body blocks
   * Only follows intra-procedural edges
   */
  private collectLoopBody(header: NWScriptBasicBlock, backEdge: NWScriptBasicBlock): NWScriptBasicBlock[] {
    const bodyBlocks: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();

    const collect = (current: NWScriptBasicBlock) => {
      if (current === header || visited.has(current)) {
        return;
      }

      visited.add(current);
      if (current.isLoopBody && !current.isUnreachable) {
        bodyBlocks.push(current);
      }

      // Only follow intra-procedural successors
      const intraSuccs = this.cfg.getIntraProceduralSuccessors(current, false);
      for (const successor of intraSuccs) {
        // Continue if it's not the header, or if it's the back edge connecting to header
        if (successor !== header || current === backEdge) {
          collect(successor);
        }
      }
    };

    // Start from header's intra-procedural successors
    const headerIntraSuccs = this.cfg.getIntraProceduralSuccessors(header, false);
    for (const successor of headerIntraSuccs) {
      if (successor.isLoopBody) {
        collect(successor);
      }
    }

    return bodyBlocks;
  }

  /**
   * Find the merge point where two paths converge
   * Uses BFS to find the first common block reachable from both paths
   * Only follows intra-procedural edges (excludes CALL/RETURN edges)
   * Uses post-dominator information if available for more accurate results
   */
  private findMergePoint(path1: NWScriptBasicBlock, path2: NWScriptBasicBlock): NWScriptBasicBlock | null {
    const distancesFrom = (start: NWScriptBasicBlock): Map<NWScriptBasicBlock, number> => {
      const distances = new Map<NWScriptBasicBlock, number>([[start, 0]]);
      const queue: NWScriptBasicBlock[] = [start];
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.isExit) continue;
        const distance = distances.get(current)!;
        if (distance >= LOGICAL_JOIN_MAX_DISTANCE) continue;
        for (const successor of this.cfg.getIntraProceduralSuccessors(current, false)) {
          // A branch merge is forward control flow. Following a latch makes unrelated code
          // after a loop appear to be the closest common successor.
          if (this.cfg.isBackEdge(current, successor) || distances.has(successor)) continue;
          distances.set(successor, distance + 1);
          queue.push(successor);
        }
      }
      return distances;
    };

    const left = distancesFrom(path1);
    const right = distancesFrom(path2);
    const candidates = Array.from(left.keys()).filter(block => right.has(block));
    candidates.sort((a, b) => {
      // Prefer a live continuation over the shared procedure epilogue when both are equally
      // near. This preserves `if (...) return;` followed by ordinary tail code.
      const exitPenalty = Number(a.isExit) - Number(b.isExit);
      if (exitPenalty !== 0) return exitPenalty;
      const aSum = left.get(a)! + right.get(a)!;
      const bSum = left.get(b)! + right.get(b)!;
      if (aSum !== bSum) return aSum - bSum;
      const aMax = Math.max(left.get(a)!, right.get(a)!);
      const bMax = Math.max(left.get(b)!, right.get(b)!);
      if (aMax !== bMax) return aMax - bMax;
      return a.startInstruction.address - b.startInstruction.address;
    });
    return candidates[0] ?? null;
  }

  /**
   * Find the exit block of a loop
   * Uses post-dominator analysis for more accurate results
   */
  private findLoopExit(header: NWScriptBasicBlock, bodyBlocks: NWScriptBasicBlock[]): NWScriptBasicBlock | null {
    // First, try to use post-dominator information
    // The immediate post-dominator of the header (that's not in the loop) is the exit
    const ipdom = this.cfg.getImmediatePostDominator(header);
    if (ipdom && !ipdom.isLoopBody && !bodyBlocks.includes(ipdom)) {
      return ipdom;
    }

    // Fallback: Exit is typically a block that:
    // 1. Is reached from the loop but not part of the loop body
    // 2. Or is a successor of the header that's not in the loop body
    // Only check intra-procedural successors
    const headerIntraSuccs = this.cfg.getIntraProceduralSuccessors(header, false);
    for (const successor of headerIntraSuccs) {
      if (!successor.isLoopBody && !bodyBlocks.includes(successor)) {
        return successor;
      }
    }

    // Check body blocks for exits (intra-procedural only)
    for (const bodyBlock of bodyBlocks) {
      const bodyIntraSuccs = this.cfg.getIntraProceduralSuccessors(bodyBlock, false);
      for (const successor of bodyIntraSuccs) {
        if (!successor.isLoopBody && !bodyBlocks.includes(successor) && successor !== header) {
          return successor;
        }
      }
    }

    /** Last resort: conditional header's successor that is not part of the collected body (typical loop-exit / fallthrough). */
    if (header.exitType === "conditional") {
      const succs = this.cfg.getIntraProceduralSuccessors(header, false);
      for (const s of succs) {
        if (!bodyBlocks.includes(s) && s !== header) {
          return s;
        }
      }
    }

    return null;
  }

  /**
   * Mark all blocks in a structure as processed
   */
  private markBlocksProcessed(structure: NWScriptControlStructure): void {
    this.processedBlocks.add(structure.headerBlock);
    this.processedBlocks.add(structure.exitBlock);
    
    for (const block of structure.bodyBlocks) {
      this.processedBlocks.add(block);
    }

    if (structure.elseBlocks) {
      for (const block of structure.elseBlocks) {
        this.processedBlocks.add(block);
      }
    }

    if (structure.incrementBlock) {
      this.processedBlocks.add(structure.incrementBlock);
    }

    if (structure.initBlock) {
      this.processedBlocks.add(structure.initBlock);
    }
  }

  /**
   * Get all identified structures
   */
  getStructures(): NWScriptControlStructure[] {
    return this.structures;
  }

  /**
   * Build a ControlNode tree for a procedure starting at the given entry block.
   * This creates a hierarchical representation of the control flow.
   * 
   * Note: This method will automatically call identifyLoops() if loops haven't been
   * identified yet, as loop detection depends on isLoopHeader/isLoopBody flags.
   * 
   * @param entry The entry block of the procedure
   * @returns A ControlNode tree representing the procedure's control flow
   */
  buildProcedure(entry: NWScriptBasicBlock): ControlNode {
    const cachedTree = this.procedureTreeCache.get(entry);
    if (cachedTree) {
      this.lastProcedure = this.identifyProcedure(entry);
      return cachedTree;
    }
    this.switchDispatchOccupiedBlocks.clear();
    if (this.shortCircuitByHeader.size === 0 && this.shortCircuitCovering.size === 0) {
      this.indexLogicalRegions();
    }
    // Ensure loops have been identified (needed for identifyLoop() to work)
    // Check if any blocks have loop flags set - if not, identify loops first
    const hasLoopFlags = Array.from(this.cfg.blocks.values()).some(b => b.isLoopHeader || b.isLoopBody);
    if (!hasLoopFlags) {
      this.identifyLoops();
    }
    
    // First, identify the procedure region
    const procedure = this.identifyProcedure(entry);
    this.lastProcedure = procedure;
    const tree = this.buildControlNodeTree(procedure);
    this.procedureTreeCache.set(entry, tree);
    return tree;
  }

  /**
   * Identify a procedure from its entry block.
   * Collects all blocks reachable from the entry until exit blocks (RETN).
   */
  private identifyProcedure(entry: NWScriptBasicBlock): Procedure {
    const blocks = new Set<NWScriptBasicBlock>();
    nwscriptDecompilerDebug(`[identifyProcedure] Starting from entry block ${entry.id}`);
    const exitBlocks = new Set<NWScriptBasicBlock>();
    const visited = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [entry];

    // BFS to collect all reachable blocks
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      blocks.add(current);
      
      nwscriptDecompilerDebug(`[identifyProcedure] Processing block ${current.id} (${current.instructions.length} instructions), isExit: ${current.isExit}, exitType: ${current.exitType}`);

      // Check if this is an exit block
      if (current.exitType === 'return') {
        nwscriptDecompilerDebug(`[identifyProcedure] Block ${current.id} is a RETN exit, stopping traversal`);
        exitBlocks.add(current);
        continue;
      }

      if (current.isExit && current.successors.size === 0) {
        nwscriptDecompilerDebug(`[identifyProcedure] Block ${current.id} is a graph exit (no successors), stopping traversal`);
        exitBlocks.add(current);
        continue;
      }

      // Add intra-procedural successors (exclude CALL edges)
      const intraSuccs = this.cfg.getIntraProceduralSuccessors(current, false);
      const allSuccs = Array.from(current.successors);
      nwscriptDecompilerDebug(`[identifyProcedure] Block ${current.id} has ${allSuccs.length} total successors:`, allSuccs.map(s => `block ${s.id} (exitType: ${s.exitType})`).join(', '));
      nwscriptDecompilerDebug(`[identifyProcedure] Block ${current.id} has ${intraSuccs.length} intra-procedural successors:`, intraSuccs.map(s => `block ${s.id}`).join(', '));
      for (const succ of intraSuccs) {
        if (!visited.has(succ)) {
          nwscriptDecompilerDebug(`[identifyProcedure] Adding block ${succ.id} to queue`);
          queue.push(succ);
        } else {
          nwscriptDecompilerDebug(`[identifyProcedure] Block ${succ.id} already visited, skipping`);
        }
      }
    }
    
    nwscriptDecompilerDebug(`[identifyProcedure] Found ${blocks.size} blocks total:`, Array.from(blocks).map(b => `block ${b.id}`).join(', '));
    nwscriptDecompilerDebug(`[identifyProcedure] Found ${exitBlocks.size} exit blocks:`, Array.from(exitBlocks).map(b => `block ${b.id}`).join(', '));

    return {
      entry,
      blocks,
      exitBlocks
    };
  }

  /**
   * Build a ControlNode tree from a procedure.
   * Recursively identifies control structures and builds the tree.
   */
  private buildControlNodeTree(procedure: Procedure): ControlNode {
    const processed = new Set<NWScriptBasicBlock>();

    // Process blocks in execution order
    const orderedBlocks = this.cfg.getTopologicalOrderFromEntry(procedure.entry).filter(block => procedure.blocks.has(block));

    nwscriptDecompilerDebug(`[buildControlNodeTree] Ordered blocks: ${orderedBlocks.length}`, orderedBlocks.map(b => `block ${b.id}`).join(', '));

    // Build control nodes starting from entry
    // Start with the entry block and build recursively
    const rootNode = this.buildNodeFromBlock(procedure.entry, procedure, processed);
    
    nwscriptDecompilerDebug(`[buildControlNodeTree] After buildNodeFromBlock(entry), processed: ${processed.size} blocks`);
    nwscriptDecompilerDebug(`[buildControlNodeTree] Processed blocks:`, Array.from(processed).map(b => `block ${b.id}`).join(', '));
    
    // If we have remaining unprocessed blocks, create a sequence
    const remainingBlocks = orderedBlocks.filter(b => !processed.has(b));
    nwscriptDecompilerDebug(`[buildControlNodeTree] Remaining blocks: ${remainingBlocks.length}`, remainingBlocks.map(b => `block ${b.id}`).join(', '));
    
    if (remainingBlocks.length > 0) {
      const remainingNodes: ControlNode[] = [];
      for (const block of remainingBlocks) {
        if (processed.has(block)) continue;
        const node = this.buildNodeFromBlock(block, procedure, processed);
        if (node) remainingNodes.push(node);
      }
      
      if (rootNode) {
        nwscriptDecompilerDebug(`[buildControlNodeTree] Creating sequence with root + ${remainingNodes.length} remaining nodes`);
        return {
          type: 'sequence',
          nodes: [rootNode, ...remainingNodes]
        };
      } else {
        nwscriptDecompilerDebug(`[buildControlNodeTree] No root node, returning ${remainingNodes.length} remaining nodes`);
        return remainingNodes.length === 1 
          ? remainingNodes[0]
          : { type: 'sequence', nodes: remainingNodes };
      }
    }

    // If no structure found, return a sequence of basic blocks
    if (!rootNode) {
      nwscriptDecompilerDebug(`[buildControlNodeTree] No root node, building sequence from all ordered blocks`);
      return this.buildSequenceNode(orderedBlocks, procedure, processed);
    }

    nwscriptDecompilerDebug(`[buildControlNodeTree] Returning root node only (type: ${rootNode.type})`);
    return rootNode;
  }

  /**
   * Build a control node starting from a given block.
   */
  private buildNodeFromBlock(
    block: NWScriptBasicBlock,
    procedure: Procedure,
    processed: Set<NWScriptBasicBlock>
  ): ControlNode | null {
    if (processed.has(block)) {
      nwscriptDecompilerDebug(`[buildNodeFromBlock] Block ${block.id} already processed, skipping`);
      return null;
    }

    // Check if block is in procedure
    if (!procedure.blocks.has(block)) {
      nwscriptDecompilerDebug(`[buildNodeFromBlock] Block ${block.id} not in procedure, skipping`);
      return null;
    }
    
    nwscriptDecompilerDebug(`[buildNodeFromBlock] Processing block ${block.id} (${block.instructions.length} instructions)`);

    // Match analyze() specificity: loops and switch dispatch headers before plain if/else
    const loop = this.identifyLoop(block);
    if (loop && this.isStructureInProcedure(loop, procedure)) {
      for (const conditionBlock of loop.conditionBlocks ?? [loop.conditionBlock ?? loop.headerBlock]) {
        processed.add(conditionBlock);
      }
      // The exit is ordinary code after the loop and must remain available to the
      // enclosing sequence. Marking it here silently dropped subsequent statements.
      return this.buildLoopNode(loop, procedure, processed);
    }

    const switchStruct = this.identifySwitch(block);
    if (switchStruct && this.isStructureInProcedure(switchStruct, procedure)) {
      for (const dispatchBlock of switchStruct.switchDispatchBlocks ?? [switchStruct.headerBlock]) {
        processed.add(dispatchBlock);
      }
      // Do not mark switch exit as processed: it often contains real post-switch code
      // (e.g. DelayCommand tail after STORE_STATE+JMP to the merge block).
      return this.buildSwitchNode(switchStruct, procedure, processed);
    }

    const shortCircuit = this.shortCircuitForBlock(block);
    if (shortCircuit) {
      if (block !== shortCircuit.header) {
        if (!processed.has(shortCircuit.header) && procedure.blocks.has(shortCircuit.header)) {
          return this.buildNodeFromBlock(shortCircuit.header, procedure, processed);
        }
        processed.add(block);
        return null;
      }
      if (processed.has(shortCircuit.header)) {
        return null;
      }
      for (const covered of shortCircuit.coveredBlocks) {
        processed.add(covered);
      }
      return {
        type: 'expression_region',
        header: shortCircuit.header,
        join: shortCircuit.join,
        evaluateBlocks: shortCircuit.evaluateBlocks,
        bypassBlocks: shortCircuit.bypassBlocks,
        operator: shortCircuit.operator,
      };
    }

    const ifElse = this.identifyIfElse(block);
    if (ifElse && this.isStructureInProcedure(ifElse, procedure)) {
      processed.add(ifElse.headerBlock);
      // The merge is ordinary code after the branch. It may itself be the header of the
      // next source-level construct (a common pattern for consecutive if statements).
      return this.buildIfElseNode(ifElse, procedure, processed);
    }

    // No structure found, return basic block node
    processed.add(block);
    return { type: 'basic_block', block };
  }

  /**
   * Check if a control structure is within the procedure.
   */
  private isStructureInProcedure(
    structure: NWScriptControlStructure,
    procedure: Procedure
  ): boolean {
    if (!procedure.blocks.has(structure.headerBlock)) {
      return false;
    }

    /** Exit merge may lie just past a subgraph boundary heuristic in pathological bytecode; bodies are authoritative. */
    if (
      structure.exitBlock &&
      !procedure.blocks.has(structure.exitBlock) &&
      (structure.type === ControlStructureType.WHILE ||
        structure.type === ControlStructureType.DO_WHILE ||
        structure.type === ControlStructureType.FOR ||
        structure.type === ControlStructureType.SWITCH)
    ) {
      /** Keep switch/if and flat if/else strict so we do not widen bogus merges */
    } else if (structure.exitBlock && !procedure.blocks.has(structure.exitBlock)) {
      return false;
    }

    const elseOk =
      !structure.elseBlocks || structure.elseBlocks.every(b => procedure.blocks.has(b));
    const conditionsOk =
      !structure.conditionBlocks || structure.conditionBlocks.every(b => procedure.blocks.has(b));

    return structure.bodyBlocks.every(b => procedure.blocks.has(b)) && elseOk && conditionsOk;
  }

  /**
   * Build an if-else node from a control structure.
   */
  private buildIfElseNode(
    structure: NWScriptControlStructure,
    procedure: Procedure,
    processed: Set<NWScriptBasicBlock>
  ): ControlNode {
    const conditionNode: ControlNode = { type: 'basic_block', block: structure.headerBlock };
    
    // Build then body
    const thenBody = this.buildSequenceNode(structure.bodyBlocks, procedure, processed);
    
    if (structure.elseBlocks && structure.elseBlocks.length > 0) {
      // If-else
      const elseBody = this.buildSequenceNode(structure.elseBlocks, procedure, processed);
      return {
        type: 'if_else',
        condition: conditionNode,
        thenBody,
        elseBody
      };
    } else {
      // If only
      return {
        type: 'if',
        condition: conditionNode,
        body: thenBody
      };
    }
  }

  /**
   * Build a loop node from a control structure.
   */
  private buildLoopNode(
    structure: NWScriptControlStructure,
    procedure: Procedure,
    processed: Set<NWScriptBasicBlock>
  ): ControlNode {
    const conditionBlocks = structure.conditionBlocks ?? [
      structure.conditionBlock ?? structure.headerBlock,
    ];
    const conditionNode: ControlNode = conditionBlocks.length === 1
      ? { type: 'basic_block', block: conditionBlocks[0] }
      : {
          type: 'sequence',
          nodes: conditionBlocks.map(block => ({ type: 'basic_block' as const, block })),
        };
    const body = this.buildLoopBodyNode(structure, procedure, processed);
    if (structure.incrementBlock) {
      processed.add(structure.incrementBlock);
    }

    switch (structure.type) {
      case ControlStructureType.WHILE:
        return {
          type: 'while',
          condition: conditionNode,
          body,
          loopExitBlock: structure.exitBlock,
          loopHeaderBlock: structure.headerBlock,
        };
      case ControlStructureType.DO_WHILE:
        return {
          type: 'do_while',
          body,
          condition: conditionNode,
          loopExitBlock: structure.exitBlock,
          loopHeaderBlock: structure.headerBlock,
        };
      case ControlStructureType.FOR:
        const initNode = structure.initBlock 
          ? { type: 'basic_block' as const, block: structure.initBlock }
          : null;
        const incrementNode = structure.incrementBlock
          ? {
              type: 'basic_block' as const,
              block: structure.incrementBlock,
              suppressTerminalLoopJump: true,
            }
          : null;
        return {
          type: 'for',
          init: initNode,
          condition: conditionNode,
          increment: incrementNode,
          body,
          loopExitBlock: structure.exitBlock,
          loopHeaderBlock: structure.headerBlock,
          forIncrementBlock: structure.incrementBlock ?? null,
        };
      default:
        // Fallback to while
        return {
          type: 'while',
          condition: conditionNode,
          body,
          loopExitBlock: structure.exitBlock,
          loopHeaderBlock: structure.headerBlock,
        };
    }
  }

  /**
   * Structure a natural-loop region without allowing generic merge discovery to walk through
   * its back edge into later loops. Increment/header/exit stay control transfers, not branch
   * bodies: `identifyIfElse` may use the increment as a merge, but `ForNode.increment` owns it.
   */
  private buildLoopBodyNode(
    structure: NWScriptControlStructure,
    procedure: Procedure,
    processed: Set<NWScriptBasicBlock>
  ): ControlNode {
    const reserved = new Set<NWScriptBasicBlock>([
      structure.headerBlock,
      structure.exitBlock,
      ...(structure.conditionBlocks ?? []),
      ...(structure.incrementBlock ? [structure.incrementBlock] : []),
    ]);
    const bodyAllowed = new Set(
      structure.bodyBlocks.filter(block =>
        procedure.blocks.has(block) &&
        !block.isUnreachable &&
        !reserved.has(block)
      )
    );
    if (bodyAllowed.size === 0) {
      return { type: 'sequence', nodes: [] };
    }

    const miniBlocks = new Set(bodyAllowed);
    if (structure.incrementBlock && procedure.blocks.has(structure.incrementBlock)) {
      miniBlocks.add(structure.incrementBlock);
    }
    const mini: Procedure = {
      entry: Array.from(bodyAllowed).sort(
        (left, right) => left.startInstruction.address - right.startInstruction.address
      )[0] ?? procedure.entry,
      blocks: miniBlocks,
      exitBlocks: procedure.exitBlocks,
    };

    const nodes: ControlNode[] = [];
    const ordered = Array.from(bodyAllowed)
      .sort((left, right) => left.startInstruction.address - right.startInstruction.address);
    for (const block of ordered) {
      if (processed.has(block)) {
        continue;
      }
      const covering = this.shortCircuitCovering.get(block);
      if (covering && covering.header !== block && processed.has(covering.header)) {
        continue;
      }
      const node = this.buildNodeFromBlock(block, mini, processed);
      if (node) {
        nodes.push(node);
      }
    }

    for (const block of ordered) {
      if (!processed.has(block) && !reserved.has(block)) {
        processed.add(block);
        nodes.push({
          type: 'basic_block',
          block,
        });
      }
    }

    const body = nodes.length === 1 ? nodes[0] : { type: 'sequence' as const, nodes };
    this.markLoopBodyTailLatch(body, structure);
    return body;
  }

  /** True when the block's last instruction is the compiler latch back to header or increment. */
  private isNaturalLoopLatch(
    block: NWScriptBasicBlock,
    structure: NWScriptControlStructure
  ): boolean {
    if (block.endInstruction.code !== OP_JMP) {
      return false;
    }
    const target = this.cfg.getIntraProceduralSuccessors(block, false)[0];
    return target === structure.headerBlock || target === structure.incrementBlock;
  }

  /**
   * Suppress the sequential-tail JMP that closes a while/for body. Nested `if (x) continue;`
   * arms are left unmarked so they still emit `continue`.
   */
  private markLoopBodyTailLatch(node: ControlNode, structure: NWScriptControlStructure): void {
    let tail: ControlNode = node;
    while (tail.type === 'sequence' && tail.nodes.length > 0) {
      tail = tail.nodes[tail.nodes.length - 1];
    }
    if (tail.type === 'basic_block' && this.isNaturalLoopLatch(tail.block, structure)) {
      tail.suppressTerminalLoopJump = true;
    }
  }

  /**
   * Build a switch node from a control structure.
   */
  private buildSwitchNode(
    structure: NWScriptControlStructure,
    procedure: Procedure,
    processed: Set<NWScriptBasicBlock>
  ): ControlNode {
    const expressionNode: ControlNode = { type: 'basic_block', block: structure.headerBlock };
    
    // Build each complete arm, not only its entry block. Case bodies routinely contain nested
    // if/switch regions before their terminal break; leaving those blocks for the outer sequence
    // makes them execute unconditionally after the switch.
    const cases: SwitchCase[] = [];
    if (structure.switchCases) {
      const armEntries = new Set(structure.switchCases.values());
      if (structure.defaultBlock) armEntries.add(structure.defaultBlock);
      const stopBlocks = new Set([structure.exitBlock]);
      for (const [caseValue, caseBlock] of structure.switchCases.entries()) {
        const otherEntries = new Set(armEntries);
        otherEntries.delete(caseBlock);
        const armBlocks = Array.from(
          this.switchArmReachableBlocks(caseBlock, otherEntries, stopBlocks)
        );
        const caseBody = this.buildSequenceNode(armBlocks, procedure, processed);
        cases.push({
          value: caseValue,
          body: caseBody
        });
      }
    }
    
    // Build default case if it exists
    let defaultCase: ControlNode | null = null;
    if (structure.defaultBlock) {
      const otherEntries = new Set(structure.switchCases?.values() ?? []);
      const defaultBlocks = Array.from(
        this.switchArmReachableBlocks(
          structure.defaultBlock,
          otherEntries,
          new Set([structure.exitBlock])
        )
      );
      defaultCase = this.buildSequenceNode(defaultBlocks, procedure, processed);
    }
    
    return {
      type: 'switch',
      expression: expressionNode,
      discriminantInstruction: structure.switchDiscriminantInstruction,
      cases: cases,
      defaultCase: defaultCase,
      switchExitBlock: structure.exitBlock,
      switchDispatchBlocks: structure.switchDispatchBlocks,
    };
  }

  /**
   * Build a sequence node from a list of blocks.
   */
  private buildSequenceNode(
    blocks: NWScriptBasicBlock[],
    procedure: Procedure,
    processed: Set<NWScriptBasicBlock>
  ): ControlNode {
    const nodes: ControlNode[] = [];

    // Sort blocks by execution order
    const orderedBlocks = blocks
      .filter(b => procedure.blocks.has(b))
      .sort((a, b) => a.startInstruction.address - b.startInstruction.address);

    for (const block of orderedBlocks) {
      if (processed.has(block)) {
        continue;
      }

      const node = this.buildNodeFromBlock(block, procedure, processed);
      if (node) {
        nodes.push(node);
      }
    }

    if (nodes.length === 0) {
      // Empty sequence - return a placeholder
      return { type: 'basic_block', block: blocks[0] || procedure.entry };
    }

    if (nodes.length === 1) {
      return nodes[0];
    }

    return {
      type: 'sequence',
      nodes
    };
  }

  /**
   * Create a Region from a set of blocks.
   * Identifies entry and exit points automatically.
   */
  createRegion(blocks: Set<NWScriptBasicBlock>): Region {
    let entry: NWScriptBasicBlock | null = null;
    const exits = new Set<NWScriptBasicBlock>();

    // Find entry (block with no predecessors in the region, or earliest address)
    for (const block of blocks) {
      const hasPredInRegion = Array.from(block.predecessors).some(p => blocks.has(p));
      if (!hasPredInRegion) {
        if (!entry || block.startInstruction.address < entry.startInstruction.address) {
          entry = block;
        }
      }

      // Find exits (blocks with successors outside the region, or exit blocks)
      if (block.isExit || block.exitType === 'return') {
        exits.add(block);
      } else {
        const hasSuccOutsideRegion = Array.from(block.successors).some(s => !blocks.has(s));
        if (hasSuccOutsideRegion) {
          exits.add(block);
        }
      }
    }

    // Fallback: use earliest block as entry
    if (!entry) {
      const sorted = Array.from(blocks).sort((a, b) => 
        a.startInstruction.address - b.startInstruction.address
      );
      entry = sorted[0];
    }

    return {
      blocks,
      entry,
      exits
    };
  }

  /**
   * Export control structures to JSON format for validation
   * Returns a comprehensive JSON object suitable for stringification
   * All object references are converted to IDs to avoid circular references
   * 
   * Note: This method will automatically call analyze() if structures haven't been identified yet
   */
  toJSON(): any {
    // Ensure structures have been analyzed
    if (this.structures.length === 0 && this.cfg.entryBlock) {
      this.analyze();
    }
    
    return {
      script: {
        name: this.cfg.script.name || 'unnamed',
        totalStructures: this.structures.length
      },
      structures: this.structures.map((structure, index) => this.serializeStructure(structure, index)),
      statistics: this.getDebugInfo()
    };
  }

  /**
   * Serialize a control structure to JSON (avoiding circular references)
   */
  private serializeStructure(structure: NWScriptControlStructure, index: number): any {
    const result: any = {
      index: index,
      type: structure.type,
      headerBlockId: structure.headerBlock.id,
      headerBlockAddress: structure.headerBlock.startInstruction.address,
      exitBlockId: structure.exitBlock.id,
      exitBlockAddress: structure.exitBlock.startInstruction.address,
      bodyBlockIds: structure.bodyBlocks.map(b => b.id).sort((a, b) => a - b),
      bodyBlockAddresses: structure.bodyBlocks.map(b => b.startInstruction.address).sort((a, b) => a - b)
    };

    if (structure.elseBlocks && structure.elseBlocks.length > 0) {
      result.elseBlockIds = structure.elseBlocks.map(b => b.id).sort((a, b) => a - b);
      result.elseBlockAddresses = structure.elseBlocks.map(b => b.startInstruction.address).sort((a, b) => a - b);
    }

    if (structure.conditionBlock) {
      result.conditionBlockId = structure.conditionBlock.id;
      result.conditionBlockAddress = structure.conditionBlock.startInstruction.address;
    }

    if (structure.incrementBlock) {
      result.incrementBlockId = structure.incrementBlock.id;
      result.incrementBlockAddress = structure.incrementBlock.startInstruction.address;
    }

    if (structure.initBlock) {
      result.initBlockId = structure.initBlock.id;
      result.initBlockAddress = structure.initBlock.startInstruction.address;
    }

    if (structure.switchCases && structure.switchCases.size > 0) {
      result.switchCases = Array.from(structure.switchCases.entries()).map(([value, block]) => ({
        value: value,
        blockId: block.id,
        blockAddress: block.startInstruction.address,
        hasFallThrough: structure.switchCaseFallThrough?.get(value) || false
      })).sort((a, b) => a.value - b.value);
    }

    if (structure.defaultBlock) {
      result.defaultBlockId = structure.defaultBlock.id;
      result.defaultBlockAddress = structure.defaultBlock.startInstruction.address;
    }

    if (structure.switchCaseFallThrough && structure.switchCaseFallThrough.size > 0) {
      result.switchCaseFallThrough = Array.from(structure.switchCaseFallThrough.entries())
        .map(([value, hasFallThrough]) => ({ value, hasFallThrough }))
        .sort((a, b) => a.value - b.value);
    }

    if (structure.elseIfBlocks && structure.elseIfBlocks.length > 0) {
      result.elseIfBlocks = structure.elseIfBlocks.map(elseIf => ({
        blockId: elseIf.block.id,
        blockAddress: elseIf.block.startInstruction.address,
        conditionBlockId: elseIf.conditionBlock.id,
        conditionBlockAddress: elseIf.conditionBlock.startInstruction.address
      }));
    }

    if (structure.breakBlocks && structure.breakBlocks.length > 0) {
      result.breakBlockIds = structure.breakBlocks.map(b => b.id).sort((a, b) => a - b);
      result.breakBlockAddresses = structure.breakBlocks.map(b => b.startInstruction.address).sort((a, b) => a - b);
    }

    if (structure.continueBlocks && structure.continueBlocks.length > 0) {
      result.continueBlockIds = structure.continueBlocks.map(b => b.id).sort((a, b) => a - b);
      result.continueBlockAddresses = structure.continueBlocks.map(b => b.startInstruction.address).sort((a, b) => a - b);
    }

    // Serialize nested structures
    if (structure.nestedStructures && structure.nestedStructures.length > 0) {
      result.nestedStructures = structure.nestedStructures.map((nested, nestedIndex) => 
        this.serializeStructure(nested, nestedIndex)
      );
    }

    // Add block details for validation
    result.blocks = {
      header: {
        id: structure.headerBlock.id,
        startAddress: structure.headerBlock.startInstruction.address,
        endAddress: structure.headerBlock.endInstruction.address + (structure.headerBlock.endInstruction.instructionSize || 0),
        exitType: structure.headerBlock.exitType,
        isLoopHeader: structure.headerBlock.isLoopHeader,
        isLoopBody: structure.headerBlock.isLoopBody,
        instructionCount: structure.headerBlock.instructions.length
      },
      exit: {
        id: structure.exitBlock.id,
        startAddress: structure.exitBlock.startInstruction.address,
        endAddress: structure.exitBlock.endInstruction.address + (structure.exitBlock.endInstruction.instructionSize || 0),
        exitType: structure.exitBlock.exitType,
        isExit: structure.exitBlock.isExit,
        instructionCount: structure.exitBlock.instructions.length
      },
      body: structure.bodyBlocks.map(b => ({
        id: b.id,
        startAddress: b.startInstruction.address,
        endAddress: b.endInstruction.address + (b.endInstruction.instructionSize || 0),
        exitType: b.exitType,
        isUnreachable: b.isUnreachable,
        instructionCount: b.instructions.length
      })).sort((a, b) => a.startAddress - b.startAddress)
    };

    if (structure.elseBlocks && structure.elseBlocks.length > 0) {
      result.blocks.else = structure.elseBlocks.map(b => ({
        id: b.id,
        startAddress: b.startInstruction.address,
        endAddress: b.endInstruction.address + (b.endInstruction.instructionSize || 0),
        exitType: b.exitType,
        isUnreachable: b.isUnreachable,
        instructionCount: b.instructions.length
      })).sort((a, b) => a.startAddress - b.startAddress);
    }

    return result;
  }

  /**
   * Debug method: Get statistics about blocks and why structures might not be found
   */
  getDebugInfo(): any {
    const blocks = Array.from(this.cfg.blocks.values());
    const conditionalBlocks = blocks.filter(b => b.exitType === 'conditional');
    const loopHeaders = blocks.filter(b => b.isLoopHeader);
    const blocksWithTwoSuccessors = blocks.filter(b => b.successors.size === 2);
    
    const conditionalWithTwoSuccessors = conditionalBlocks.filter(b => b.successors.size === 2);
    const conditionalWithConditionInstr = conditionalBlocks.filter(b => b.conditionInstruction !== null);
    
    // Check blocks with 2 successors that aren't conditional (might be JSR blocks)
    const nonConditionalWithTwoSuccessors = blocks.filter(b => 
      b.successors.size === 2 && b.exitType !== 'conditional'
    );

    return {
      totalBlocks: blocks.length,
      conditionalBlocks: conditionalBlocks.length,
      loopHeaders: loopHeaders.length,
      blocksWithTwoSuccessors: blocksWithTwoSuccessors.length,
      conditionalWithTwoSuccessors: conditionalWithTwoSuccessors.length,
      conditionalWithConditionInstr: conditionalWithConditionInstr.length,
      structuresFound: this.structures.length,
      conditionalBlockDetails: conditionalBlocks.map(b => ({
        id: b.id,
        exitType: b.exitType,
        hasConditionInstr: b.conditionInstruction !== null,
        conditionCode: b.conditionInstruction?.code,
        successors: b.successors.size,
        successorIds: Array.from(b.successors).map(s => s.id),
        intraProceduralSuccessors: this.cfg.getIntraProceduralSuccessors(b, false).length,
        intraProceduralSuccessorIds: this.cfg.getIntraProceduralSuccessors(b, false).map(s => s.id)
      })),
      nonConditionalWithTwoSuccessors: nonConditionalWithTwoSuccessors.map(b => ({
        id: b.id,
        exitType: b.exitType,
        startAddress: b.startInstruction.address,
        successors: b.successors.size,
        successorIds: Array.from(b.successors).map(s => s.id),
        edgeTypes: Array.from(b.successors).map(s => {
          const edge = this.cfg.getEdge(b, s);
          return edge ? edge.type : 'unknown';
        }),
        intraProceduralSuccessors: this.cfg.getIntraProceduralSuccessors(b, false).length,
        intraProceduralSuccessorIds: this.cfg.getIntraProceduralSuccessors(b, false).map(s => s.id)
      }))
    };
  }

  auditControlNodeCoverage(procedure: Procedure, root: ControlNode): ControlNodeCoverageAudit {
    return auditControlNodeCoverage(
      this.cfg,
      procedure,
      root,
      this.shortCircuitCovering
    );
  }

  auditLastProcedure(root: ControlNode): ControlNodeCoverageAudit | undefined {
    if (!this.lastProcedure) {
      return undefined;
    }
    return this.auditControlNodeCoverage(this.lastProcedure, root);
  }
}

const SEMANTIC_OPCODES = new Set<number>([
  OP_ACTION,
  OP_JSR,
  OP_RSADD,
  OP_CPDOWNSP,
  OP_CPDOWNBP,
  OP_INCISP,
  OP_DECISP,
  OP_INCIBP,
  OP_DECIBP,
]);

export interface ControlNodeCoverageAudit {
  owned: Set<NWScriptBasicBlock>;
  scaffolding: Set<NWScriptBasicBlock>;
  missing: NWScriptBasicBlock[];
  duplicate: NWScriptBasicBlock[];
}

/**
 * Collect every basic block referenced by a ControlNode tree, counting duplicate ownership.
 */
export function collectControlNodeBlocks(
  node: ControlNode,
  counts: Map<NWScriptBasicBlock, number> = new Map()
): Set<NWScriptBasicBlock> {
  const visit = (current: ControlNode): void => {
    switch (current.type) {
      case 'basic_block':
        bumpOwnership(counts, current.block);
        return;
      case 'if':
        visit(current.condition);
        visit(current.body);
        return;
      case 'if_else':
        visit(current.condition);
        visit(current.thenBody);
        visit(current.elseBody);
        return;
      case 'while':
      case 'do_while':
        visit(current.condition);
        visit(current.body);
        return;
      case 'for':
        if (current.init) visit(current.init);
        visit(current.condition);
        visit(current.body);
        if (current.increment) visit(current.increment);
        return;
      case 'switch':
        visit(current.expression);
        for (const switchCase of current.cases) {
          visit(switchCase.body);
        }
        if (current.defaultCase) visit(current.defaultCase);
        return;
      case 'sequence':
        for (const child of current.nodes) {
          visit(child);
        }
        return;
      case 'expression_region':
        for (const block of current.evaluateBlocks) {
          bumpOwnership(counts, block);
        }
        return;
    }
  };
  visit(node);
  return new Set(counts.keys());
}

function bumpOwnership(
  counts: Map<NWScriptBasicBlock, number>,
  block: NWScriptBasicBlock
): void {
  counts.set(block, (counts.get(block) ?? 0) + 1);
}

function blockHasSemanticInstructions(block: NWScriptBasicBlock): boolean {
  return block.instructions.some(instruction => SEMANTIC_OPCODES.has(instruction.code));
}

function collectScaffoldingBlocks(
  root: ControlNode,
  covering: Map<NWScriptBasicBlock, NWScriptShortCircuitRegion>
): Set<NWScriptBasicBlock> {
  const scaffolding = new Set<NWScriptBasicBlock>();
  const visit = (current: ControlNode): void => {
    switch (current.type) {
      case 'expression_region':
        for (const block of current.bypassBlocks) {
          scaffolding.add(block);
        }
        return;
      case 'switch': {
        const header = current.expression.type === 'basic_block' ? current.expression.block : undefined;
        for (const block of current.switchDispatchBlocks ?? []) {
          if (block !== header) {
            scaffolding.add(block);
          }
        }
        visit(current.expression);
        for (const switchCase of current.cases) {
          visit(switchCase.body);
        }
        if (current.defaultCase) {
          visit(current.defaultCase);
        }
        return;
      }
      case 'sequence':
        for (const child of current.nodes) {
          visit(child);
        }
        return;
      case 'if':
        visit(current.condition);
        visit(current.body);
        return;
      case 'if_else':
        visit(current.condition);
        visit(current.thenBody);
        visit(current.elseBody);
        return;
      case 'while':
      case 'do_while':
        visit(current.condition);
        visit(current.body);
        return;
      case 'for':
        if (current.init) visit(current.init);
        visit(current.condition);
        visit(current.body);
        if (current.increment) visit(current.increment);
        return;
      case 'basic_block':
        return;
    }
  };
  visit(root);
  for (const region of covering.values()) {
    for (const block of region.bypassBlocks) {
      scaffolding.add(block);
    }
  }
  return scaffolding;
}

export function auditControlNodeCoverage(
  cfg: NWScriptControlFlowGraph,
  procedure: Procedure,
  root: ControlNode,
  covering: Map<NWScriptBasicBlock, NWScriptShortCircuitRegion> = indexShortCircuitRegions(cfg).covering
): ControlNodeCoverageAudit {
  const counts = new Map<NWScriptBasicBlock, number>();
  collectControlNodeBlocks(root, counts);
  const owned = new Set(counts.keys());
  const scaffolding = collectScaffoldingBlocks(root, covering);
  const missing: NWScriptBasicBlock[] = [];
  const duplicate: NWScriptBasicBlock[] = [];

  for (const block of procedure.blocks) {
    if (block.isUnreachable || !blockHasSemanticInstructions(block)) {
      continue;
    }
    if (scaffolding.has(block)) {
      continue;
    }
    const owners = counts.get(block) ?? 0;
    if (owners === 0) {
      missing.push(block);
    } else if (owners > 1) {
      duplicate.push(block);
    }
  }

  return { owned, scaffolding, missing, duplicate };
}
