import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { EdgeType } from "@/nwscript/decompiler/NWScriptEdge";
import { OP_JZ, OP_JNZ, OP_JMP, OP_RETN, OP_INCISP, OP_DECIBP, OP_INCIBP, OP_DECISP, OP_CPTOPSP, OP_CPDOWNSP, OP_CPTOPBP, OP_CPDOWNBP, OP_EQUAL, OP_CONST, OP_MOVSP, OP_ACTION, OP_JSR } from "@/nwscript/NWScriptOPCodes";
import { nwscriptDecompilerDebug } from "@/nwscript/decompiler/NWScriptDecompilerDebug";

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
  | SequenceNode;

/**
 * A basic block node (leaf node)
 */
export interface BasicBlockNode {
  type: 'basic_block';
  block: NWScriptBasicBlock;
}

/**
 * If statement node
 */
export interface IfNode {
  type: 'if';
  condition: ControlNode; // Condition block
  body: ControlNode; // Then body
  /** Post-if merge (both paths converge) — JMP here is fallthrough, not continue */
  exitBlock?: NWScriptBasicBlock;
}

/**
 * If-else statement node
 */
export interface IfElseNode {
  type: 'if_else';
  condition: ControlNode; // Condition block
  thenBody: ControlNode; // Then body
  elseBody: ControlNode; // Else body
  /** Post-if merge — JMP here is fallthrough, not continue */
  exitBlock?: NWScriptBasicBlock;
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
  incrementBlock?: NWScriptBasicBlock;
  initBlock?: NWScriptBasicBlock; // For loop initialization block
  exitBlock: NWScriptBasicBlock;
  nestedStructures: NWScriptControlStructure[];
  // Switch-specific fields
  switchCases?: Map<number, NWScriptBasicBlock>; // Case value -> case block
  defaultBlock?: NWScriptBasicBlock; // Default case block
  /** CPTOP/CPTOBP at the chosen ladder seed — may live in a successor block vs {@link headerBlock}. */
  switchDiscriminantInstruction?: NWScriptInstruction;
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
  /** Loop headers currently being lowered — prevents re-entering the same do-while as its own body. */
  private buildingLoopHeaders: Set<NWScriptBasicBlock> = new Set();

  constructor(cfg: NWScriptControlFlowGraph) {
    this.cfg = cfg;
  }

  /**
   * Analyze the CFG and identify all control structures
   */
  analyze(): NWScriptControlStructure[] {
    this.structures = [];
    this.processedBlocks.clear();

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
        // Recursively find nested structures within the loop
        this.findNestedStructures(loop, 0);
        this.structures.push(loop);
        // Only mark header and exit as processed - body blocks may contain nested structures
        this.processedBlocks.add(loop.headerBlock);
        if (loop.exitBlock) {
          this.processedBlocks.add(loop.exitBlock);
        }
        continue;
      }

      // Then try switch (before if/else, as switch is more specific)
      const switchStruct = this.identifySwitch(block);
      if (switchStruct) {
        // Recursively find nested structures within the switch
        this.findNestedStructures(switchStruct, 0);
        this.structures.push(switchStruct);
        // Only mark header and exit as processed - body blocks may contain nested structures
        this.processedBlocks.add(switchStruct.headerBlock);
        if (switchStruct.exitBlock) {
          this.processedBlocks.add(switchStruct.exitBlock);
        }
        continue;
      }

      // Then try if/else
      const ifElse = this.identifyIfElse(block);
      if (ifElse) {
        // Recursively find nested structures within the if/else
        this.findNestedStructures(ifElse, 0);
        this.structures.push(ifElse);
        // Only mark header as processed. Do NOT mark exitBlock — the merge after
        // if/else (e.g. SetLocalBoolean after GiveXP OR ladders) must remain
        // scannable as a sibling in the procedure sequence.
        this.processedBlocks.add(ifElse.headerBlock);
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

  /** Safety cap — pathological nesting / duplicated recovery can exhaust JS stack (~10k locals). */
  private static readonly MAX_NESTING_DEPTH = 300;

  /**
   * Recursively find nested control structures within a parent structure
   * @param depth recursion depth across nestedStructures recovery
   */
  private findNestedStructures(structure: NWScriptControlStructure, depth = 0, ancestorHeaders: Set<NWScriptBasicBlock> = new Set()): void {
    if (depth >= NWScriptControlStructureBuilder.MAX_NESTING_DEPTH) {
      console.warn('[NWScriptControlStructureBuilder] nested structure recovery depth cap exceeded');
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
    if (block.exitType !== 'conditional') {
      return null;
    }

    const conditionInstr = block.conditionInstruction;
    if (!conditionInstr || (conditionInstr.code !== OP_JZ && conditionInstr.code !== OP_JNZ)) {
      return null;
    }

    /** nwn dispatch ladders are conditional chains and look like `if` — let identifySwitch own them. */
    for (const merged of this.getSwitchProbeInstructionSequences(block)) {
      if (merged.length >= 5 && this.tryIdentifySwitchFromInstructions(block, merged)) {
        return null;
      }
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
        ? conditionInstr.address + conditionInstr.offset 
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

    // Find the merge point (where both paths converge)
    const mergePoint = this.findMergePoint(truePath, falsePath);
    if (!mergePoint) {
      // No merge: avoid collectBlocksBetween(..., null) which walks into later loops
      // via break/continue targets (e.g. for-break landing on `i = 0` before a do-while).
      const trueBodyBlocks = this.collectBranchBodyWithoutCrossing(truePath, falsePath);
      const falseBodyBlocks = this.collectBranchBodyWithoutCrossing(falsePath, truePath);

      const truePathExits = trueBodyBlocks.some((b) => b.isExit || b.exitType === "return");
      const falsePathExits = falseBodyBlocks.some((b) => b.isExit || b.exitType === "return");

      if (truePathExits && !falsePathExits) {
        const structure: NWScriptControlStructure = {
          type: ControlStructureType.IF,
          headerBlock: block,
          bodyBlocks: trueBodyBlocks,
          exitBlock: falsePath,
          nestedStructures: [],
        };
        return structure;
      } else if (!truePathExits && falsePathExits) {
        const structure: NWScriptControlStructure = {
          type: ControlStructureType.IF,
          headerBlock: block,
          bodyBlocks: falseBodyBlocks,
          exitBlock: truePath,
          nestedStructures: [],
        };
        return structure;
      } else {
        const structure: NWScriptControlStructure = {
          type: falseBodyBlocks.length > 0 ? ControlStructureType.IF_ELSE : ControlStructureType.IF,
          headerBlock: block,
          bodyBlocks: trueBodyBlocks,
          elseBlocks: falseBodyBlocks.length > 0 ? falseBodyBlocks : undefined,
          exitBlock: falsePath,
          nestedStructures: [],
        };
        this.markBreakContinueBlocks(structure);
        return structure;
      }
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
        const targetAddr = instr.address + instr.offset;
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
    otherArmEntries: Set<NWScriptBasicBlock>
  ): Set<NWScriptBasicBlock> {
    const out = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [armEntry];
    let guard = 0;
    while (queue.length > 0 && guard++ < 256) {
      const b = queue.shift()!;
      if (out.has(b)) {
        continue;
      }
      out.add(b);
      for (const instr of b.instructions) {
        if (instr.code === OP_JMP && instr.offset !== undefined) {
          const t = this.cfg.getBlockForAddress(instr.address + instr.offset);
          if (t && !otherArmEntries.has(t) && !out.has(t)) {
            queue.push(t);
          }
        }
      }
      for (const s of this.cfg.getIntraProceduralSuccessors(b, false)) {
        if (otherArmEntries.has(s)) {
          continue;
        }
        if (!out.has(s)) {
          queue.push(s);
        }
      }
    }
    return out;
  }

  /**
   * Blocks reachable inside one switch arm via fallthrough/successors only (no JMP targets).
   * Used to discover break/continue JMP destinations without swallowing the merge into the arm.
   * When {@code exitBlock} is set, do not walk into the post-switch merge (or beyond).
   */
  private switchArmFallthroughBlocks(
    armEntry: NWScriptBasicBlock,
    otherArmEntries: Set<NWScriptBasicBlock>,
    exitBlock?: NWScriptBasicBlock | null
  ): Set<NWScriptBasicBlock> {
    const out = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [armEntry];
    let guard = 0;
    while (queue.length > 0 && guard++ < 256) {
      const b = queue.shift()!;
      if (out.has(b)) {
        continue;
      }
      if (exitBlock && b === exitBlock) {
        continue;
      }
      out.add(b);
      for (const s of this.cfg.getIntraProceduralSuccessors(b, false)) {
        if (exitBlock && s === exitBlock) {
          continue;
        }
        if (otherArmEntries.has(s) || out.has(s)) {
          continue;
        }
        // Do not walk through a terminator JMP (break/continue) into the merge / increment.
        if (
          b.endInstruction?.code === OP_JMP &&
          b.endInstruction.offset !== undefined &&
          this.cfg.getBlockForAddress(
            b.endInstruction.address + b.endInstruction.offset
          ) === s
        ) {
          continue;
        }
        queue.push(s);
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
      structure.breakBlocks = [...new Set(breakBlocks)];
    }
    if (continueBlocks.length > 0) {
      structure.continueBlocks = [...new Set(continueBlocks)];
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
      // Never follow loop back-edges into the header (would suck in `i < N` CONST as a case).
      if (next.startInstruction.address <= cur.startInstruction.address) {
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
   * ≥1 matched case row (JNZ) plus a default JMP.
   */
  private switchDispatchExtendedMerge(start: NWScriptBasicBlock): NWScriptInstruction[] {
    const out: NWScriptInstruction[] = [];
    const seen = new Set<number>();
    let cur: NWScriptBasicBlock | null = start;
    /** Extra fall-through hops beyond ordinary {@link linearSwitchChainPrefixes} single-successor tails. */
    let ftBudget = 5;
    let guard = 40;
    while (cur && guard-- > 0 && !seen.has(cur.id)) {
      seen.add(cur.id);
      out.push(...cur.instructions);
      const succs = this.cfg.getIntraProceduralSuccessors(cur, false);
      if (succs.length === 1) {
        const next = succs[0];
        if (next.startInstruction.address <= cur.startInstruction.address) {
          break;
        }
        cur = next;
        continue;
      }
      if (succs.length === 2 && ftBudget > 0) {
        ftBudget--;
        const na = cur.endInstruction?.nextInstr?.address;
        if (na === undefined) {
          break;
        }
        const ft = this.cfg.getBlockForAddress(na);
        if (!ft || !succs.includes(ft)) {
          break;
        }
        if (ft.startInstruction.address <= cur.startInstruction.address) {
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
    for (const chain of this.linearSwitchChainPrefixes(start, 36)) {
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
    requireDiscriminantCptop: boolean
  ): {
    branchIdx: number;
    constInstr: NWScriptInstruction;
    jnzInstr: NWScriptInstruction;
  } | null {
    let i = startIdx;
    if (requireDiscriminantCptop) {
      if (i >= instructions.length) {
        return null;
      }
      const op = instructions[i].code;
      if (op !== OP_CPTOPSP && op !== OP_CPTOPBP) {
        return null;
      }
      i++;
    }
    while (i < instructions.length && instructions[i].code === OP_MOVSP) {
      i++;
    }
    const constWindowEnd = Math.min(instructions.length, i + 10);
    let constIdx = -1;
    for (let k = i; k < constWindowEnd; k++) {
      if (instructions[k].code === OP_CONST && instructions[k].type === 3) {
        constIdx = k;
        break;
      }
    }
    if (constIdx < 0) {
      return null;
    }
    // CONST must be immediately followed by EQUAL (case compare). A looser window
    // falsely pairs the for-loop bound CONST (e.g. `i < 4`) with a later case EQUAL.
    if (constIdx + 1 >= instructions.length || instructions[constIdx + 1].code !== OP_EQUAL) {
      return null;
    }
    const equalIdx = constIdx + 1;
    let branchIdx = -1;
    const branchWindowEnd = Math.min(instructions.length, equalIdx + 4);
    for (let k = equalIdx + 1; k < branchWindowEnd; k++) {
      const opc = instructions[k].code;
      // Switch dispatch uses JNZ (jump when case matches). JZ is if/while and must not
      // seed single-case switches (smoke_24 `if (j == 1) continue`).
      if (opc === OP_JNZ) {
        branchIdx = k;
        break;
      }
      // Only allow trivial gaps (e.g. nothing); reject other compares / loads
      if (opc !== OP_MOVSP) {
        break;
      }
    }
    if (branchIdx < 0) {
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

    for (let seedIdx = 0; seedIdx < instructions.length; seedIdx++) {
      const op = instructions[seedIdx]?.code;
      if (op !== OP_CPTOPSP && op !== OP_CPTOPBP) {
        continue;
      }
      // Discriminant load must live in the header block. Extended merges can reach a
      // later switch's CPTOP; seeding from those would attach that ladder to this header
      // (smoke_08: case-2 entry mis-identified as the while's switch).
      const seedAddr = instructions[seedIdx].address;
      const headerRange = headerBlock.getAddressRange();
      if (seedAddr < headerRange.start || seedAddr >= headerRange.end) {
        continue;
      }
      const cand = this.tryBuildSwitchStructureFromSeed(headerBlock, instructions, seedIdx);
      const n =
        cand?.switchCases && cand.switchCases.size > 0
          ? cand.switchCases.size
          : 0;
      // Allow 1-case + default switches (smoke_08); still prefer richer ladders.
      if (n >= 1 && n > bestDistinctCases) {
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
    const caseJNZs: Array<{ instr: NWScriptInstruction; caseValue: number | null; caseBlock: NWScriptBasicBlock | null }> = [];

    const pushCaseRow = (jnzInstr: NWScriptInstruction, caseConst: NWScriptInstruction): void => {
      const caseValue = caseConst.integer;
      const caseTargetAddr =
        jnzInstr.offset !== undefined ? jnzInstr.address + jnzInstr.offset : null;

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

    const firstRow = this.tryParseSwitchCaseRow(instructions, seedIdx, true);
    if (!firstRow) {
      return null;
    }
    pushCaseRow(firstRow.jnzInstr, firstRow.constInstr);
    let scanPos = firstRow.branchIdx + 1;

    while (scanPos < instructions.length) {
      // End of the dispatch ladder: default JMP. Do not keep scanning into case
      // bodies or later switches (smoke_08: sole `case 2` must not absorb the
      // while's `case 0` EQUAL+JNZ as another arm of the same switch).
      if (instructions[scanPos].code === OP_JMP) {
        break;
      }
      const nextRow = this.tryParseSwitchCaseRow(instructions, scanPos, false);
      if (!nextRow) {
        break;
      }
      pushCaseRow(nextRow.jnzInstr, nextRow.constInstr);
      scanPos = nextRow.branchIdx + 1;
    }

    // ≥1 case + default JMP (smoke_08 is a single `case 2` / `default` switch).
    if (caseJNZs.length < 1) {
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
        defaultTarget = this.cfg.getBlockForAddress(cand.address + cand.offset);
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

    const exitBlock = this.findSwitchExit(Array.from(caseBlocks), defaultTarget, headerBlock)

      ?? (defaultTarget &&
        defaultTarget.instructions[0]?.code === OP_MOVSP &&
        defaultTarget.instructions[0].offset !== undefined &&
        defaultTarget.instructions[0].offset < 0
          ? defaultTarget
          : null);

    if (!exitBlock) {
      return null;
    }

    const bodyBlocks: NWScriptBasicBlock[] = Array.from(caseBlocks);
    if (defaultTarget && defaultTarget !== exitBlock) {
      bodyBlocks.push(defaultTarget);
    }

    const filteredBodyBlocks = bodyBlocks.filter((b) => b !== exitBlock);

    const structure: NWScriptControlStructure = {
      type: ControlStructureType.SWITCH,
      headerBlock,
      bodyBlocks: filteredBodyBlocks,
      exitBlock,
      nestedStructures: [],
      switchCases: caseValueMap,
      defaultBlock: defaultTarget && defaultTarget !== exitBlock ? defaultTarget : undefined,
      switchDiscriminantInstruction: instructions[seedIdx],
    };

    this.detectSwitchFallThrough(structure);
    this.markBreakContinueBlocks(structure);

    return structure;
  }

  private identifySwitch(block: NWScriptBasicBlock): NWScriptControlStructure | null {
    if (this.switchDispatchOccupiedBlocks.has(block.id)) {
      return null;
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
      return null;
    }

    // Only occupy the dispatch ladder (through the default JMP), not case bodies or
    // later code that extended merges may have appended.
    let occupyUntil = best.merged.length;
    for (let i = 0; i < best.merged.length; i++) {
      const ins = best.merged[i];
      if (ins.code === OP_JMP && i > 0) {
        // First unconditional JMP after case compares is the default branch.
        const prevIsCaseBranch = best.merged
          .slice(0, i)
          .some((p) => p.code === OP_JNZ || p.code === OP_JZ);
        if (prevIsCaseBranch) {
          occupyUntil = i + 1;
          break;
        }
      }
    }
    for (let i = 0; i < occupyUntil; i++) {
      const owner = this.cfg.getBlockForAddress(best.merged[i].address);
      if (owner) {
        this.switchDispatchOccupiedBlocks.add(owner.id);
      }
    }

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
    // Prefer break JMP consensus over post-dominator: inside a for/while the header's
    // ipdom is often the *loop* exit, not the post-switch merge (MOVSP drop discriminant).

    const exitCandidates = new Set<NWScriptBasicBlock>();
    const armEntries = new Set<NWScriptBasicBlock>(caseBlocks);
    if (defaultBlock) {
      armEntries.add(defaultBlock);
    }

    const collectJmpOutFromArm = (armEntry: NWScriptBasicBlock): void => {
      const others = new Set(armEntries);
      others.delete(armEntry);
      // Fallthrough-only reach: do not follow break/continue JMPs into the merge
      // (those targets would otherwise sit inside `reach` and be skipped as exits).
      const internal = this.switchArmFallthroughBlocks(armEntry, others);
      for (const b of internal) {
        for (const instr of b.instructions) {
          if (instr.code === OP_JMP && instr.offset !== undefined) {
            const t = this.cfg.getBlockForAddress(instr.address + instr.offset);
            if (
              t &&
              !internal.has(t) &&
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

    // Continue JMPs target the for-increment; break JMPs share the post-switch merge.
    // Prefer the candidate that is the common break target (exclude loop-header / increment
    // when multiple candidates exist).
    if (exitCandidates.size === 1) {
      return Array.from(exitCandidates)[0];
    }
    if (exitCandidates.size > 1) {
      const nonLoopish = Array.from(exitCandidates).filter(
        (b) => !b.isLoopHeader && !b.isLoopBody
      );
      // Prefer earliest address among non-loopish (post-switch cleanup before increment)
      const pool = nonLoopish.length > 0 ? nonLoopish : Array.from(exitCandidates);
      pool.sort((a, b) => a.startInstruction.address - b.startInstruction.address);
      // Among candidates, prefer the one most arms JMP to
      let best: NWScriptBasicBlock | null = null;
      let bestCount = -1;
      for (const cand of pool) {
        let count = 0;
        for (const arm of armEntries) {
          const others = new Set(armEntries);
          others.delete(arm);
          if (this.caseBodyHasJmpToBlock(arm, cand, others)) {
            count++;
          }
        }
        if (count > bestCount) {
          bestCount = count;
          best = cand;
        }
      }
      if (best && bestCount > 0) {
        return best;
      }
      return pool[0];
    }

    const ipdom = this.cfg.getImmediatePostDominator(headerBlock);
    if (ipdom && !caseBlocks.includes(ipdom) && ipdom !== defaultBlock) {
      return ipdom;
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
   *
   * Do-while (KotOR {@code compileDoWhileLoop}): body entry is the back-edge target; the post-test
   * is JZ(exit)+JMP(body) near the latch. {@code if (cond) break} uses the opposite JZ polarity.
   */
  private identifyLoop(block: NWScriptBasicBlock): NWScriptControlStructure | null {
    if (!block.isLoopHeader) {
      return null;
    }

    const loopBlockSet =
      this.cfg.naturalLoops.get(block) ?? new Set<NWScriptBasicBlock>([block]);

    // Prefer a back-edge latch that belongs to this natural loop
    let backEdgeBlock: NWScriptBasicBlock | null = null;
    for (const pred of block.predecessors) {
      if (pred === block || !pred.successors.has(block) || !loopBlockSet.has(pred)) {
        continue;
      }
      backEdgeBlock = pred;
      if (pred.exitType === "jump") {
        break;
      }
    }
    if (!backEdgeBlock) {
      for (const pred of block.predecessors) {
        if (pred.isLoopBody && pred.successors.has(block)) {
          backEdgeBlock = pred;
          break;
        }
      }
    }
    if (!backEdgeBlock) {
      for (const pred of block.predecessors) {
        if (pred.successors.has(block) && pred.exitType === "jump") {
          backEdgeBlock = pred;
          break;
        }
      }
    }

    if (!backEdgeBlock) {
      return null;
    }

    const latchCondition = this.findDoWhileLatchCondition(backEdgeBlock, block, loopBlockSet);
    const conditionBlock =
      latchCondition &&
      (latchCondition !== block || this.blockHasStatementBeforeCondition(block))
        ? latchCondition
        : null;
    const isDoWhile = conditionBlock !== null;

    const bodyBlocks = this.collectLoopBody(block, backEdgeBlock);

    let exitBlock = this.findLoopExit(block, bodyBlocks);
    if (isDoWhile && conditionBlock) {
      const latchExit = this.findDoWhileLatchExit(conditionBlock, block, bodyBlocks);
      if (latchExit) {
        exitBlock = latchExit;
      }
    }
    if (!exitBlock && conditionBlock) {
      for (const s of this.cfg.getIntraProceduralSuccessors(conditionBlock, false)) {
        if (!bodyBlocks.includes(s) && s !== block) {
          exitBlock = s;
          break;
        }
      }
    }

    if (!exitBlock) {
      return null;
    }

    const structure: NWScriptControlStructure = {
      type: isDoWhile ? ControlStructureType.DO_WHILE : ControlStructureType.WHILE,
      headerBlock: block,
      bodyBlocks: bodyBlocks,
      exitBlock: exitBlock,
      nestedStructures: [],
    };

    if (isDoWhile && conditionBlock) {
      structure.conditionBlock = conditionBlock;
      const exclude = new Set<NWScriptBasicBlock>();
      if (conditionBlock !== block) {
        exclude.add(conditionBlock);
      }
      if (
        backEdgeBlock !== conditionBlock &&
        backEdgeBlock.exitType === "jump" &&
        backEdgeBlock.successors.has(block) &&
        !backEdgeBlock.conditionInstruction
      ) {
        exclude.add(backEdgeBlock);
      }
      const withHeader = [block, ...bodyBlocks.filter((b) => b !== block)];
      structure.bodyBlocks = withHeader.filter((b) => !exclude.has(b));
    }

    this.markBreakContinueBlocks(structure);

    if (structure.type !== ControlStructureType.DO_WHILE) {
      const forLoop = this.identifyForLoop(structure);
      if (forLoop) {
        return forLoop;
      }
    }

    return structure;
  }

  /**
   * Do-while post-test: false edge exits the loop, true edge continues to the JMP latch.
   * Break/if uses the opposite polarity and is ignored.
   */
  private findDoWhileLatchCondition(
    latch: NWScriptBasicBlock,
    header: NWScriptBasicBlock,
    loopBlocks: Set<NWScriptBasicBlock>
  ): NWScriptBasicBlock | null {
    if (this.isDoWhilePostTestCondition(latch, header, loopBlocks)) {
      return latch;
    }

    for (const pred of latch.predecessors) {
      // Allow header when body+condition share one block
      if (pred !== header && !loopBlocks.has(pred)) {
        continue;
      }
      if (!this.isDoWhilePostTestCondition(pred, header, loopBlocks)) {
        continue;
      }
      const trueSucc = this.getConditionalBranchSuccessor(pred, true);
      if (trueSucc === latch || trueSucc === header) {
        return pred;
      }
      if (
        trueSucc &&
        trueSucc.exitType === "jump" &&
        trueSucc.successors.has(header) &&
        !trueSucc.conditionInstruction
      ) {
        return pred;
      }
    }
    return null;
  }

  private isDoWhilePostTestCondition(
    block: NWScriptBasicBlock,
    header: NWScriptBasicBlock,
    loopBlocks: Set<NWScriptBasicBlock>
  ): boolean {
    const cond = block.conditionInstruction;
    if (!cond || (cond.code !== OP_JZ && cond.code !== OP_JNZ)) {
      return false;
    }
    const falseSucc = this.getConditionalBranchSuccessor(block, false);
    const trueSucc = this.getConditionalBranchSuccessor(block, true);
    if (!falseSucc || !trueSucc) {
      return false;
    }
    const falseExits = !loopBlocks.has(falseSucc) && falseSucc !== header;
    const trueContinues = loopBlocks.has(trueSucc) || trueSucc === header;
    return falseExits && trueContinues;
  }

  private getConditionalBranchSuccessor(
    block: NWScriptBasicBlock,
    wantTrue: boolean
  ): NWScriptBasicBlock | null {
    const wantType = wantTrue ? EdgeType.TRUE_BRANCH : EdgeType.FALSE_BRANCH;
    for (const succ of this.cfg.getIntraProceduralSuccessors(block, false)) {
      const edge = this.cfg.getEdge(block, succ);
      if (edge && edge.type === wantType) {
        return succ;
      }
    }
    return null;
  }

  private blockHasStatementBeforeCondition(block: NWScriptBasicBlock): boolean {
    const cond = block.conditionInstruction;
    if (!cond) {
      return false;
    }
    for (const instr of block.instructions) {
      if (instr.address >= cond.address) {
        break;
      }
      if (
        instr.code === OP_ACTION ||
        instr.code === OP_JSR ||
        instr.code === OP_CPDOWNSP ||
        instr.code === OP_CPDOWNBP
      ) {
        return true;
      }
    }
    return false;
  }

  private findDoWhileLatchExit(
    latch: NWScriptBasicBlock,
    header: NWScriptBasicBlock,
    bodyBlocks: NWScriptBasicBlock[]
  ): NWScriptBasicBlock | null {
    const falseSucc = this.getConditionalBranchSuccessor(latch, false);
    if (falseSucc && falseSucc !== header && !bodyBlocks.includes(falseSucc)) {
      return falseSucc;
    }
    for (const s of this.cfg.getIntraProceduralSuccessors(latch, false)) {
      if (s === header || bodyBlocks.includes(s)) {
        continue;
      }
      return s;
    }
    return null;
  }

  /**
   * If {@code block} is the init predecessor of a for-loop header, return that for structure.
   */
  private tryIdentifyForLoopFromInitBlock(block: NWScriptBasicBlock): NWScriptControlStructure | null {
    if (block.isLoopBody) {
      return null;
    }
    const succs = this.cfg.getIntraProceduralSuccessors(block, false);
    for (const succ of succs) {
      if (!succ.isLoopHeader) {
        continue;
      }
      const loop = this.identifyLoop(succ);
      if (
        loop &&
        loop.type === ControlStructureType.FOR &&
        loop.initBlock === block
      ) {
        return loop;
      }
    }
    return null;
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
    for (const pred of headerPreds) {
      if (!pred.isLoopBody && pred !== whileLoop.headerBlock) {
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
        bodyBlocks: whileLoop.bodyBlocks,
        conditionBlock: whileLoop.headerBlock, // Condition is at header
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
        this.cfg.getBlockForAddress(block.endInstruction.address + block.endInstruction.offset) === loopHeader;
      
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
   * Collect a branch body without following unconditional JMPs into unrelated regions
   * (loop exits / later sibling structures). Falls back to a BFS that stops at {@code otherArm}.
   */
  private collectBranchBodyWithoutCrossing(
    start: NWScriptBasicBlock,
    otherArm: NWScriptBasicBlock
  ): NWScriptBasicBlock[] {
    // Pure jump / return arm — body is just this block (break, continue, return)
    if (
      start.exitType === "jump" ||
      start.exitType === "return" ||
      start.endInstruction.code === OP_JMP ||
      start.endInstruction.code === OP_RETN
    ) {
      return [start];
    }
    return this.collectBlocksBetween(start, otherArm);
  }

  /**
   * Collect all blocks between start and end (exclusive of end)
   * Uses BFS to collect blocks in a more predictable order
   * Only follows intra-procedural edges (excludes CALL/RETURN edges)
   */
  private collectBlocksBetween(start: NWScriptBasicBlock, end: NWScriptBasicBlock | null): NWScriptBasicBlock[] {
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

  /**
   * Collect loop body blocks (blocks in the natural loop except the header).
   * Only follows edges within the natural loop so later sibling loops are not absorbed.
   */
  private collectLoopBody(header: NWScriptBasicBlock, backEdge: NWScriptBasicBlock): NWScriptBasicBlock[] {
    const loopSet =
      this.cfg.naturalLoops.get(header) ?? new Set<NWScriptBasicBlock>([header, backEdge]);
    const bodyBlocks: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();

    const collect = (current: NWScriptBasicBlock) => {
      if (current === header || visited.has(current) || !loopSet.has(current)) {
        return;
      }

      visited.add(current);
      if (!current.isUnreachable) {
        bodyBlocks.push(current);
      }

      const intraSuccs = this.cfg.getIntraProceduralSuccessors(current, false);
      for (const successor of intraSuccs) {
        if (successor !== header && loopSet.has(successor)) {
          collect(successor);
        }
      }
    };

    const headerIntraSuccs = this.cfg.getIntraProceduralSuccessors(header, false);
    for (const successor of headerIntraSuccs) {
      if (loopSet.has(successor) && successor !== header) {
        collect(successor);
      }
    }

    if (backEdge !== header && loopSet.has(backEdge) && !visited.has(backEdge) && !backEdge.isUnreachable) {
      bodyBlocks.push(backEdge);
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
    // First, try using post-dominator analysis for more accurate results
    // The merge point should be the immediate post-dominator of the conditional block
    // that is reachable from both paths
    
    // Use BFS to find common reachable block (intra-procedural only)
    const visited1 = new Set<NWScriptBasicBlock>();
    const visited2 = new Set<NWScriptBasicBlock>();

    const queue1: NWScriptBasicBlock[] = [path1];
    const queue2: NWScriptBasicBlock[] = [path2];

    // Limit search depth to avoid infinite loops
    const maxDepth = 100;
    let depth = 0;

    while ((queue1.length > 0 || queue2.length > 0) && depth < maxDepth) {
      depth++;

      // Process path1
      if (queue1.length > 0) {
        const current = queue1.shift()!;
        if (visited2.has(current)) {
          return current; // Found merge point
        }
        if (!visited1.has(current)) {
          visited1.add(current);
          // Only follow intra-procedural successors
          const intraSuccs = this.cfg.getIntraProceduralSuccessors(current, false);
          for (const successor of intraSuccs) {
            if (!visited1.has(successor)) {
              queue1.push(successor);
            }
          }
        }
      }

      // Process path2
      if (queue2.length > 0) {
        const current = queue2.shift()!;
        if (visited1.has(current)) {
          return current; // Found merge point
        }
        if (!visited2.has(current)) {
          visited2.add(current);
          // Only follow intra-procedural successors
          const intraSuccs = this.cfg.getIntraProceduralSuccessors(current, false);
          for (const successor of intraSuccs) {
            if (!visited2.has(successor)) {
              queue2.push(successor);
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Find the exit block of a loop.
   * Prefer the header/latch conditional edge that leaves the natural loop — not the
   * function-wide post-dominator (sequential scripts often share one far ipdom).
   */
  private findLoopExit(header: NWScriptBasicBlock, bodyBlocks: NWScriptBasicBlock[]): NWScriptBasicBlock | null {
    const loopSet =
      this.cfg.naturalLoops.get(header) ??
      new Set<NWScriptBasicBlock>([header, ...bodyBlocks]);

    // while/for pre-test: JZ false → exit, fallthrough → body
    if (header.exitType === "conditional") {
      const falseSucc = this.getConditionalBranchSuccessor(header, false);
      if (falseSucc && falseSucc !== header && !loopSet.has(falseSucc)) {
        return falseSucc;
      }
      for (const s of this.cfg.getIntraProceduralSuccessors(header, false)) {
        if (!loopSet.has(s) && s !== header) {
          return s;
        }
      }
    }

    // Immediate post-dominator only if it is a direct exit neighbor of the loop
    const ipdom = this.cfg.getImmediatePostDominator(header);
    if (ipdom && !loopSet.has(ipdom)) {
      const touchesLoop = [...loopSet].some((b) =>
        this.cfg.getIntraProceduralSuccessors(b, false).includes(ipdom)
      );
      if (touchesLoop) {
        return ipdom;
      }
    }

    for (const bodyBlock of bodyBlocks) {
      const bodyIntraSuccs = this.cfg.getIntraProceduralSuccessors(bodyBlock, false);
      for (const successor of bodyIntraSuccs) {
        if (!loopSet.has(successor) && successor !== header) {
          return successor;
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
    this.switchDispatchOccupiedBlocks.clear();
    // Ensure loops have been identified (needed for identifyLoop() to work)
    // Check if any blocks have loop flags set - if not, identify loops first
    const hasLoopFlags = Array.from(this.cfg.blocks.values()).some(b => b.isLoopHeader || b.isLoopBody);
    if (!hasLoopFlags) {
      this.identifyLoops();
    }
    
    // First, identify the procedure region
    const procedure = this.identifyProcedure(entry);
    
    // Build the control node tree for this procedure
    return this.buildControlNodeTree(procedure);
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
      for (const b of remainingBlocks) {
        if (processed.has(b)) {
          continue;
        }
        const node = this.buildNodeFromBlock(b, procedure, processed);
        if (node) {
          remainingNodes.push(node);
        }
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

    // For-loop init precedes the header. If we emit it as a plain basic block first, the for's
    // init slot becomes empty (already-emitted cache). Fold into the for when this is its init.
    if (!this.buildingLoopHeaders.has(block)) {
      const forFromInit = this.tryIdentifyForLoopFromInitBlock(block);
      if (forFromInit && this.isStructureInProcedure(forFromInit, procedure)) {
        processed.add(forFromInit.headerBlock);
        if (forFromInit.initBlock) {
          processed.add(forFromInit.initBlock);
        }
        if (forFromInit.incrementBlock) {
          processed.add(forFromInit.incrementBlock);
        }
        return this.buildLoopNode(forFromInit, procedure, processed);
      }
    }

    // Match analyze() specificity: loops and switch dispatch headers before plain if/else
    if (!this.buildingLoopHeaders.has(block)) {
      const loop = this.identifyLoop(block);
      if (loop && this.isStructureInProcedure(loop, procedure)) {
        processed.add(loop.headerBlock);
        if (loop.type === ControlStructureType.DO_WHILE) {
          // Header is body entry — leave free for body lowering; mark latch/condition instead
          processed.delete(loop.headerBlock);
          if (loop.conditionBlock && loop.conditionBlock !== loop.headerBlock) {
            processed.add(loop.conditionBlock);
          }
          for (const pred of loop.headerBlock.predecessors) {
            if (
              pred.exitType === "jump" &&
              pred.successors.has(loop.headerBlock) &&
              (pred.isLoopBody || (this.cfg.naturalLoops.get(loop.headerBlock)?.has(pred) ?? false))
            ) {
              processed.add(pred);
            }
          }
        }
        // Do not mark while/for exitBlock processed — exits often hold the next real
        // statement (for-init `i = 0`, or `i = 0` before a following do-while).
        if (loop.type === ControlStructureType.FOR) {
          if (loop.initBlock) {
            processed.add(loop.initBlock);
          }
          if (loop.incrementBlock) {
            processed.add(loop.incrementBlock);
          }
        }
        return this.buildLoopNode(loop, procedure, processed);
      }
    }

    const switchStruct = this.identifySwitch(block);
    if (switchStruct && this.isStructureInProcedure(switchStruct, procedure)) {
      processed.add(switchStruct.headerBlock);
      this.markSwitchDispatchLadderProcessed(switchStruct, processed);
      // Do not mark switch exit as processed: it often contains real post-switch code
      // (e.g. DelayCommand tail after STORE_STATE+JMP to the merge block).
      return this.buildSwitchNode(switchStruct, procedure, processed);
    }

    const ifElse = this.identifyIfElse(block);
    if (ifElse && this.isStructureInProcedure(ifElse, procedure)) {
      processed.add(ifElse.headerBlock);
      // Keep following do-while / while headers scannable when they are an if merge target.
      // Also keep side-effecting merges free (e.g. `i = 0` that is both for-break target and pre-do stmt).
      // Plain if joins whose merge is itself the next `if` (smoke_15: `if (a==b); if (a!="no")`)
      // must stay free — but do NOT free OR/AND ladder probe exits (smoke_45): those look
      // conditional yet swallowing them into the while body nests the real body under a probe
      // that short-circuit absorption later skips.
      if (ifElse.exitBlock && !ifElse.exitBlock.isLoopHeader) {
        const exitHasSideEffects = ifElse.exitBlock.instructions.some(
          (i) =>
            i.code === OP_CPDOWNSP ||
            i.code === OP_CPDOWNBP ||
            i.code === OP_ACTION ||
            i.code === OP_JSR ||
            i.code === OP_INCISP ||
            i.code === OP_DECISP
        );
        const exitIsJoinConditional =
          !!ifElse.exitBlock.conditionInstruction &&
          (!ifElse.elseBlocks || ifElse.elseBlocks.length === 0) &&
          // Sequential ifs (smoke_15): then arm ends with an unconditional JMP to the
          // merge, which is the next if header. OR/AND ladder probes reach the next
          // term via the header's false JZ, not a then-arm JMP — keep marking those.
          ifElse.bodyBlocks.some(
            (b) => b.exitType === "jump" && b.successors.has(ifElse.exitBlock!)
          );
        if (!exitHasSideEffects && !exitIsJoinConditional) {
          processed.add(ifElse.exitBlock);
        }
      }
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

    return structure.bodyBlocks.every(b => procedure.blocks.has(b)) && elseOk;
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
    
    // Build then body (skip blocks reserved for outer for-increment / already lowered)
    const thenBlocks = structure.bodyBlocks.filter((b) => !processed.has(b));
    const thenBody = this.buildSequenceNode(
      thenBlocks.length > 0 ? thenBlocks : structure.bodyBlocks,
      procedure,
      processed
    );
    
    const elseBlocks =
      structure.elseBlocks?.filter((b) => !processed.has(b)) ?? [];
    if (elseBlocks.length > 0) {
      const elseBody = this.buildSequenceNode(elseBlocks, procedure, processed);
      return {
        type: 'if_else',
        condition: conditionNode,
        thenBody,
        elseBody,
        exitBlock: structure.exitBlock,
      };
    }
    return {
      type: 'if',
      condition: conditionNode,
      body: thenBody,
      exitBlock: structure.exitBlock,
    };
  }

  /**
   * Build a loop node from a control structure.
   */
  private buildLoopNode(
    structure: NWScriptControlStructure,
    procedure: Procedure,
    processed: Set<NWScriptBasicBlock>
  ): ControlNode {
    const conditionBlock =
      structure.type === ControlStructureType.DO_WHILE && structure.conditionBlock
        ? structure.conditionBlock
        : structure.headerBlock;
    const conditionNode: ControlNode = { type: "basic_block", block: conditionBlock };

    let body: ControlNode;
    if (
      structure.type === ControlStructureType.DO_WHILE &&
      structure.conditionBlock === structure.headerBlock
    ) {
      body = { type: "basic_block", block: structure.headerBlock };
      processed.add(structure.headerBlock);
    } else {
      const bodyBlocksForSeq =
        structure.type === ControlStructureType.DO_WHILE &&
        structure.conditionBlock &&
        structure.conditionBlock !== structure.headerBlock
          ? structure.bodyBlocks.filter((b) => b !== structure.conditionBlock)
          : structure.type === ControlStructureType.FOR && structure.incrementBlock
            ? structure.bodyBlocks.filter((b) => b !== structure.incrementBlock)
            : structure.bodyBlocks;
      if (structure.type === ControlStructureType.FOR) {
        if (structure.initBlock) {
          processed.add(structure.initBlock);
        }
        if (structure.incrementBlock) {
          processed.add(structure.incrementBlock);
        }
      }
      if (structure.type === ControlStructureType.DO_WHILE) {
        this.buildingLoopHeaders.add(structure.headerBlock);
      }
      try {
        body = this.buildSequenceNode(bodyBlocksForSeq, procedure, processed);
      } finally {
        if (structure.type === ControlStructureType.DO_WHILE) {
          this.buildingLoopHeaders.delete(structure.headerBlock);
          processed.add(structure.headerBlock);
        }
      }
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
          ? { type: 'basic_block' as const, block: structure.incrementBlock }
          : null;
        const forNode: ControlNode = {
          type: 'for',
          init: initNode,
          condition: conditionNode,
          increment: incrementNode,
          body,
          loopExitBlock: structure.exitBlock,
          loopHeaderBlock: structure.headerBlock,
          forIncrementBlock: structure.incrementBlock ?? null,
        };
        // Loop exit often holds the next statement (`i = 0` before a following do-while).
        // Do not attach loop headers (e.g. a following do-while body entry) — those are structures.
        if (
          structure.exitBlock &&
          !structure.exitBlock.isLoopHeader &&
          structure.exitBlock.instructions.some(
            (i) =>
              i.code === OP_CPDOWNSP ||
              i.code === OP_CPDOWNBP ||
              i.code === OP_ACTION ||
              i.code === OP_JSR
          )
        ) {
          processed.add(structure.exitBlock);
          return {
            type: "sequence",
            nodes: [forNode, { type: "basic_block", block: structure.exitBlock }],
          };
        }
        return forNode;
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
   * Mark CMP-ladder blocks between the switch header and the first case/default arm so they
   * are not re-lowered as nested if/switch when the parent sequence walks body blocks.
   */
  private markSwitchDispatchLadderProcessed(
    structure: NWScriptControlStructure,
    processed: Set<NWScriptBasicBlock>
  ): void {
    const armEntries = new Set<NWScriptBasicBlock>();
    if (structure.switchCases) {
      for (const b of structure.switchCases.values()) {
        armEntries.add(b);
      }
    }
    if (structure.defaultBlock) {
      armEntries.add(structure.defaultBlock);
    }

    let cur: NWScriptBasicBlock | null = structure.headerBlock;
    let guard = 40;
    while (cur && guard-- > 0) {
      processed.add(cur);
      const na = cur.endInstruction?.nextInstr?.address;
      if (na === undefined) {
        break;
      }
      const next = this.cfg.getBlockForAddress(na);
      if (!next) {
        break;
      }
      if (next.startInstruction.address <= cur.startInstruction.address) {
        break;
      }
      if (armEntries.has(next)) {
        break;
      }
      if (structure.exitBlock && next === structure.exitBlock) {
        break;
      }
      cur = next;
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
    
    const armEntries = new Set<NWScriptBasicBlock>();
    if (structure.switchCases) {
      for (const b of structure.switchCases.values()) {
        armEntries.add(b);
      }
    }
    if (structure.defaultBlock) {
      armEntries.add(structure.defaultBlock);
    }

    // Build case nodes — include fallthrough-reachable blocks in each arm (multi-block cases).
    const cases: SwitchCase[] = [];
    if (structure.switchCases) {
      for (const [caseValue, caseBlock] of structure.switchCases.entries()) {
        const others = new Set(armEntries);
        others.delete(caseBlock);
        const armBlocks = Array.from(
          this.switchArmFallthroughBlocks(caseBlock, others, structure.exitBlock)
        );
        if (armBlocks.length === 0) {
          armBlocks.push(caseBlock);
        }
        const caseBody = this.buildSequenceNode(armBlocks, procedure, processed);
        cases.push({
          value: caseValue,
          body: caseBody
        });
      }
    }
    
    // Build default case if it exists
    const defaultCase = structure.defaultBlock
      ? (() => {
          const others = new Set(armEntries);
          others.delete(structure.defaultBlock!);
          const armBlocks = Array.from(
            this.switchArmFallthroughBlocks(
              structure.defaultBlock!,
              others,
              structure.exitBlock
            )
          );
          if (armBlocks.length === 0) {
            armBlocks.push(structure.defaultBlock!);
          }
          return this.buildSequenceNode(armBlocks, procedure, processed);
        })()
      : null;
    
    return {
      type: 'switch',
      expression: expressionNode,
      discriminantInstruction: structure.switchDiscriminantInstruction,
      cases: cases,
      defaultCase: defaultCase,
      switchExitBlock: structure.exitBlock,
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
}

