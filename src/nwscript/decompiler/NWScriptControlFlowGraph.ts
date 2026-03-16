import type { NWScript } from "../NWScript";
import type { NWScriptInstruction } from "../NWScriptInstruction";
import { NWScriptBasicBlock } from "./NWScriptBasicBlock";
import { NWScriptEdge, EdgeType } from "./NWScriptEdge";
import {
  OP_JMP, OP_JSR, OP_JZ, OP_JNZ, OP_RETN, OP_STORE_STATE, OP_STORE_STATEALL
} from '../NWScriptOPCodes';

/**
 * Control Flow Graph for NWScript decompilation.
 * Represents the control flow structure of a compiled NCS script.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptControlFlowGraph.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptControlFlowGraph {
  /**
   * The script this CFG represents
   */
  script: NWScript;

  /**
   * All basic blocks in the graph
   */
  blocks: Map<number, NWScriptBasicBlock> = new Map();

  /**
   * Map from instruction address to basic block
   */
  instructionToBlock: Map<number, NWScriptBasicBlock> = new Map();

  /**
   * The entry block (first instruction)
   */
  entryBlock: NWScriptBasicBlock | null = null;

  /**
   * All exit blocks (blocks ending with RETN or EOF)
   */
  exitBlocks: Set<NWScriptBasicBlock> = new Set();

  /**
   * Blocks that are targets of jumps (used for identifying loop headers)
   */
  jumpTargets: Set<number> = new Set();

  /**
   * Leader addresses (instruction addresses that start basic blocks)
   * Leaders include: entry, branch/call targets, callback entries, fallthrough after terminators, continuation after JSR
   */
  leaders: Set<number> = new Set();

  /**
   * Subroutine entry points (JSR targets)
   */
  subroutineEntries: Map<number, NWScriptBasicBlock> = new Map();

  /**
   * Subroutine return points (after JSR instructions)
   */
  subroutineReturns: Map<number, NWScriptBasicBlock> = new Map();

  /**
   * JMP targets that are part of STORE_STATE patterns (not function entries)
   * These are addresses where STORE_STATE+JMP jumps to (where outer ACTION calls happen)
   */
  storeStateJmpTargets: Set<number> = new Set();

  /**
   * Targets of JSR (subroutine entries, subject to filtering)
   */
  private jsrTargets: Set<number> = new Set();

  /**
   * Callback entry points created by STORE_STATE
   * Key: callback entry address (STORE_STATE_address + type)
   * Value: { storeStateAddress, savedGlobals, savedLocals }
   */
  callbackEntries: Map<number, { storeStateAddress: number; savedGlobals: number; savedLocals: number }> = new Map();

  /**
   * All edges in the graph with metadata
   */
  edges: Set<NWScriptEdge> = new Set();

  /**
   * Ordered list of edges (for deterministic iteration)
   */
  orderedEdges: NWScriptEdge[] = [];

  /**
   * Map from block pairs to edges
   */
  edgeMap: Map<string, NWScriptEdge> = new Map();

  /**
   * Back edges (edges where target dominates source)
   */
  backEdges: Set<NWScriptEdge> = new Set();

  /**
   * Critical edges (from has multiple successors, to has multiple predecessors)
   */
  criticalEdges: Set<NWScriptEdge> = new Set();

  /**
   * Block depths from entry (number of edges from entry)
   */
  blockDepths: Map<NWScriptBasicBlock, number> = new Map();

  /**
   * Natural loops (header -> set of blocks in loop)
   */
  naturalLoops: Map<NWScriptBasicBlock, Set<NWScriptBasicBlock>> = new Map();

  /**
   * Dominance frontiers (block -> set of blocks in its dominance frontier)
   */
  dominanceFrontiers: Map<NWScriptBasicBlock, Set<NWScriptBasicBlock>> = new Map();

  /**
   * Control dependences (block -> set of blocks that are control-dependent on it)
   */
  controlDependences: Map<NWScriptBasicBlock, Set<NWScriptBasicBlock>> = new Map();

  /**
   * Reverse control flow graph (cached)
   */
  reverseCFG: NWScriptControlFlowGraph | null = null;

  /**
   * Loop nesting tree (block -> parent loop header, null if not in a loop)
   */
  loopNestingTree: Map<NWScriptBasicBlock, NWScriptBasicBlock | null> = new Map();

  /**
   * Loop depth for each block (0 = not in a loop, 1 = outermost loop, etc.)
   */
  loopDepth: Map<NWScriptBasicBlock, number> = new Map();

  /**
   * Cached reachability: block -> set of blocks reachable from it
   */
  reachableFrom: Map<NWScriptBasicBlock, Set<NWScriptBasicBlock>> = new Map();

  /**
   * Cached reverse reachability: block -> set of blocks that can reach it
   */
  reachesTo: Map<NWScriptBasicBlock, Set<NWScriptBasicBlock>> = new Map();

  /**
   * Call edges (explicit tracking)
   */
  callEdges: Set<NWScriptEdge> = new Set();

  /**
   * Return edges (explicit tracking)
   */
  returnEdges: Set<NWScriptEdge> = new Set();

  /**
   * Invalidation flags for cached computations
   */
  private invalidated: Set<string> = new Set();

  constructor(script: NWScript) {
    this.script = script;
  }

  /**
   * Build the control flow graph from the script's instructions
   */
  build(): void {
    this.blocks.clear();
    this.instructionToBlock.clear();
    this.jumpTargets.clear();
    this.jsrTargets.clear();
    this.leaders.clear();
    this.subroutineEntries.clear();
    this.subroutineReturns.clear();
    this.exitBlocks.clear();
    this.storeStateJmpTargets.clear();
    this.callbackEntries.clear();
    this.edges.clear();
    this.orderedEdges = [];
    this.edgeMap.clear();
    this.backEdges.clear();
    this.criticalEdges.clear();
    this.blockDepths.clear();
    this.naturalLoops.clear();
    this.dominanceFrontiers.clear();
    this.controlDependences.clear();
    this.reverseCFG = null;
    this.loopNestingTree.clear();
    this.loopDepth.clear();
    this.reachableFrom.clear();
    this.reachesTo.clear();
    this.callEdges.clear();
    this.returnEdges.clear();
    this.invalidated.clear();

    if (!this.script.instructions || this.script.instructions.size === 0) {
      return;
    }

    // Step 1: Identify all jump targets and subroutine entries
    this.identifyJumpTargets();
    
    // Step 1.5: Identify STORE_STATE+JMP targets and callback entries (these are NOT function entries)
    this.identifyStoreStateJmpTargets();
    
    // Step 1.6: Compute leader set (entry, branch/call targets, callback entries, fallthrough after terminators, continuation after JSR)
    this.computeLeaders();

    // Step 2: Build basic blocks using leaders
    this.buildBasicBlocks();

    // Step 2.5: Map JSR return blocks (must be done after all blocks are built)
    this.mapJsrReturnBlocks();

    // Step 3: Connect blocks with edges
    this.connectBlocks();

    // Step 4: Identify entry and exit blocks
    this.identifyEntryAndExitBlocks();

    // Step 5: Compute dominators (for loop detection and conversion)
    // Note: Loop identification is done by NWScriptControlStructureBuilder, not here
    this.computeDominators();

    // Step 6: Compute post-dominators (for merge point detection and unreachable code)
    this.computePostDominators();

    // Step 7: Identify unreachable code
    this.identifyUnreachableCode();

    // Step 8: Build edge information with types
    this.buildEdges();

    // Step 9: Identify back edges
    this.identifyBackEdges();

    // Step 10: Identify critical edges
    this.identifyCriticalEdges();

    // Step 11: Compute block depths
    this.computeBlockDepths();

    // Step 12: Identify natural loops
    this.identifyNaturalLoops();

    // Step 13: Validate post-dominators
    this.validatePostDominators();

    // Step 14: Compute dominance frontiers
    this.computeDominanceFrontiers();

    // Step 15: Compute control dependences
    this.computeControlDependences();

    // Step 16: Build loop nesting tree
    this.buildLoopNestingTree();

    // Step 17: Cache reachability sets
    this.computeReachabilitySets();

    // Step 18: Track inter-procedural edges
    this.trackInterProceduralEdges();
  }

  /**
   * Identify all addresses that are targets of jumps
   * According to documentation:
   * - JMP: Jump to relative address
   * - JSR: Jump to subroutine at relative address, return to next instruction
   * - JZ: Jump if top of stack is zero
   * - JNZ: Jump if top of stack is non-zero
   */
  private identifyJumpTargets(): void {
    for (const instruction of this.script.instructions.values()) {
      let targetAddress: number | null = null;

      switch (instruction.code) {
        case OP_JMP:
        case OP_JSR:
        case OP_JZ:
        case OP_JNZ:
          if (instruction.offset !== undefined) {
            targetAddress = instruction.address + instruction.offset;
            this.jumpTargets.add(targetAddress);
            if (instruction.code === OP_JSR) {
              this.jsrTargets.add(targetAddress);
            }
          }
          break;
      }

      // For JSR, also mark the return point (next instruction)
      if (instruction.code === OP_JSR && instruction.nextInstr) {
        this.subroutineReturns.set(instruction.address, null as any);
      }
    }
  }

  /**
   * Identify JMP targets and callback entries that are part of STORE_STATE patterns
   * These should NOT be treated as function entries
   * Documentation: "STORE_STATE - Store the Current Stack State... This byte code is always followed by a JMP and then a block of code to be executed by a later function such as a DelayCommand."
   * 
   * CRITICAL: The `type` field of STORE_STATE is the offset to the callback entry point.
   * Callback entry = STORE_STATE_address + instruction.type
   */
  private identifyStoreStateJmpTargets(): void {
    this.storeStateJmpTargets.clear();
    this.callbackEntries.clear();
    
    for (const instruction of this.script.instructions.values()) {
      if (instruction.code === OP_STORE_STATE || instruction.code === OP_STORE_STATEALL) {
        // The type field is the callback offset
        // Callback entry = STORE_STATE_address + type
        const callbackEntry = instruction.address + instruction.type;
        
        // Track callback entry
        if (instruction.code === OP_STORE_STATE) {
          // STORE_STATE has bpOffset (saved globals) and spOffset (saved locals)
          const savedGlobals = instruction.bpOffset || 0;
          const savedLocals = instruction.spOffset || 0;
          this.callbackEntries.set(callbackEntry, {
            storeStateAddress: instruction.address,
            savedGlobals: savedGlobals,
            savedLocals: savedLocals
          });
        } else {
          // STORE_STATEALL (obsolete, no size parameters)
          this.callbackEntries.set(callbackEntry, {
            storeStateAddress: instruction.address,
            savedGlobals: 0,
            savedLocals: 0
          });
        }
        
        // Track JMP target (where outer ACTION call happens)
        const nextInstr = instruction.nextInstr;
        if (nextInstr && nextInstr.code === OP_JMP && nextInstr.offset !== undefined) {
          const jmpTarget = nextInstr.address + nextInstr.offset;
          this.storeStateJmpTargets.add(jmpTarget);
        }
      }
    }
  }

  /**
   * Compute the leader set for basic block construction.
   * Leaders are instruction addresses that start basic blocks:
   * - Entry point (address 0)
   * - All branch/call targets (JMP, JSR, JZ, JNZ targets)
   * - Callback entries (from STORE_STATE)
   * - Fallthrough after any terminator (JMP/JZ/JNZ/JSR/RETN/EOF)
   * - Continuation after JSR (return point)
   */
  private computeLeaders(): void {
    this.leaders.clear();

    // Get all instructions sorted by address
    const sortedInstructions = Array.from(this.script.instructions.values())
      .sort((a, b) => a.address - b.address);

    // 1. Entry point (address 0)
    if (sortedInstructions.length > 0 && sortedInstructions[0].address === 0) {
      this.leaders.add(0);
    }

    // 2. All branch/call targets
    for (const addr of this.jumpTargets) {
      this.leaders.add(addr);
    }

    // 3. Callback entries
    for (const callbackEntry of this.callbackEntries.keys()) {
      this.leaders.add(callbackEntry);
    }

    // 4. Fallthrough after terminators (JMP/JZ/JNZ/JSR/RETN/EOF)
    // This includes continuation after JSR (return point)
    for (const instruction of sortedInstructions) {
      if (this.isTerminator(instruction)) {
        // Add fallthrough (next instruction after terminator)
        // For JSR, this is the return point
        // For JMP, this is the unreachable fallthrough (but still a leader)
        if (instruction.nextInstr) {
          this.leaders.add(instruction.nextInstr.address);
        }
      }
    }

    // 5. Continuation after JSR (return point)
    // for (const instruction of sortedInstructions) {
    //   if (instruction.code === OP_JSR && instruction.nextInstr) {
    //     this.leaders.add(instruction.nextInstr.address);
    //   }
    // }
  }

  /**
   * Check if an instruction is a terminator (ends a basic block)
   */
  private isTerminator(instruction: NWScriptInstruction): boolean {
    return instruction.code === OP_JMP ||
           instruction.code === OP_JSR ||
           instruction.code === OP_JZ ||
           instruction.code === OP_JNZ ||
           instruction.code === OP_RETN;
  }

  /**
   * Build basic blocks from instructions using leaders.
   * A basic block is a sequence of instructions from a leader until:
   * - A terminator (JMP/JZ/JNZ/JSR/RETN/EOF)
   * - The next leader
   * 
   * Special handling: STORE_STATE+JMP is consumed as a single block.
   */
  private buildBasicBlocks(): void {
    let blockId = 0;

    // Get instructions sorted by address and create address-to-instruction map
    const sortedInstructions = Array.from(this.script.instructions.values())
      .sort((a, b) => a.address - b.address);
    const instructionMap = new Map<number, NWScriptInstruction>();
    for (const instr of sortedInstructions) {
      instructionMap.set(instr.address, instr);
    }

    // Get sorted leader addresses
    const sortedLeaders = Array.from(this.leaders).sort((a, b) => a - b);

    // Build blocks using index-based iteration over leaders
    for (let i = 0; i < sortedLeaders.length; i++) {
      const leaderAddr = sortedLeaders[i];
      const leaderInstr = instructionMap.get(leaderAddr);
      if (!leaderInstr) continue;

      // Check if this is a STORE_STATE+JMP pattern
      if (leaderInstr.code === OP_STORE_STATE || leaderInstr.code === OP_STORE_STATEALL) {
        const nextInstr = leaderInstr.nextInstr;
        if (nextInstr && nextInstr.code === OP_JMP) {
          // Create block for STORE_STATE+JMP
          const block = new NWScriptBasicBlock(blockId++, leaderInstr);
          block.addInstruction(nextInstr);
          block.endInstruction = nextInstr;
          block.exitType = 'jump';
          
          this.blocks.set(block.id, block);
          this.instructionToBlock.set(leaderInstr.address, block);
          this.instructionToBlock.set(nextInstr.address, block);
          
          // Mark as entry if address 0
          if (leaderInstr.address === 0) {
            this.entryBlock = block;
            block.isEntry = true;
          }
          
          continue;
        }
      }

      // Create block starting at this leader
      const block = new NWScriptBasicBlock(blockId++, leaderInstr);
      this.blocks.set(block.id, block);
      this.instructionToBlock.set(leaderAddr, block);

      // Mark as entry if address 0
      if (leaderAddr === 0) {
        this.entryBlock = block;
        block.isEntry = true;
      }

      // Check if this is a subroutine entry
      if (this.jsrTargets.has(leaderAddr) && 
          !this.storeStateJmpTargets.has(leaderAddr) &&
          !this.callbackEntries.has(leaderAddr)) {
        this.subroutineEntries.set(leaderAddr, block);
      }

      // Add instructions to block until terminator or next leader
      let currentInstr = leaderInstr;
      const nextLeaderAddr = i + 1 < sortedLeaders.length ? sortedLeaders[i + 1] : null;

      while (currentInstr) {
        // Stop if we hit a terminator
        if (this.isTerminator(currentInstr)) {
          // Add the terminator instruction to the block before setting it as end
          if (currentInstr !== leaderInstr) {
            block.addInstruction(currentInstr);
            this.instructionToBlock.set(currentInstr.address, block);
          }
          
          block.endInstruction = currentInstr;
          
          switch (currentInstr.code) {
            case OP_JMP:
              block.exitType = 'jump';
              break;
            case OP_JSR:
              block.exitType = 'call';
              // Note: return block mapping will be done after all blocks are built
              break;
            case OP_JZ:
            case OP_JNZ:
              block.exitType = 'conditional';
              block.conditionInstruction = currentInstr;
              break;
            case OP_RETN:
              block.exitType = 'return';
              block.isExit = true;
              this.exitBlocks.add(block);
              break;
          }
          break;
        }

        // Stop if we've reached the next leader
        if (nextLeaderAddr !== null && currentInstr.nextInstr && 
            currentInstr.nextInstr.address >= nextLeaderAddr) {
          block.endInstruction = currentInstr;
          block.exitType = 'fallthrough';
          break;
        }

        // Add instruction to block
        if (currentInstr !== leaderInstr) {
          block.addInstruction(currentInstr);
          this.instructionToBlock.set(currentInstr.address, block);
        }

        // Move to next instruction
        currentInstr = currentInstr.nextInstr;
      }
    }
  }

  /**
   * Map JSR return blocks after all blocks are built
   * This ensures return blocks exist when we try to map them
   */
  private mapJsrReturnBlocks(): void {
    for (const instruction of this.script.instructions.values()) {
      if (instruction.code === OP_JSR && instruction.nextInstr) {
        const returnBlock = this.instructionToBlock.get(instruction.nextInstr.address);
        if (returnBlock) {
          this.subroutineReturns.set(instruction.address, returnBlock);
        }
      }
    }
  }

  /**
   * Connect basic blocks with control flow edges using deterministic edge emission.
   * Edges are created with explicit EdgeType and ordered successors.
   * According to documentation:
   * - JMP: Single successor (jump target)
   * - JSR: Two successors (subroutine entry [CALL] and return point [RETURN])
   * - JZ/JNZ: Two successors (jump target [TRUE_BRANCH/FALSE_BRANCH] and fallthrough)
   * - RETN: No successors (returns to caller implicitly)
   */
  private connectBlocks(): void {
    // Process blocks in deterministic order (by start address)
    const sortedBlocks = Array.from(this.blocks.values())
      .sort((a, b) => a.startInstruction.address - b.startInstruction.address);

    for (const block of sortedBlocks) {
      const lastInstr = block.endInstruction;
      if (!lastInstr) continue;

      const successors: { block: NWScriptBasicBlock; type: EdgeType; condition?: boolean }[] = [];

      switch (lastInstr.code) {
        case OP_JMP:
          // Documentation: "JMP - Jump to a New Location... Change the current execution address to the relative address given"
          if (lastInstr.offset !== undefined) {
            const targetAddr = lastInstr.address + lastInstr.offset;
            const targetBlock = this.instructionToBlock.get(targetAddr);
            if (targetBlock) {
              successors.push({ block: targetBlock, type: EdgeType.JUMP });
            }
          }
          break;

        case OP_JSR:
          // Documentation: "JSR - Jump to Subroutine... Jump to the subroutine at the relative address given in the instruction"
          // The JSR block should connect to:
          // 1. The subroutine entry (JSR target) - CALL edge
          // 2. The return point (next instruction after JSR) - RETURN edge
          if (lastInstr.offset !== undefined) {
            const targetAddr = lastInstr.address + lastInstr.offset;
            const targetBlock = this.instructionToBlock.get(targetAddr);
            if (targetBlock) {
              successors.push({ block: targetBlock, type: EdgeType.CALL });
            }
          }
          // Return point (next instruction after JSR)
          if (lastInstr.nextInstr) {
            const returnBlock = this.instructionToBlock.get(lastInstr.nextInstr.address);
            if (returnBlock) {
              successors.push({ block: returnBlock, type: EdgeType.RETURN });
            }
          }
          break;

        case OP_JZ:
        case OP_JNZ:
          // Documentation: "JZ - Jump if Top of Stack is Zero... Change the current execution address... if the integer on the top of the stack is zero"
          // Documentation: "JNZ - Jump if Top of Stack is Non-Zero... Change the current execution address... if the integer on the top of the stack is non-zero"
          // Conditional branch: add both true and false paths
          // Order: jump target first (if condition true for JNZ, false for JZ), then fallthrough
          if (lastInstr.offset !== undefined) {
            const targetAddr = lastInstr.address + lastInstr.offset;
            const targetBlock = this.instructionToBlock.get(targetAddr);
            if (targetBlock) {
              const isTrueBranch = lastInstr.code === OP_JNZ;
              successors.push({ 
                block: targetBlock, 
                type: isTrueBranch ? EdgeType.TRUE_BRANCH : EdgeType.FALSE_BRANCH,
                condition: isTrueBranch
              });
            }
          }
          // Fallthrough path
          if (lastInstr.nextInstr) {
            const fallthroughBlock = this.instructionToBlock.get(lastInstr.nextInstr.address);
            if (fallthroughBlock) {
              const isTrueBranch = lastInstr.code === OP_JZ;
              successors.push({ 
                block: fallthroughBlock, 
                type: isTrueBranch ? EdgeType.TRUE_BRANCH : EdgeType.FALSE_BRANCH,
                condition: isTrueBranch
              });
            }
          }
          break;

        case OP_RETN:
          // Documentation: "RETN - Return from a JSR... Return from a JSR. All arguments used to invoke the subroutine should be removed prior to the RETN."
          // RETN returns to the caller implicitly (no explicit edge needed in CFG)
          // The return happens through the call stack, not through CFG edges
          // No successors for return
          break;

        default:
          // Fallthrough to next instruction
          if (lastInstr.nextInstr) {
            const nextBlock = this.instructionToBlock.get(lastInstr.nextInstr.address);
            if (nextBlock) {
              successors.push({ block: nextBlock, type: EdgeType.FALLTHROUGH });
            }
          }
          break;
      }

      // Schedule callback edges: STORE_STATE+JMP blocks should have edges to callback entries
      // This is optional but useful for tracking callback relationships
      if (block.startInstruction.code === OP_STORE_STATE || block.startInstruction.code === OP_STORE_STATEALL) {
        const callbackEntry = block.startInstruction.address + block.startInstruction.type;
        const callbackBlock = this.instructionToBlock.get(callbackEntry);
        if (callbackBlock && !successors.some(s => s.block === callbackBlock)) {
          // Add callback edge (using CALL type for now, could be a separate CALLBACK type)
          successors.push({ block: callbackBlock, type: EdgeType.CALL });
        }
      }

      // Add successors in deterministic order (by address)
      successors.sort((a, b) => a.block.startInstruction.address - b.block.startInstruction.address);
      
      for (const succ of successors) {
        block.addSuccessor(succ.block);
      }
    }
  }

  /**
   * Identify entry and exit blocks
   * Documentation:
   * - Entry: First instruction (address 0)
   * - Exit: Blocks ending with RETN or EOF, or blocks with no successors
   */
  private identifyEntryAndExitBlocks(): void {
    // Entry block is already identified
    // Exit blocks are blocks with no successors or ending with RETN
    // Documentation: "RETN - Return from a JSR" marks the end of a subroutine
    for (const block of this.blocks.values()) {
      if (block.successors.size === 0 || block.isExit) {
        this.exitBlocks.add(block);
        block.isExit = true;
      }
    }
  }

  /**
   * Compute dominators for each block, ignoring CALL edges (and optionally RETURN edges)
   * A block A dominates block B if all intra-procedural paths from entry to B go through A
   * @param _excludeReturn Whether to also exclude RETURN edges (default: false)
   */
  private computeDominators(_excludeReturn: boolean = false): void {
    if (!this.entryBlock) return;

    // Initialize: entry block dominates itself
    for (const block of this.blocks.values()) {
      if (block === this.entryBlock) {
        block.dominators.add(block);
      } else {
        // Initially, all blocks are dominated by all blocks
        for (const otherBlock of this.blocks.values()) {
          block.dominators.add(otherBlock);
        }
      }
    }

    // Iterative algorithm to compute dominators using intra-procedural edges only
    let changed = true;
    while (changed) {
      changed = false;
      for (const block of this.blocks.values()) {
        if (block === this.entryBlock) continue;

        const newDominators = new Set<NWScriptBasicBlock>();
        // Intersection of all intra-procedural predecessors' dominators
        const intraPreds = this.getIntraProceduralPredecessors(block, false);
        if (intraPreds.length > 0) {
          const firstPred = intraPreds[0];
          for (const dom of firstPred.dominators) {
            newDominators.add(dom);
          }
          
          for (const pred of intraPreds) {
            const toRemove: NWScriptBasicBlock[] = [];
            for (const dom of newDominators) {
              if (!pred.dominators.has(dom)) {
                toRemove.push(dom);
              }
            }
            for (const dom of toRemove) {
              newDominators.delete(dom);
            }
          }
        }
        
        // Add self
        newDominators.add(block);

        if (newDominators.size !== block.dominators.size ||
            !Array.from(newDominators).every(d => block.dominators.has(d))) {
          block.dominators = newDominators;
          changed = true;
        }
      }
    }
  }


  /**
   * Compute post-dominators for each block, ignoring CALL edges (and optionally RETURN edges)
   * A block A post-dominates block B if all intra-procedural paths from B to any exit go through A
   * This is the reverse of dominators - we work backwards from exit blocks
   * @param excludeReturn Whether to also exclude RETURN edges (default: false)
   */
  private computePostDominators(excludeReturn: boolean = false): void {
    if (this.exitBlocks.size === 0) return;

    // Initialize: exit blocks post-dominate themselves
    for (const block of this.blocks.values()) {
      if (this.exitBlocks.has(block)) {
        block.postDominators.add(block);
      } else {
        // Initially, all blocks are post-dominated by all blocks
        for (const otherBlock of this.blocks.values()) {
          block.postDominators.add(otherBlock);
        }
      }
    }

    // Iterative algorithm to compute post-dominators using intra-procedural edges only
    let changed = true;
    while (changed) {
      changed = false;
      for (const block of this.blocks.values()) {
        if (this.exitBlocks.has(block)) continue;

        const newPostDominators = new Set<NWScriptBasicBlock>();
        // Intersection of all intra-procedural successors' post-dominators
        const intraSuccs = this.getIntraProceduralSuccessors(block, excludeReturn);
        if (intraSuccs.length > 0) {
          const firstSucc = intraSuccs[0];
          for (const postDom of firstSucc.postDominators) {
            newPostDominators.add(postDom);
          }
          
          for (const succ of intraSuccs) {
            const toRemove: NWScriptBasicBlock[] = [];
            for (const postDom of newPostDominators) {
              if (!succ.postDominators.has(postDom)) {
                toRemove.push(postDom);
              }
            }
            for (const postDom of toRemove) {
              newPostDominators.delete(postDom);
            }
          }
        }
        
        // Add self
        newPostDominators.add(block);

        if (newPostDominators.size !== block.postDominators.size ||
            !Array.from(newPostDominators).every(pd => block.postDominators.has(pd))) {
          block.postDominators = newPostDominators;
          changed = true;
        }
      }
    }
  }

  /**
   * Identify unreachable code (blocks that cannot be reached from the entry block)
   */
  private identifyUnreachableCode(): void {
    if (!this.entryBlock) {
      // If there's no entry block, mark all blocks as unreachable
      for (const block of this.blocks.values()) {
        block.isUnreachable = true;
      }
      return;
    }

    // Mark all blocks as unreachable initially
    for (const block of this.blocks.values()) {
      block.isUnreachable = true;
    }

    // BFS from entry block to mark all reachable blocks
    const visited = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [this.entryBlock];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      // Mark as reachable
      current.isUnreachable = false;

      for (const successor of current.successors) {
        if (!visited.has(successor)) {
          queue.push(successor);
        }
      }
    }

    // Also mark blocks reachable from subroutine entries as reachable
    // (they're reachable via JSR calls)
    for (const [_entryAddress, entryBlock] of this.subroutineEntries) {
      if (entryBlock.isUnreachable) {
        // This subroutine might be called, so mark it as reachable
        // We'll do a BFS from this entry point too
        const subVisited = new Set<NWScriptBasicBlock>();
        const subQueue: NWScriptBasicBlock[] = [entryBlock];

        while (subQueue.length > 0) {
          const current = subQueue.shift()!;
          if (subVisited.has(current)) continue;
          subVisited.add(current);

          current.isUnreachable = false;

          for (const successor of current.successors) {
            if (!subVisited.has(successor)) {
              subQueue.push(successor);
            }
          }
        }
      }
    }
  }

  /**
   * Check if a block is unreachable from the entry
   * Uses the cached isUnreachable property for efficiency
   */
  isUnreachable(block: NWScriptBasicBlock): boolean {
    return block.isUnreachable;
  }

  /**
   * Get all unreachable blocks
   */
  getUnreachableBlocks(): NWScriptBasicBlock[] {
    const unreachable: NWScriptBasicBlock[] = [];
    for (const block of this.blocks.values()) {
      if (this.isUnreachable(block)) {
        unreachable.push(block);
      }
    }
    return unreachable;
  }

  /**
   * Check if an instruction is a control flow instruction
   * According to documentation, control flow instructions are:
   * - JMP: Unconditional jump
   * - JSR: Subroutine call
   * - JZ: Conditional jump (if zero)
   * - JNZ: Conditional jump (if non-zero)
   * - RETN: Return from subroutine
   * - EOF: End of file
   */
  private isControlFlowInstruction(instruction: NWScriptInstruction): boolean {
    return instruction.code === OP_JMP ||
           instruction.code === OP_JSR ||
           instruction.code === OP_JZ ||
           instruction.code === OP_JNZ ||
           instruction.code === OP_RETN;
  }

  /**
   * Validate the CFG against the NCS format documentation
   * Returns an array of validation errors (empty if valid)
   */
  validate(): string[] {
    const errors: string[] = [];

    // Validate entry block
    if (!this.entryBlock) {
      errors.push('CFG Validation Error: No entry block found (expected instruction at address 0)');
    } else if (this.entryBlock.startInstruction.address !== 0) {
      errors.push(`CFG Validation Error: Entry block should start at address 0, but starts at ${this.entryBlock.startInstruction.address}`);
    }

    // Validate exit blocks
    if (this.exitBlocks.size === 0) {
      errors.push('CFG Validation Error: No exit blocks found (expected at least one RETN or EOF)');
    }

    // Validate JSR connections
    for (const [jsrAddress, returnBlock] of this.subroutineReturns) {
      const jsrInstr = this.script.instructions.get(jsrAddress);
      if (!jsrInstr) {
        errors.push(`CFG Validation Error: JSR instruction at address ${jsrAddress} not found`);
        continue;
      }

      if (jsrInstr.code !== OP_JSR) {
        errors.push(`CFG Validation Error: Instruction at address ${jsrAddress} is not a JSR`);
        continue;
      }

      // Check that JSR has a return point (next instruction)
      if (!jsrInstr.nextInstr) {
        errors.push(`CFG Validation Error: JSR at address ${jsrAddress} has no return point (next instruction)`);
      } else if (!returnBlock) {
        errors.push(`CFG Validation Error: JSR at address ${jsrAddress} has no return block mapped`);
      }

      // Check that JSR block connects to both subroutine entry and return point
      const jsrBlock = this.instructionToBlock.get(jsrAddress);
      if (jsrBlock) {
        if (jsrInstr.offset !== undefined) {
          const targetAddr = jsrInstr.address + jsrInstr.offset;
          const targetBlock = this.instructionToBlock.get(targetAddr);
          if (targetBlock && !jsrBlock.successors.has(targetBlock)) {
            errors.push(`CFG Validation Error: JSR block at address ${jsrAddress} does not connect to subroutine entry at ${targetAddr}`);
          }
        }

        if (jsrInstr.nextInstr && returnBlock && !jsrBlock.successors.has(returnBlock)) {
          errors.push(`CFG Validation Error: JSR block at address ${jsrAddress} does not connect to return point at ${jsrInstr.nextInstr.address}`);
        }
      }
    }

    // Validate STORE_STATE+JMP patterns
    for (const instruction of this.script.instructions.values()) {
      if (instruction.code === OP_STORE_STATE || instruction.code === OP_STORE_STATEALL) {
        const nextInstr = instruction.nextInstr;
        if (!nextInstr) {
          errors.push(`CFG Validation Error: STORE_STATE/STORE_STATEALL at address ${instruction.address} is not followed by an instruction`);
        } else if (nextInstr.code !== OP_JMP) {
          errors.push(`CFG Validation Error: STORE_STATE/STORE_STATEALL at address ${instruction.address} is not followed by JMP (found ${nextInstr.codeName || nextInstr.code})`);
        } else if (nextInstr.offset !== undefined) {
          const jmpTarget = nextInstr.address + nextInstr.offset;
          if (!this.storeStateJmpTargets.has(jmpTarget)) {
            errors.push(`CFG Validation Error: STORE_STATE+JMP target at address ${jmpTarget} is not marked as a STORE_STATE target`);
          }
          // Check that STORE_STATE JMP target is not treated as a function entry
          if (this.subroutineEntries.has(jmpTarget)) {
            errors.push(`CFG Validation Error: STORE_STATE+JMP target at address ${jmpTarget} is incorrectly marked as a subroutine entry`);
          }
        }
      }
    }

    // Validate RETN blocks have no successors
    for (const block of this.blocks.values()) {
      if (block.endInstruction && block.endInstruction.code === OP_RETN) {
        if (block.successors.size > 0) {
          errors.push(`CFG Validation Error: RETN block ${block.id} has ${block.successors.size} successors (should have 0)`);
        }
        if (!block.isExit) {
          errors.push(`CFG Validation Error: RETN block ${block.id} is not marked as exit`);
        }
      }
    }

    // Validate all instructions are in blocks
    for (const instruction of this.script.instructions.values()) {
      if (!this.instructionToBlock.has(instruction.address)) {
        errors.push(`CFG Validation Error: Instruction at address ${instruction.address} is not in any block`);
      }
    }

    // Validate all leaders have corresponding blocks
    for (const leaderAddr of this.leaders) {
      if (!this.instructionToBlock.has(leaderAddr)) {
        errors.push(`CFG Validation Error: Leader at address ${leaderAddr} does not have a corresponding block`);
      }
    }

    // Validate unreachable code marking
    if (this.entryBlock) {
      for (const block of this.blocks.values()) {
        // Recompute to validate cached property
        const visited = new Set<NWScriptBasicBlock>();
        const queue: NWScriptBasicBlock[] = [this.entryBlock!];
        let computedUnreachable = true;

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (current === block) {
            computedUnreachable = false;
            break;
          }
          if (visited.has(current)) continue;
          visited.add(current);

          for (const successor of current.successors) {
            if (!visited.has(successor)) {
              queue.push(successor);
            }
          }
        }

        if (block.isUnreachable !== computedUnreachable) {
          errors.push(`CFG Validation Error: Block ${block.id} has inconsistent unreachable marking (marked: ${block.isUnreachable}, computed: ${computedUnreachable})`);
        }
      }
    }

    // Validate back edges
    for (const backEdge of this.backEdges) {
      if (!this.dominates(backEdge.to, backEdge.from)) {
        errors.push(`CFG Validation Error: Edge ${backEdge.from.id}->${backEdge.to.id} is marked as back edge but target does not dominate source`);
      }
    }

    // Validate natural loops
    for (const [header, loopBlocks] of this.naturalLoops) {
      if (!header.isLoopHeader) {
        errors.push(`CFG Validation Error: Block ${header.id} has natural loop but is not marked as loop header`);
      }
      for (const block of loopBlocks) {
        if (block !== header && !block.isLoopBody) {
          errors.push(`CFG Validation Error: Block ${block.id} is in natural loop of ${header.id} but is not marked as loop body`);
        }
      }
    }

    // Validate block depths
    if (this.entryBlock) {
      const entryDepth = this.getBlockDepth(this.entryBlock);
      if (entryDepth !== 0) {
        errors.push(`CFG Validation Error: Entry block depth should be 0, but is ${entryDepth}`);
      }
    }

    return errors;
  }

  /**
   * Get the basic block containing a specific instruction address
   */
  getBlockForAddress(address: number): NWScriptBasicBlock | null {
    return this.instructionToBlock.get(address) || null;
  }

  /**
   * Get all blocks in topological order (for conversion)
   */
  getTopologicalOrder(): NWScriptBasicBlock[] {
    const visited = new Set<NWScriptBasicBlock>();
    const result: NWScriptBasicBlock[] = [];

    const visit = (block: NWScriptBasicBlock) => {
      if (visited.has(block)) return;
      visited.add(block);

      for (const successor of block.successors) {
        visit(successor);
      }

      result.push(block);
    };

    if (this.entryBlock) {
      visit(this.entryBlock);
    }

    return result.reverse();
  }

  /**
   * Get blocks in reverse post-order (for analysis)
   */
  getReversePostOrder(): NWScriptBasicBlock[] {
    return this.getTopologicalOrder().reverse();
  }

  /**
   * Find the immediate dominator of a block
   */
  getImmediateDominator(block: NWScriptBasicBlock): NWScriptBasicBlock | null {
    if (block === this.entryBlock) return null;

    let idom: NWScriptBasicBlock | null = null;
    for (const dom of block.dominators) {
      if (dom === block) continue;
      if (!idom || this.dominates(dom, idom)) {
        idom = dom;
      }
    }
    return idom;
  }

  /**
   * Check if block A dominates block B
   */
  dominates(blockA: NWScriptBasicBlock, blockB: NWScriptBasicBlock): boolean {
    return blockB.dominators.has(blockA);
  }

  /**
   * Check if block A post-dominates block B
   */
  postDominates(blockA: NWScriptBasicBlock, blockB: NWScriptBasicBlock): boolean {
    return blockB.postDominators.has(blockA);
  }

  /**
   * Find the immediate post-dominator of a block
   */
  getImmediatePostDominator(block: NWScriptBasicBlock): NWScriptBasicBlock | null {
    if (this.exitBlocks.has(block)) return null;

    let ipdom: NWScriptBasicBlock | null = null;
    for (const postDom of block.postDominators) {
      if (postDom === block) continue;
      if (!ipdom || this.postDominates(postDom, ipdom)) {
        ipdom = postDom;
      }
    }
    return ipdom;
  }

  /**
   * Build edge information with types and ordered edge list
   * Uses edge type information from connectBlocks() when available
   */
  private buildEdges(): void {
    this.edges.clear();
    this.orderedEdges = [];
    this.edgeMap.clear();

    // Process blocks in deterministic order (by start address)
    const sortedBlocks = Array.from(this.blocks.values())
      .sort((a, b) => a.startInstruction.address - b.startInstruction.address);

    for (const block of sortedBlocks) {
      const lastInstr = block.endInstruction;
      if (!lastInstr) continue;

      // Get ordered successors (already sorted in connectBlocks)
      const orderedSuccessors = this.getOrderedSuccessors(block);

      for (const successor of orderedSuccessors) {
        let edgeType: EdgeType = EdgeType.FALLTHROUGH;
        let condition: boolean | undefined = undefined;

        // Check if this is a callback edge first (STORE_STATE blocks)
        if ((block.startInstruction.code === OP_STORE_STATE || block.startInstruction.code === OP_STORE_STATEALL) &&
            this.callbackEntries.has(successor.startInstruction.address)) {
          edgeType = EdgeType.CALL; // Callback edge
        } else {
          // Determine edge type based on block exit type
          switch (block.exitType) {
            case 'jump':
              edgeType = EdgeType.JUMP;
              break;
            case 'call':
              // Check if this is the call target or return point
              if (lastInstr.code === OP_JSR && lastInstr.offset !== undefined) {
                const targetAddr = lastInstr.address + lastInstr.offset;
                if (successor.startInstruction.address === targetAddr) {
                  edgeType = EdgeType.CALL;
                } else {
                  edgeType = EdgeType.RETURN;
                }
              }
              break;
            case 'conditional':
              // Determine if this is true or false branch
              if (lastInstr.code === OP_JZ || lastInstr.code === OP_JNZ) {
                const targetAddr = lastInstr.offset !== undefined 
                  ? lastInstr.address + lastInstr.offset 
                  : null;
                
                if (targetAddr !== null && successor.startInstruction.address === targetAddr) {
                  // This is the jump target
                  edgeType = lastInstr.code === OP_JZ ? EdgeType.FALSE_BRANCH : EdgeType.TRUE_BRANCH;
                  condition = lastInstr.code === OP_JNZ;
                } else {
                  // This is the fallthrough
                  edgeType = lastInstr.code === OP_JZ ? EdgeType.TRUE_BRANCH : EdgeType.FALSE_BRANCH;
                  condition = lastInstr.code === OP_JZ;
                }
              }
              break;
            case 'return':
              edgeType = EdgeType.RETURN;
              break;
            default:
              edgeType = EdgeType.FALLTHROUGH;
          }
        }

        const edge = new NWScriptEdge(block, successor, edgeType);
        if (condition !== undefined) {
          edge.condition = condition;
        }

        this.edges.add(edge);
        this.orderedEdges.push(edge);
        const edgeKey = `${block.id}->${successor.id}`;
        this.edgeMap.set(edgeKey, edge);

        // Track call and return edges
        if (edgeType === EdgeType.CALL) {
          this.callEdges.add(edge);
        } else if (edgeType === EdgeType.RETURN) {
          this.returnEdges.add(edge);
        }
      }
    }
  }

  /**
   * Identify back edges (edges where target dominates source)
   */
  private identifyBackEdges(): void {
    this.backEdges.clear();

    for (const edge of this.edges) {
      // A back edge is one where the target dominates the source
      if (this.dominates(edge.to, edge.from)) {
        edge.isBackEdge = true;
        this.backEdges.add(edge);
      }
    }
  }

  /**
   * Identify critical edges (from has multiple successors, to has multiple predecessors)
   */
  private identifyCriticalEdges(): void {
    this.criticalEdges.clear();

    for (const edge of this.edges) {
      if (edge.from.successors.size > 1 && edge.to.predecessors.size > 1) {
        edge.isCritical = true;
        this.criticalEdges.add(edge);
      }
    }
  }

  /**
   * Compute block depths from entry (number of edges from entry)
   */
  private computeBlockDepths(): void {
    this.blockDepths.clear();

    if (!this.entryBlock) return;

    const visited = new Set<NWScriptBasicBlock>();
    const queue: [NWScriptBasicBlock, number][] = [[this.entryBlock, 0]];

    while (queue.length > 0) {
      const [current, depth] = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      this.blockDepths.set(current, depth);

      for (const successor of current.successors) {
        if (!visited.has(successor)) {
          queue.push([successor, depth + 1]);
        }
      }
    }
  }

  /**
   * Identify natural loops (all blocks in a loop for each loop header)
   */
  private identifyNaturalLoops(): void {
    this.naturalLoops.clear();

    for (const backEdge of this.backEdges) {
      const header = backEdge.to;
      const tail = backEdge.from;

      if (!this.naturalLoops.has(header)) {
        this.naturalLoops.set(header, new Set());
      }

      const loopBlocks = this.naturalLoops.get(header)!;
      loopBlocks.add(header);
      loopBlocks.add(tail);

      // Add all blocks that can reach tail without going through header
      this.addLoopBlocks(header, tail, loopBlocks);
    }
  }

  /**
   * Recursively add blocks to a natural loop
   */
  private addLoopBlocks(header: NWScriptBasicBlock, current: NWScriptBasicBlock, loopBlocks: Set<NWScriptBasicBlock>): void {
    for (const pred of current.predecessors) {
      if (pred !== header && !loopBlocks.has(pred)) {
        loopBlocks.add(pred);
        this.addLoopBlocks(header, pred, loopBlocks);
      }
    }
  }

  /**
   * Validate post-dominators
   */
  private validatePostDominators(): void {
    // Basic validation: check that exit blocks post-dominate themselves
    for (const exitBlock of this.exitBlocks) {
      if (!exitBlock.postDominators.has(exitBlock)) {
        log.warn(`CFG Warning: Exit block ${exitBlock.id} does not post-dominate itself`);
      }
    }

    // Validate that if A post-dominates B, then all paths from B to exit go through A
    // This is a more complex check that would require path enumeration
    // For now, we'll do a basic sanity check
  }

  /**
   * Find all paths between two blocks
   */
  findAllPaths(from: NWScriptBasicBlock, to: NWScriptBasicBlock): NWScriptBasicBlock[][] {
    const paths: NWScriptBasicBlock[][] = [];
    const currentPath: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();

    const dfs = (current: NWScriptBasicBlock) => {
      if (current === to) {
        paths.push([...currentPath, current]);
        return;
      }

      if (visited.has(current)) return;
      visited.add(current);
      currentPath.push(current);

      for (const successor of current.successors) {
        dfs(successor);
      }

      currentPath.pop();
      visited.delete(current);
    };

    dfs(from);
    return paths;
  }

  /**
   * Check if one block can reach another
   */
  canReach(from: NWScriptBasicBlock, to: NWScriptBasicBlock): boolean {
    if (from === to) return true;

    const visited = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [from];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === to) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const successor of current.successors) {
        if (!visited.has(successor)) {
          queue.push(successor);
        }
      }
    }

    return false;
  }

  /**
   * Get DFS pre-order (visit node before children)
   */
  getDFSPreOrder(): NWScriptBasicBlock[] {
    const result: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();

    const dfs = (block: NWScriptBasicBlock) => {
      if (visited.has(block)) return;
      visited.add(block);
      result.push(block);

      for (const successor of block.successors) {
        dfs(successor);
      }
    };

    if (this.entryBlock) {
      dfs(this.entryBlock);
    }

    return result;
  }

  /**
   * Get DFS post-order (visit children before node)
   */
  getDFSPostOrder(): NWScriptBasicBlock[] {
    const result: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();

    const dfs = (block: NWScriptBasicBlock) => {
      if (visited.has(block)) return;
      visited.add(block);

      for (const successor of block.successors) {
        dfs(successor);
      }

      result.push(block);
    };

    if (this.entryBlock) {
      dfs(this.entryBlock);
    }

    return result;
  }

  /**
   * Get common dominator of multiple blocks
   */
  getCommonDominator(blocks: NWScriptBasicBlock[]): NWScriptBasicBlock | null {
    if (blocks.length === 0) return null;
    if (blocks.length === 1) return blocks[0];

    // Start with dominators of first block
    const common = new Set(blocks[0].dominators);

    // Intersect with dominators of other blocks
    for (let i = 1; i < blocks.length; i++) {
      const toRemove: NWScriptBasicBlock[] = [];
      for (const dom of common) {
        if (!blocks[i].dominators.has(dom)) {
          toRemove.push(dom);
        }
      }
      for (const dom of toRemove) {
        common.delete(dom);
      }
    }

    // Find the immediate dominator (closest to blocks)
    let idom: NWScriptBasicBlock | null = null;
    for (const dom of common) {
      if (blocks.every(b => b === dom || b.dominators.has(dom))) {
        if (!idom || this.dominates(dom, idom)) {
          idom = dom;
        }
      }
    }

    return idom;
  }

  /**
   * Get common post-dominator of multiple blocks
   */
  getCommonPostDominator(blocks: NWScriptBasicBlock[]): NWScriptBasicBlock | null {
    if (blocks.length === 0) return null;
    if (blocks.length === 1) return blocks[0];

    // Start with post-dominators of first block
    const common = new Set(blocks[0].postDominators);

    // Intersect with post-dominators of other blocks
    for (let i = 1; i < blocks.length; i++) {
      const toRemove: NWScriptBasicBlock[] = [];
      for (const postDom of common) {
        if (!blocks[i].postDominators.has(postDom)) {
          toRemove.push(postDom);
        }
      }
      for (const postDom of toRemove) {
        common.delete(postDom);
      }
    }

    // Find the immediate post-dominator (closest to blocks)
    let ipdom: NWScriptBasicBlock | null = null;
    for (const postDom of common) {
      if (blocks.every(b => b === postDom || b.postDominators.has(postDom))) {
        if (!ipdom || this.postDominates(postDom, ipdom)) {
          ipdom = postDom;
        }
      }
    }

    return ipdom;
  }

  /**
   * Get natural loop for a loop header
   */
  getNaturalLoop(header: NWScriptBasicBlock): Set<NWScriptBasicBlock> {
    return this.naturalLoops.get(header) || new Set();
  }

  /**
   * Check if an edge exists
   */
  hasEdge(from: NWScriptBasicBlock, to: NWScriptBasicBlock): boolean {
    const edgeKey = `${from.id}->${to.id}`;
    return this.edgeMap.has(edgeKey);
  }

  /**
   * Get edge between two blocks
   */
  getEdge(from: NWScriptBasicBlock, to: NWScriptBasicBlock): NWScriptEdge | null {
    const edgeKey = `${from.id}->${to.id}`;
    return this.edgeMap.get(edgeKey) || null;
  }

  /**
   * Add an edge (and update block connections)
   */
  addEdge(from: NWScriptBasicBlock, to: NWScriptBasicBlock, type: EdgeType = EdgeType.FALLTHROUGH, weight: number = 1.0): NWScriptEdge {
    if (this.hasEdge(from, to)) {
      return this.getEdge(from, to)!;
    }

    const edge = new NWScriptEdge(from, to, type, weight);
    from.addSuccessor(to);
    this.edges.add(edge);
    const edgeKey = `${from.id}->${to.id}`;
    this.edgeMap.set(edgeKey, edge);

    return edge;
  }

  /**
   * Remove an edge (and update block connections)
   */
  removeEdge(from: NWScriptBasicBlock, to: NWScriptBasicBlock): boolean {
    const edgeKey = `${from.id}->${to.id}`;
    const edge = this.edgeMap.get(edgeKey);
    if (!edge) return false;

    from.removeSuccessor(to);
    this.edges.delete(edge);
    this.edgeMap.delete(edgeKey);
    this.backEdges.delete(edge);
    this.criticalEdges.delete(edge);

    return true;
  }

  /**
   * Get reachable subgraph from a starting block
   */
  getReachableSubgraph(start: NWScriptBasicBlock): Set<NWScriptBasicBlock> {
    const reachable = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [start];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);

      for (const successor of current.successors) {
        if (!reachable.has(successor)) {
          queue.push(successor);
        }
      }
    }

    return reachable;
  }

  /**
   * Get subgraph containing only specified blocks
   */
  getSubgraph(blocks: Set<NWScriptBasicBlock>): NWScriptControlFlowGraph {
    // Create a new CFG with only the specified blocks
    const subgraph = new NWScriptControlFlowGraph(this.script);
    
    // Add blocks
    for (const block of blocks) {
      subgraph.blocks.set(block.id, block);
      subgraph.instructionToBlock.set(block.startInstruction.address, block);
      
      // Add edges that are within the subgraph
      for (const successor of block.successors) {
        if (blocks.has(successor)) {
          const edge = this.getEdge(block, successor);
          if (edge) {
            subgraph.addEdge(block, successor, edge.type);
          }
        }
      }
    }

    // Set entry block if it's in the subgraph
    if (this.entryBlock && blocks.has(this.entryBlock)) {
      subgraph.entryBlock = this.entryBlock;
    }

    // Set exit blocks that are in the subgraph
    for (const exitBlock of this.exitBlocks) {
      if (blocks.has(exitBlock)) {
        subgraph.exitBlocks.add(exitBlock);
      }
    }

    return subgraph;
  }

  /**
   * Get critical edges
   */
  getCriticalEdges(): Array<[NWScriptBasicBlock, NWScriptBasicBlock]> {
    return Array.from(this.criticalEdges).map(edge => [edge.from, edge.to]);
  }

  /**
   * Get strongly connected components (SCC)
   */
  getStronglyConnectedComponents(): Set<NWScriptBasicBlock>[] {
    const components: Set<NWScriptBasicBlock>[] = [];
    const visited = new Set<NWScriptBasicBlock>();
    const finished = new Set<NWScriptBasicBlock>();
    const stack: NWScriptBasicBlock[] = [];
    const index = new Map<NWScriptBasicBlock, number>();
    const lowlink = new Map<NWScriptBasicBlock, number>();
    let currentIndex = 0;

    const strongConnect = (block: NWScriptBasicBlock) => {
      index.set(block, currentIndex);
      lowlink.set(block, currentIndex);
      currentIndex++;
      stack.push(block);
      visited.add(block);

      for (const successor of block.successors) {
        if (!index.has(successor)) {
          strongConnect(successor);
          lowlink.set(block, Math.min(lowlink.get(block)!, lowlink.get(successor)!));
        } else if (stack.includes(successor)) {
          lowlink.set(block, Math.min(lowlink.get(block)!, index.get(successor)!));
        }
      }

      if (lowlink.get(block) === index.get(block)) {
        const component = new Set<NWScriptBasicBlock>();
        let w: NWScriptBasicBlock;
        do {
          w = stack.pop()!;
          component.add(w);
          finished.add(w);
        } while (w !== block);
        components.push(component);
      }
    };

    for (const block of this.blocks.values()) {
      if (!index.has(block)) {
        strongConnect(block);
      }
    }

    return components;
  }

  /**
   * Get block depth from entry
   */
  getBlockDepth(block: NWScriptBasicBlock): number {
    return this.blockDepths.get(block) ?? -1;
  }

  /**
   * Check if an edge is a back edge
   */
  isBackEdge(from: NWScriptBasicBlock, to: NWScriptBasicBlock): boolean {
    const edge = this.getEdge(from, to);
    return edge ? edge.isBackEdge : false;
  }

  /**
   * Check if an edge is a forward edge
   */
  isForwardEdge(from: NWScriptBasicBlock, to: NWScriptBasicBlock): boolean {
    if (this.isBackEdge(from, to)) return false;
    // Forward edge: target is reachable from source via DFS tree
    return this.canReach(from, to);
  }

  /**
   * Check if an edge is a cross edge
   */
  isCrossEdge(from: NWScriptBasicBlock, to: NWScriptBasicBlock): boolean {
    if (this.isBackEdge(from, to)) return false;
    if (this.isForwardEdge(from, to)) return false;
    // Cross edge: connects nodes in different branches of DFS tree
    return from.successors.has(to);
  }

  /**
   * Get blocks ordered by dominance tree
   */
  getDominanceOrder(): NWScriptBasicBlock[] {
    const result: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();

    const visit = (block: NWScriptBasicBlock) => {
      if (visited.has(block)) return;
      visited.add(block);
      result.push(block);

      // Visit children in dominance tree (blocks dominated by this block)
      const children = Array.from(this.blocks.values()).filter(b => 
        b !== block && 
        this.dominates(block, b) &&
        this.getImmediateDominator(b) === block
      );

      for (const child of children.sort((a, b) => a.id - b.id)) {
        visit(child);
      }
    };

    if (this.entryBlock) {
      visit(this.entryBlock);
    }

    return result;
  }

  /**
   * Get a string representation of the CFG
   */
  toString(): string {
    const lines: string[] = [];
    lines.push(`Control Flow Graph for ${this.script.name || 'script'}`);
    lines.push(`Entry Block: ${this.entryBlock?.id ?? 'none'}`);
    lines.push(`Exit Blocks: ${Array.from(this.exitBlocks).map(b => b.id).join(', ')}`);
    lines.push(`Total Blocks: ${this.blocks.size}`);
    lines.push(`Total Edges: ${this.edges.size}`);
    lines.push(`Back Edges: ${this.backEdges.size}`);
    lines.push(`Critical Edges: ${this.criticalEdges.size}`);
    lines.push('');

    for (const block of this.blocks.values()) {
      lines.push(block.toString());
      lines.push(`  Exit Type: ${block.exitType}`);
      lines.push(`  Depth: ${this.getBlockDepth(block)}`);
      lines.push(`  Successors: ${Array.from(block.successors).map(b => b.id).join(', ')}`);
      lines.push(`  Predecessors: ${Array.from(block.predecessors).map(b => b.id).join(', ')}`);
      if (block.isLoopHeader) {
        lines.push(`  Loop Header`);
        const loopBlocks = this.getNaturalLoop(block);
        if (loopBlocks.size > 0) {
          lines.push(`  Natural Loop: ${Array.from(loopBlocks).map(b => b.id).join(', ')}`);
        }
      }
      if (block.isLoopBody) {
        lines.push(`  Loop Body`);
      }
      if (block.isUnreachable) {
        lines.push(`  Unreachable`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Safely serialize an instruction without circular references
   */
  private serializeInstruction(instr: NWScriptInstruction): any {
    const result: any = {
      address: instr.address,
      code: instr.code,
      codeName: instr.codeName || `OP_${instr.code}`,
      codeHex: instr.code_hex || `0x${instr.code.toString(16).padStart(2, '0')}`,
      type: instr.type,
      typeHex: instr.type_hex || `0x${instr.type.toString(16).padStart(2, '0')}`,
      instructionSize: instr.instructionSize || 0,
      index: instr.index ?? -1,
      isArg: instr.isArg || false,
      breakPoint: instr.break_point || false
    };

    // Add optional properties only if they exist and are not undefined
    if (instr.offset !== undefined) result.offset = instr.offset;
    if (instr.bpOffset !== undefined) result.bpOffset = instr.bpOffset;
    if (instr.spOffset !== undefined) result.spOffset = instr.spOffset;
    if (instr.size !== undefined) result.size = instr.size;
    if (instr.sizeToDestroy !== undefined) result.sizeToDestroy = instr.sizeToDestroy;
    if (instr.offsetToSaveElement !== undefined) result.offsetToSaveElement = instr.offsetToSaveElement;
    if (instr.sizeOfElementToSave !== undefined) result.sizeOfElementToSave = instr.sizeOfElementToSave;
    if (instr.sizeOfStructure !== undefined) result.sizeOfStructure = instr.sizeOfStructure;
    if (instr.action !== undefined) result.action = instr.action;
    if (instr.argCount !== undefined) result.argCount = instr.argCount;
    if (instr.integer !== undefined) result.integer = instr.integer;
    if (instr.float !== undefined) result.float = instr.float;
    if (instr.string !== undefined) result.string = instr.string;
    if (instr.object !== undefined) result.object = instr.object;

    // Serialize actionDefinition if it exists (only primitive properties, exclude function)
    if (instr.actionDefinition) {
      result.actionDefinition = {
        name: instr.actionDefinition.name,
        comment: instr.actionDefinition.comment,
        type: instr.actionDefinition.type,
        args: instr.actionDefinition.args ? [...instr.actionDefinition.args] : []
        // Note: action function is excluded to avoid circular references
      };
    }

    // Add next/prev instruction addresses (not the objects themselves)
    if (instr.nextInstr) result.nextInstructionAddress = instr.nextInstr.address;
    if (instr.prevInstr) result.prevInstructionAddress = instr.prevInstr.address;

    return result;
  }

  /**
   * Safely serialize a condition expression (or return null if it's too complex)
   */
  private serializeConditionExpression(expr: any): any {
    if (!expr) return null;
    
    // Try to serialize if it's a simple object
    try {
      // If it has a toJSON method, use it
      if (typeof expr.toJSON === 'function') {
        return expr.toJSON();
      }
      
      // If it's a simple object with primitive values, serialize it
      if (typeof expr === 'object' && expr !== null) {
        const keys = Object.keys(expr);
        if (keys.length === 0) return null;
        
        // Check if it's a simple object (no functions, no circular refs)
        const simple: any = {};
        for (const key of keys) {
          const value = expr[key];
          if (value === null || value === undefined) continue;
          if (typeof value === 'function') continue; // Skip functions
          if (typeof value === 'object' && value !== null) {
            // Check for circular reference by checking if it's the same object
            if (value === expr) continue; // Skip self-reference
            // For nested objects, just include a type indicator
            simple[key] = { _type: typeof value, _constructor: value.constructor?.name || 'Object' };
          } else {
            simple[key] = value;
          }
        }
        return Object.keys(simple).length > 0 ? simple : null;
      }
      
      return expr;
    } catch (e) {
      // If serialization fails, return a placeholder
      return { _error: 'Could not serialize condition expression', _type: typeof expr };
    }
  }

  /**
   * Export CFG to comprehensive JSON format for AI analysis
   * Includes all graph structure, analysis results, and metadata
   */
  toJSON(): any {
    const sortedBlocks = this.getBlocksInOrder();
    const graphMetrics = this.getGraphMetrics();

    return {
      // Script metadata
      script: {
        name: this.script.name || 'unnamed',
        totalInstructions: this.script.instructions?.size || 0,
        instructionAddresses: Array.from(this.script.instructions?.keys() || []).sort((a, b) => a - b)
      },

      // Graph structure
      graph: {
        entryBlockId: this.entryBlock?.id ?? null,
        exitBlockIds: Array.from(this.exitBlocks).map(b => b.id).sort((a, b) => a - b),
        totalBlocks: this.blocks.size,
        totalEdges: this.edges.size,
        leaders: Array.from(this.leaders).sort((a, b) => a - b),
        jumpTargets: Array.from(this.jumpTargets).sort((a, b) => a - b),
        storeStateJmpTargets: Array.from(this.storeStateJmpTargets).sort((a, b) => a - b)
      },

      // Subroutines and callbacks
      subroutines: {
        entries: Array.from(this.subroutineEntries.entries()).map(([addr, block]) => ({
          address: addr,
          blockId: block.id
        })),
        returns: Array.from(this.subroutineReturns.entries()).map(([jsrAddr, returnBlock]) => ({
          jsrAddress: jsrAddr,
          returnBlockId: returnBlock?.id ?? null
        })),
        callbacks: Array.from(this.callbackEntries.entries()).map(([entryAddr, info]) => ({
          entryAddress: entryAddr,
          storeStateAddress: info.storeStateAddress,
          savedGlobals: info.savedGlobals,
          savedLocals: info.savedLocals
        }))
      },

      // Graph metrics
      metrics: graphMetrics,

      // Complete block information
      blocks: sortedBlocks.map(block => {
        const immediateDominator = this.getImmediateDominator(block);
        const immediatePostDominator = this.getImmediatePostDominator(block);
        const parentLoop = this.getParentLoop(block);
        const childLoops = this.getChildLoops(block);
        const dominanceFrontier = this.getDominanceFrontier(block);
        const controlDependents = this.getControlDependents(block);
        const naturalLoop = block.isLoopHeader ? this.getNaturalLoop(block) : null;
        const reachableFrom = this.reachableFrom.get(block);
        const reachesTo = this.reachesTo.get(block);

        return {
          // Basic information
          id: block.id,
          startAddress: block.startInstruction.address,
          endAddress: block.endInstruction.address + (block.endInstruction.instructionSize || 0),
          addressRange: {
            start: block.startInstruction.address,
            end: block.endInstruction.address + (block.endInstruction.instructionSize || 0),
            size: (block.endInstruction.address + (block.endInstruction.instructionSize || 0)) - block.startInstruction.address
          },
          instructionCount: block.instructions.length,

          // Block properties
          properties: {
            isEntry: block.isEntry,
            isExit: block.isExit,
            isLoopHeader: block.isLoopHeader,
            isLoopBody: block.isLoopBody,
            isUnreachable: block.isUnreachable,
            exitType: block.exitType
          },

          // Control flow
          controlFlow: {
            depth: this.getBlockDepth(block),
            loopDepth: this.getLoopDepth(block),
            parentLoopId: parentLoop?.id ?? null,
            childLoopIds: Array.from(childLoops).map(h => h.id).sort((a, b) => a - b),
            naturalLoopBlockIds: naturalLoop ? Array.from(naturalLoop).map(b => b.id).sort((a, b) => a - b) : null,
            successorIds: Array.from(block.successors).map(b => b.id).sort((a, b) => a - b),
            predecessorIds: Array.from(block.predecessors).map(b => b.id).sort((a, b) => a - b)
          },

          // Dominance information
          dominance: {
            dominatorIds: Array.from(block.dominators).map(b => b.id).sort((a, b) => a - b),
            immediateDominatorId: immediateDominator?.id ?? null,
            postDominatorIds: Array.from(block.postDominators).map(b => b.id).sort((a, b) => a - b),
            immediatePostDominatorId: immediatePostDominator?.id ?? null,
            dominanceFrontierIds: Array.from(dominanceFrontier).map(b => b.id).sort((a, b) => a - b)
          },

          // Control dependence
          controlDependence: {
            dependentBlockIds: Array.from(controlDependents).map(b => b.id).sort((a, b) => a - b)
          },

          // Reachability
          reachability: {
            reachableFromIds: reachableFrom ? Array.from(reachableFrom).map(b => b.id).sort((a, b) => a - b) : [],
            reachesToIds: reachesTo ? Array.from(reachesTo).map(b => b.id).sort((a, b) => a - b) : []
          },

          // Edges (detailed)
          edges: this.getOrderedSuccessors(block).map(succ => {
            const edge = this.getEdge(block, succ);
            if (!edge) return null;
            return {
              toBlockId: succ.id,
              type: edge.type,
              isBackEdge: edge.isBackEdge,
              isCritical: edge.isCritical,
              condition: edge.condition,
              weight: edge.weight,
              conditionExpression: this.serializeConditionExpression(edge.conditionExpression)
            };
          }).filter(e => e !== null),

          // Instructions (detailed, safely serialized)
          instructions: block.instructions.map(instr => this.serializeInstruction(instr)),

          // Condition instruction (if applicable, safely serialized)
          conditionInstruction: block.conditionInstruction ? this.serializeInstruction(block.conditionInstruction) : null
        };
      }),

      // Complete edge information
      edges: Array.from(this.orderedEdges).map(edge => ({
        fromBlockId: edge.from.id,
        toBlockId: edge.to.id,
        type: edge.type,
        isBackEdge: edge.isBackEdge,
        isCritical: edge.isCritical,
        condition: edge.condition,
        weight: edge.weight,
        conditionExpression: edge.conditionExpression || null
      })),

      // Analysis results
      analysis: {
        // Back edges
        backEdges: Array.from(this.backEdges).map(e => ({
          fromBlockId: e.from.id,
          toBlockId: e.to.id,
          type: e.type
        })),

        // Critical edges
        criticalEdges: Array.from(this.criticalEdges).map(e => ({
          fromBlockId: e.from.id,
          toBlockId: e.to.id,
          type: e.type
        })),

        // Natural loops
        naturalLoops: Array.from(this.naturalLoops.entries()).map(([header, loopBlocks]) => ({
          headerBlockId: header.id,
          blockIds: Array.from(loopBlocks).map(b => b.id).sort((a, b) => a - b),
          size: loopBlocks.size
        })),

        // Loop nesting tree
        loopNestingTree: Array.from(this.loopNestingTree.entries()).map(([block, parent]) => ({
          blockId: block.id,
          parentLoopHeaderId: parent?.id ?? null
        })),

        // Call and return edges
        callEdges: Array.from(this.callEdges).map(e => ({
          fromBlockId: e.from.id,
          toBlockId: e.to.id
        })),
        returnEdges: Array.from(this.returnEdges).map(e => ({
          fromBlockId: e.from.id,
          toBlockId: e.to.id
        })),

        // Unreachable blocks
        unreachableBlockIds: this.getUnreachableBlocks().map(b => b.id).sort((a, b) => a - b),

        // Cycles
        cycles: this.getAllCycles().map(cycle => cycle.map(b => b.id)),

        // Strongly connected components
        stronglyConnectedComponents: this.getStronglyConnectedComponents().map(scc => 
          Array.from(scc).map(b => b.id).sort((a, b) => a - b)
        )
      },

      // Graph structure analysis
      structure: {
        isReducible: this.isReducible(),
        irreducibleRegions: this.getIrreducibleRegions().map(region => 
          Array.from(region).map(b => b.id).sort((a, b) => a - b)
        ),
        mergeBlocks: sortedBlocks.filter(b => this.isMergeBlock(b)).map(b => b.id),
        splitBlocks: sortedBlocks.filter(b => this.isSplitBlock(b)).map(b => b.id)
      },

      // Topological information
      topological: {
        dfsPreOrder: this.getDFSPreOrder().map(b => b.id),
        dfsPostOrder: this.getDFSPostOrder().map(b => b.id),
        topologicalOrder: this.getTopologicalOrder().map(b => b.id),
        reversePostOrder: this.getReversePostOrder().map(b => b.id),
        dominanceOrder: this.getDominanceOrder().map(b => b.id),
        postDominanceOrder: this.getBlocksInPostDominanceOrder().map(b => b.id),
        blocksByDepth: Array.from(this.getBlocksByDepth().entries()).map(([depth, blocks]) => ({
          depth,
          blockIds: blocks.map(b => b.id).sort((a, b) => a - b)
        }))
      }
    };
  }

  /**
   * Compute dominance frontiers for all blocks
   * The dominance frontier of block B is the set of blocks Y such that:
   * - B dominates a predecessor of Y, but
   * - B does not strictly dominate Y
   */
  private computeDominanceFrontiers(): void {
    this.dominanceFrontiers.clear();

    for (const block of this.blocks.values()) {
      this.dominanceFrontiers.set(block, new Set());
    }

    for (const block of this.blocks.values()) {
      // For each predecessor of block
      for (const pred of block.predecessors) {
        let runner = pred;
        // Walk up the dominator tree until we reach block's immediate dominator
        while (runner !== block && runner !== this.getImmediateDominator(block)) {
          if (runner) {
            this.dominanceFrontiers.get(runner)!.add(block);
          }
          runner = this.getImmediateDominator(runner);
        }
      }
    }
  }

  /**
   * Get the dominance frontier of a block
   */
  getDominanceFrontier(block: NWScriptBasicBlock): Set<NWScriptBasicBlock> {
    return this.dominanceFrontiers.get(block) || new Set();
  }

  /**
   * Compute iterated dominance frontier for a set of blocks
   * This is the union of dominance frontiers, iterated until fixed point
   */
  getIteratedDominanceFrontier(blocks: Set<NWScriptBasicBlock>): Set<NWScriptBasicBlock> {
    const df = new Set<NWScriptBasicBlock>();
    const worklist = new Set(blocks);

    while (worklist.size > 0) {
      const current = Array.from(worklist)[0];
      worklist.delete(current);

      const frontier = this.getDominanceFrontier(current);
      for (const block of frontier) {
        if (!df.has(block)) {
          df.add(block);
          worklist.add(block);
        }
      }
    }

    return df;
  }

  /**
   * Compute control dependences
   * Block Y is control-dependent on block X if:
   * - There exists a path from X to Y where all blocks except X and Y are post-dominated by Y
   * - X is not post-dominated by Y
   */
  private computeControlDependences(): void {
    this.controlDependences.clear();

    for (const block of this.blocks.values()) {
      this.controlDependences.set(block, new Set());
    }

    // For each block with multiple successors (control point)
    for (const block of this.blocks.values()) {
      if (block.successors.size <= 1) continue;

      // For each successor
      for (const succ of block.successors) {
        // Find all blocks that are control-dependent on block via this successor
        const visited = new Set<NWScriptBasicBlock>();
        const worklist: NWScriptBasicBlock[] = [succ];

        while (worklist.length > 0) {
          const current = worklist.shift()!;
          if (visited.has(current)) continue;
          visited.add(current);

          // If current is not post-dominated by block, it's control-dependent
          if (!this.postDominates(block, current) && current !== block) {
            this.controlDependences.get(block)!.add(current);
          }

          // Continue if current is post-dominated by block
          if (this.postDominates(block, current)) {
            for (const nextSucc of current.successors) {
              if (!visited.has(nextSucc)) {
                worklist.push(nextSucc);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Get blocks that are control-dependent on the given block
   */
  getControlDependents(block: NWScriptBasicBlock): Set<NWScriptBasicBlock> {
    return this.controlDependences.get(block) || new Set();
  }

  /**
   * Get reverse control flow graph (edges reversed)
   */
  getReverseCFG(): NWScriptControlFlowGraph {
    if (this.reverseCFG) {
      return this.reverseCFG;
    }

    const reverse = new NWScriptControlFlowGraph(this.script);
    
    // Copy all blocks
    for (const block of this.blocks.values()) {
      reverse.blocks.set(block.id, block);
      reverse.instructionToBlock.set(block.startInstruction.address, block);
    }

    // Reverse all edges
    for (const edge of this.edges) {
      const reverseEdge = reverse.addEdge(edge.to, edge.from, edge.type);
      reverseEdge.isBackEdge = edge.isBackEdge;
      reverseEdge.isCritical = edge.isCritical;
      reverseEdge.condition = edge.condition;
      reverseEdge.weight = edge.weight;
    }

    // Set entry/exit (swapped)
    reverse.entryBlock = null; // Reverse has no single entry
    for (const exitBlock of this.exitBlocks) {
      // In reverse, exit blocks become potential entries
      reverse.exitBlocks.add(exitBlock);
    }

    this.reverseCFG = reverse;
    return reverse;
  }

  /**
   * Build loop nesting tree and compute loop depths
   */
  private buildLoopNestingTree(): void {
    this.loopNestingTree.clear();
    this.loopDepth.clear();

    // Initialize: no blocks are in loops
    for (const block of this.blocks.values()) {
      this.loopNestingTree.set(block, null);
      this.loopDepth.set(block, 0);
    }

    // For each loop header, mark all blocks in its natural loop
    for (const [header, loopBlocks] of this.naturalLoops) {
      for (const block of loopBlocks) {
        const currentParent = this.loopNestingTree.get(block);
        const currentDepth = this.loopDepth.get(block) || 0;

        // If block is already in a nested loop, check if this loop is more nested
        if (currentParent && currentParent !== header) {
          // Check if header is nested within currentParent's loop
          const parentLoop = this.naturalLoops.get(currentParent);
          if (parentLoop && parentLoop.has(header)) {
            // This loop is more nested
            this.loopNestingTree.set(block, header);
            this.loopDepth.set(block, currentDepth + 1);
          }
        } else if (!currentParent) {
          // Block not in any loop yet
          this.loopNestingTree.set(block, header);
          this.loopDepth.set(block, 1);
        }
      }
    }
  }

  /**
   * Get loop depth for a block (0 = not in a loop)
   */
  getLoopDepth(block: NWScriptBasicBlock): number {
    return this.loopDepth.get(block) || 0;
  }

  /**
   * Get parent loop header for a block (null if not in a loop)
   */
  getParentLoop(block: NWScriptBasicBlock): NWScriptBasicBlock | null {
    return this.loopNestingTree.get(block) || null;
  }

  /**
   * Get child loops (nested loops) for a loop header
   */
  getChildLoops(header: NWScriptBasicBlock): Set<NWScriptBasicBlock> {
    const children = new Set<NWScriptBasicBlock>();
    
    for (const [otherHeader, _loopBlocks] of this.naturalLoops) {
      if (otherHeader === header) continue;
      
      // Check if otherHeader's loop is nested within header's loop
      const headerLoop = this.naturalLoops.get(header);
      if (headerLoop && headerLoop.has(otherHeader)) {
        children.add(otherHeader);
      }
    }

    return children;
  }

  /**
   * Compute and cache reachability sets
   */
  private computeReachabilitySets(): void {
    this.reachableFrom.clear();
    this.reachesTo.clear();

    for (const block of this.blocks.values()) {
      const reachable = this.getReachableSubgraph(block);
      this.reachableFrom.set(block, reachable);

      // Compute reverse reachability
      const canReach = new Set<NWScriptBasicBlock>();
      for (const otherBlock of this.blocks.values()) {
        if (this.canReach(otherBlock, block)) {
          canReach.add(otherBlock);
        }
      }
      this.reachesTo.set(block, canReach);
    }
  }

  /**
   * Track inter-procedural edges (call and return)
   */
  private trackInterProceduralEdges(): void {
    // Already done in buildEdges(), but ensure they're tracked
    this.callEdges.clear();
    this.returnEdges.clear();

    for (const edge of this.edges) {
      if (edge.type === EdgeType.CALL) {
        this.callEdges.add(edge);
      } else if (edge.type === EdgeType.RETURN) {
        this.returnEdges.add(edge);
      }
    }
  }

  /**
   * Get all call edges
   */
  getCallEdges(): Set<NWScriptEdge> {
    return this.callEdges;
  }

  /**
   * Get all return edges
   */
  getReturnEdges(): Set<NWScriptEdge> {
    return this.returnEdges;
  }

  /**
   * Get call graph (graph of function calls)
   */
  getCallGraph(): Map<NWScriptBasicBlock, Set<NWScriptBasicBlock>> {
    const callGraph = new Map<NWScriptBasicBlock, Set<NWScriptBasicBlock>>();

    for (const edge of this.callEdges) {
      if (!callGraph.has(edge.from)) {
        callGraph.set(edge.from, new Set());
      }
      callGraph.get(edge.from)!.add(edge.to);
    }

    return callGraph;
  }

  /**
   * Get graph metrics/statistics
   */
  getGraphMetrics(): {
    totalBlocks: number;
    totalEdges: number;
    cyclomaticComplexity: number;
    averageBranchingFactor: number;
    maxDepth: number;
    loopCount: number;
    unreachableBlocks: number;
    criticalEdges: number;
    backEdges: number;
  } {
    let totalSuccessors = 0;
    let maxDepthValue = 0;

    for (const block of this.blocks.values()) {
      totalSuccessors += block.successors.size;
      const depth = this.getBlockDepth(block);
      if (depth > maxDepthValue) {
        maxDepthValue = depth;
      }
    }

    const cyclomaticComplexity = this.edges.size - this.blocks.size + 2;
    const averageBranchingFactor = this.blocks.size > 0 ? totalSuccessors / this.blocks.size : 0;

    return {
      totalBlocks: this.blocks.size,
      totalEdges: this.edges.size,
      cyclomaticComplexity,
      averageBranchingFactor,
      maxDepth: maxDepthValue,
      loopCount: this.naturalLoops.size,
      unreachableBlocks: this.getUnreachableBlocks().length,
      criticalEdges: this.criticalEdges.size,
      backEdges: this.backEdges.size
    };
  }

  /**
   * Get blocks grouped by depth level
   */
  getBlocksByDepth(): Map<number, NWScriptBasicBlock[]> {
    const byDepth = new Map<number, NWScriptBasicBlock[]>();

    for (const block of this.blocks.values()) {
      const depth = this.getBlockDepth(block);
      if (!byDepth.has(depth)) {
        byDepth.set(depth, []);
      }
      byDepth.get(depth)!.push(block);
    }

    return byDepth;
  }

  /**
   * Get blocks in post-dominance order
   */
  getBlocksInPostDominanceOrder(): NWScriptBasicBlock[] {
    const result: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();

    const visit = (block: NWScriptBasicBlock) => {
      if (visited.has(block)) return;
      visited.add(block);

      // Visit post-dominator children first
      const children = Array.from(this.blocks.values()).filter(b =>
        b !== block &&
        this.postDominates(block, b) &&
        this.getImmediatePostDominator(b) === block
      );

      for (const child of children.sort((a, b) => a.id - b.id)) {
        visit(child);
      }

      result.push(block);
    };

    // Start from exit blocks
    for (const exitBlock of this.exitBlocks) {
      visit(exitBlock);
    }

    return result.reverse();
  }

  /**
   * Find all simple paths (paths without cycles) between two blocks
   */
  findAllSimplePaths(from: NWScriptBasicBlock, to: NWScriptBasicBlock): NWScriptBasicBlock[][] {
    const paths: NWScriptBasicBlock[][] = [];
    const currentPath: NWScriptBasicBlock[] = [];

    const dfs = (current: NWScriptBasicBlock) => {
      if (currentPath.includes(current)) {
        return; // Cycle detected, skip
      }

      currentPath.push(current);

      if (current === to) {
        paths.push([...currentPath]);
      } else {
        for (const successor of current.successors) {
          dfs(successor);
        }
      }

      currentPath.pop();
    };

    dfs(from);
    return paths;
  }

  /**
   * Find all paths avoiding certain blocks
   */
  findAllPathsAvoiding(from: NWScriptBasicBlock, to: NWScriptBasicBlock, avoidBlocks: Set<NWScriptBasicBlock>): NWScriptBasicBlock[][] {
    const paths: NWScriptBasicBlock[][] = [];
    const currentPath: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();

    const dfs = (current: NWScriptBasicBlock) => {
      if (avoidBlocks.has(current) || visited.has(current)) return;

      if (current === to) {
        paths.push([...currentPath, current]);
        return;
      }

      visited.add(current);
      currentPath.push(current);

      for (const successor of current.successors) {
        dfs(successor);
      }

      currentPath.pop();
      visited.delete(current);
    };

    dfs(from);
    return paths;
  }

  /**
   * Find shortest path between two blocks (BFS-based)
   */
  findShortestPath(from: NWScriptBasicBlock, to: NWScriptBasicBlock): NWScriptBasicBlock[] | null {
    if (from === to) return [from];

    const queue: NWScriptBasicBlock[] = [from];
    const visited = new Set<NWScriptBasicBlock>();
    const parent = new Map<NWScriptBasicBlock, NWScriptBasicBlock | null>();
    parent.set(from, null);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      if (current === to) {
        // Reconstruct path
        const path: NWScriptBasicBlock[] = [];
        let node: NWScriptBasicBlock | null = to;
        while (node !== null) {
          path.unshift(node);
          node = parent.get(node) || null;
        }
        return path;
      }

      for (const successor of current.successors) {
        if (!visited.has(successor) && !parent.has(successor)) {
          parent.set(successor, current);
          queue.push(successor);
        }
      }
    }

    return null; // No path found
  }

  /**
   * Get all cycles in the graph
   */
  getAllCycles(): NWScriptBasicBlock[][] {
    const cycles: NWScriptBasicBlock[][] = [];
    const visited = new Set<NWScriptBasicBlock>();
    const recStack = new Set<NWScriptBasicBlock>();
    const path: NWScriptBasicBlock[] = [];

    const dfs = (block: NWScriptBasicBlock) => {
      if (recStack.has(block)) {
        // Found a cycle
        const cycleStart = path.indexOf(block);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), block]);
        }
        return;
      }

      if (visited.has(block)) return;

      visited.add(block);
      recStack.add(block);
      path.push(block);

      for (const successor of block.successors) {
        dfs(successor);
      }

      path.pop();
      recStack.delete(block);
    };

    for (const block of this.blocks.values()) {
      if (!visited.has(block)) {
        dfs(block);
      }
    }

    return cycles;
  }

  /**
   * Check if a block is in a cycle
   */
  isInCycle(block: NWScriptBasicBlock): boolean {
    const cycles = this.getAllCycles();
    return cycles.some(cycle => cycle.includes(block));
  }

  /**
   * Get ordered successors (by address)
   */
  getOrderedSuccessors(block: NWScriptBasicBlock): NWScriptBasicBlock[] {
    return Array.from(block.successors).sort((a, b) => 
      a.startInstruction.address - b.startInstruction.address
    );
  }

  /**
   * Get ordered predecessors (by address)
   */
  getOrderedPredecessors(block: NWScriptBasicBlock): NWScriptBasicBlock[] {
    return Array.from(block.predecessors).sort((a, b) =>
      a.startInstruction.address - b.startInstruction.address
    );
  }

  /**
   * Get all blocks in deterministic order (by start address)
   */
  getBlocksInOrder(): NWScriptBasicBlock[] {
    return Array.from(this.blocks.values())
      .sort((a, b) => a.startInstruction.address - b.startInstruction.address);
  }

  /**
   * Get intra-procedural successors (excluding CALL edges)
   * @param block The block to get successors for
   * @param excludeReturn Whether to also exclude RETURN edges (default: false)
   */
  getIntraProceduralSuccessors(block: NWScriptBasicBlock, excludeReturn: boolean = false): NWScriptBasicBlock[] {
    const result: NWScriptBasicBlock[] = [];
    for (const succ of this.getOrderedSuccessors(block)) {
      const edge = this.getEdge(block, succ);
      if (edge) {
        if (edge.type === EdgeType.CALL) {
          continue; // Skip call edges
        }
        if (excludeReturn && edge.type === EdgeType.RETURN) {
          continue; // Skip return edges if requested
        }
        result.push(succ);
      }
    }
    return result;
  }

  /**
   * Get intra-procedural predecessors (excluding RETURN edges)
   * @param block The block to get predecessors for
   * @param excludeCall Whether to also exclude CALL edges (default: false)
   */
  getIntraProceduralPredecessors(block: NWScriptBasicBlock, excludeCall: boolean = false): NWScriptBasicBlock[] {
    const result: NWScriptBasicBlock[] = [];
    for (const pred of this.getOrderedPredecessors(block)) {
      const edge = this.getEdge(pred, block);
      if (edge) {
        if (edge.type === EdgeType.RETURN) {
          continue; // Skip return edges
        }
        if (excludeCall && edge.type === EdgeType.CALL) {
          continue; // Skip call edges if requested
        }
        result.push(pred);
      }
    }
    return result;
  }

  /**
   * Get condition expression for an edge (if available)
   */
  getConditionExpression(edge: NWScriptEdge): any | null {
    return edge.conditionExpression || null;
  }

  /**
   * Set condition expression for an edge
   */
  setConditionExpression(edge: NWScriptEdge, expression: any): void {
    edge.conditionExpression = expression;
  }

  /**
   * Check if a block is a merge block (multiple predecessors, single successor)
   */
  isMergeBlock(block: NWScriptBasicBlock): boolean {
    return block.predecessors.size > 1 && block.successors.size === 1;
  }

  /**
   * Check if a block is a split block (single predecessor, multiple successors)
   */
  isSplitBlock(block: NWScriptBasicBlock): boolean {
    return block.predecessors.size === 1 && block.successors.size > 1;
  }

  /**
   * Check if CFG is reducible
   * A reducible CFG can be reduced to a single node by repeatedly:
   * - Removing self-loops
   * - Merging nodes with single predecessor
   * - Removing nodes with no predecessors (except entry)
   */
  isReducible(): boolean {
    // A CFG is reducible if all loops are natural loops (have a single entry point)
    // Check if all back edges have their target as a loop header
    for (const backEdge of this.backEdges) {
      const header = backEdge.to;
      if (!header.isLoopHeader) {
        return false;
      }
    }

    // Additional check: try to reduce the graph
    const worklist = new Set(this.blocks.values());
    let changed = true;

    while (changed && worklist.size > 0) {
      changed = false;

      for (const block of Array.from(worklist)) {
        // Remove self-loops
        if (block.successors.has(block)) {
          this.removeEdge(block, block);
          changed = true;
        }

        // Merge nodes with single predecessor (except entry)
        if (block !== this.entryBlock && block.predecessors.size === 1) {
          const pred = Array.from(block.predecessors)[0];
          // Can merge if pred has single successor
          if (pred.successors.size === 1) {
            // Merge logic would go here (complex, simplified check)
            worklist.delete(block);
            changed = true;
          }
        }
      }
    }

    return worklist.size <= 1; // Should reduce to entry block
  }

  /**
   * Get irreducible regions (regions that cannot be reduced)
   */
  getIrreducibleRegions(): Set<NWScriptBasicBlock>[] {
    const regions: Set<NWScriptBasicBlock>[] = [];
    
    if (this.isReducible()) {
      return regions;
    }

    // Find strongly connected components that are not natural loops
    const sccs = this.getStronglyConnectedComponents();
    
    for (const scc of sccs) {
      if (scc.size > 1) {
        // Check if this SCC is a natural loop
        let isNaturalLoop = false;
        for (const [header, loopBlocks] of this.naturalLoops) {
          if (scc.has(header) && Array.from(scc).every(b => loopBlocks.has(b))) {
            isNaturalLoop = true;
            break;
          }
        }
        
        if (!isNaturalLoop) {
          regions.push(scc);
        }
      }
    }

    return regions;
  }

  /**
   * Add a block to the CFG (for incremental updates)
   */
  addBlock(block: NWScriptBasicBlock): void {
    this.blocks.set(block.id, block);
    this.instructionToBlock.set(block.startInstruction.address, block);
    this.invalidateCaches();
  }

  /**
   * Remove a block from the CFG (for incremental updates)
   */
  removeBlock(block: NWScriptBasicBlock): void {
    // Remove all edges connected to this block
    for (const succ of Array.from(block.successors)) {
      this.removeEdge(block, succ);
    }
    for (const pred of Array.from(block.predecessors)) {
      this.removeEdge(pred, block);
    }

    this.blocks.delete(block.id);
    this.instructionToBlock.delete(block.startInstruction.address);
    this.invalidateCaches();
  }

  /**
   * Update an edge (for incremental updates)
   */
  updateEdge(from: NWScriptBasicBlock, to: NWScriptBasicBlock, type?: EdgeType, weight?: number): void {
    const edge = this.getEdge(from, to);
    if (edge) {
      if (type !== undefined) {
        edge.type = type;
      }
      if (weight !== undefined) {
        edge.weight = weight;
      }
      this.invalidateCaches();
    }
  }

  /**
   * Invalidate cached computations
   */
  private invalidateCaches(): void {
    this.invalidated.add('dominance');
    this.invalidated.add('postDominance');
    this.invalidated.add('reachability');
    this.invalidated.add('loops');
    this.reverseCFG = null;
  }

  /**
   * Static method to deserialize CFG from JSON
   */
  static fromJSON(json: any, script: NWScript): NWScriptControlFlowGraph {
    const cfg = new NWScriptControlFlowGraph(script);
    
    // Note: This is a simplified deserialization
    // Full deserialization would require reconstructing instructions and blocks
    // For now, we'll just rebuild the CFG from the script
    cfg.build();
    
    return cfg;
  }
}
