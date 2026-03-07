import type { NWScriptInstruction } from "../NWScriptInstruction";

/**
 * Represents a basic block in the control flow graph.
 * A basic block is a sequence of instructions with no branches except at the end.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptBasicBlock.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptBasicBlock {
  /**
   * Unique identifier for this basic block
   */
  id: number;

  /**
   * The first instruction in this basic block
   */
  startInstruction: NWScriptInstruction;

  /**
   * The last instruction in this basic block
   */
  endInstruction: NWScriptInstruction;

  /**
   * All instructions in this basic block (in order)
   */
  instructions: NWScriptInstruction[];

  /**
   * Basic blocks that can be reached from this block (successors)
   */
  successors: Set<NWScriptBasicBlock> = new Set();

  /**
   * Basic blocks that can reach this block (predecessors)
   */
  predecessors: Set<NWScriptBasicBlock> = new Set();

  /**
   * The type of control flow at the end of this block
   */
  exitType: 'fallthrough' | 'jump' | 'conditional' | 'call' | 'return' | 'unreachable';

  /**
   * For conditional branches, the condition instruction (JZ/JNZ)
   */
  conditionInstruction: NWScriptInstruction | null = null;

  /**
   * Whether this block is the entry point of the script
   */
  isEntry: boolean = false;

  /**
   * Whether this block is an exit point (ends with RETN or EOF)
   */
  isExit: boolean = false;

  /**
   * Whether this block is part of a loop
   */
  isLoopHeader: boolean = false;

  /**
   * Whether this block is part of a loop body
   */
  isLoopBody: boolean = false;

  /**
   * Whether this block is unreachable from the entry point
   */
  isUnreachable: boolean = false;

  /**
   * Dominator information for decompilation
   */
  dominators: Set<NWScriptBasicBlock> = new Set();

  /**
   * Post-dominator information for decompilation
   */
  postDominators: Set<NWScriptBasicBlock> = new Set();

  constructor(id: number, startInstruction: NWScriptInstruction) {
    this.id = id;
    this.startInstruction = startInstruction;
    this.endInstruction = startInstruction;
    this.instructions = [startInstruction];
    this.exitType = 'fallthrough';
  }

  /**
   * Add an instruction to this basic block
   */
  addInstruction(instruction: NWScriptInstruction): void {
    this.instructions.push(instruction);
    this.endInstruction = instruction;
  }

  /**
   * Add a successor block
   */
  addSuccessor(block: NWScriptBasicBlock): void {
    this.successors.add(block);
    block.predecessors.add(this);
  }

  /**
   * Remove a successor block
   */
  removeSuccessor(block: NWScriptBasicBlock): void {
    this.successors.delete(block);
    block.predecessors.delete(this);
  }

  /**
   * Get the address range of this block
   */
  getAddressRange(): { start: number; end: number } {
    return {
      start: this.startInstruction.address,
      end: this.endInstruction.address + this.endInstruction.instructionSize
    };
  }

  /**
   * Check if an address is within this block
   */
  containsAddress(address: number): boolean {
    const range = this.getAddressRange();
    return address >= range.start && address < range.end;
  }

  /**
   * Get a string representation of this block
   */
  toString(): string {
    const range = this.getAddressRange();
    return `Block ${this.id} [0x${range.start.toString(16)}-0x${range.end.toString(16)}] (${this.instructions.length} instructions)`;
  }
}

