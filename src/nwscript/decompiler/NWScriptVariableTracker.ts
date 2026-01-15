import type { NWScriptInstruction } from "../NWScriptInstruction";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";
import {
  OP_CPDOWNBP, OP_CPTOPBP, OP_CPDOWNSP, OP_CPTOPSP, OP_MOVSP,
  OP_DECIBP, OP_INCIBP, OP_DECISP, OP_INCISP
} from '../NWScriptOPCodes';

/**
 * Tracks variable usage in NWScript decompilation.
 * Identifies global and local variables from stack/base pointer operations.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptVariableTracker.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export interface NWScriptVariable {
  name: string;
  offset: number;
  isGlobal: boolean;
  dataType: NWScriptDataType;
  readCount: number;
  writeCount: number;
  firstRead: number | null; // instruction address
  firstWrite: number | null; // instruction address
  lastRead: number | null;
  lastWrite: number | null;
  initialValue?: any; // Initial value for global variables
}

export class NWScriptVariableTracker {
  /**
   * Global variables (keyed by BP offset)
   */
  private globalVars: Map<number, NWScriptVariable> = new Map();

  /**
   * Local variables (keyed by SP offset)
   */
  private localVars: Map<number, NWScriptVariable> = new Map();

  /**
   * Variable name counter for generating unique names
   */
  private globalVarCounter: number = 0;
  private localVarCounter: number = 0;

  /**
   * Stack pointer tracking (for local variable offsets)
   */
  private currentStackPointer: number = 0;

  /**
   * Base pointer tracking (for global variable offsets)
   */
  private currentBasePointer: number = 0;

  /**
   * Process an instruction and track variable usage
   */
  processInstruction(instruction: NWScriptInstruction): void {
    switch (instruction.code) {
      case OP_CPDOWNBP:
        this.handleGlobalWrite(instruction);
        break;
      case OP_CPTOPBP:
        this.handleGlobalRead(instruction);
        break;
      case OP_CPDOWNSP:
        this.handleLocalWrite(instruction);
        break;
      case OP_CPTOPSP:
        this.handleLocalRead(instruction);
        break;
      case OP_MOVSP:
        this.handleStackAdjustment(instruction);
        break;
      case OP_DECIBP:
      case OP_INCIBP:
        this.handleGlobalIncrement(instruction);
        break;
      case OP_DECISP:
      case OP_INCISP:
        this.handleLocalIncrement(instruction);
        break;
    }
  }

  /**
   * Handle writing to a global variable (CPDOWNBP)
   */
  private handleGlobalWrite(instruction: NWScriptInstruction): void {
    if (instruction.offset === undefined) return;

    const offset = instruction.offset;
    let variable = this.globalVars.get(offset);

    if (!variable) {
      variable = this.createGlobalVariable(offset, instruction);
      this.globalVars.set(offset, variable);
    }

    variable.writeCount++;
    variable.lastWrite = instruction.address;
    if (variable.firstWrite === null) {
      variable.firstWrite = instruction.address;
    }
  }

  /**
   * Handle reading from a global variable (CPTOPBP)
   */
  private handleGlobalRead(instruction: NWScriptInstruction): void {
    if (instruction.offset === undefined) return;

    const offset = instruction.offset;
    let variable = this.globalVars.get(offset);

    if (!variable) {
      variable = this.createGlobalVariable(offset, instruction);
      this.globalVars.set(offset, variable);
    }

    variable.readCount++;
    variable.lastRead = instruction.address;
    if (variable.firstRead === null) {
      variable.firstRead = instruction.address;
    }
  }

  /**
   * Handle writing to a local variable (CPDOWNSP)
   */
  private handleLocalWrite(instruction: NWScriptInstruction): void {
    if (instruction.offset === undefined) return;

    // Calculate actual stack offset
    const offset = this.currentStackPointer + instruction.offset;
    let variable = this.localVars.get(offset);

    if (!variable) {
      variable = this.createLocalVariable(offset, instruction);
      this.localVars.set(offset, variable);
    }

    variable.writeCount++;
    variable.lastWrite = instruction.address;
    if (variable.firstWrite === null) {
      variable.firstWrite = instruction.address;
    }
  }

  /**
   * Handle reading from a local variable (CPTOPSP)
   */
  private handleLocalRead(instruction: NWScriptInstruction): void {
    if (instruction.offset === undefined) return;

    // Calculate actual stack offset
    const offset = this.currentStackPointer + instruction.offset;
    let variable = this.localVars.get(offset);

    if (!variable) {
      variable = this.createLocalVariable(offset, instruction);
      this.localVars.set(offset, variable);
    }

    variable.readCount++;
    variable.lastRead = instruction.address;
    if (variable.firstRead === null) {
      variable.firstRead = instruction.address;
    }
  }

  /**
   * Handle stack pointer adjustment (MOVSP)
   * This typically indicates variable declarations or cleanup
   */
  private handleStackAdjustment(instruction: NWScriptInstruction): void {
    if (instruction.offset !== undefined) {
      this.currentStackPointer += instruction.offset;
    }
  }

  /**
   * Handle global variable increment/decrement
   */
  private handleGlobalIncrement(instruction: NWScriptInstruction): void {
    if (instruction.offset === undefined) return;

    const offset = instruction.offset;
    let variable = this.globalVars.get(offset);

    if (!variable) {
      variable = this.createGlobalVariable(offset, instruction);
      this.globalVars.set(offset, variable);
    }

    // Increment/decrement counts as both read and write
    variable.readCount++;
    variable.writeCount++;
    variable.lastRead = instruction.address;
    variable.lastWrite = instruction.address;
  }

  /**
   * Handle local variable increment/decrement
   */
  private handleLocalIncrement(instruction: NWScriptInstruction): void {
    if (instruction.offset === undefined) return;

    const offset = this.currentStackPointer + instruction.offset;
    let variable = this.localVars.get(offset);

    if (!variable) {
      variable = this.createLocalVariable(offset, instruction);
      this.localVars.set(offset, variable);
    }

    // Increment/decrement counts as both read and write
    variable.readCount++;
    variable.writeCount++;
    variable.lastRead = instruction.address;
    variable.lastWrite = instruction.address;
  }

  /**
   * Create a global variable
   */
  private createGlobalVariable(offset: number, instruction: NWScriptInstruction): NWScriptVariable {
    return {
      name: `g_var${this.globalVarCounter++}`,
      offset: offset,
      isGlobal: true,
      dataType: NWScriptDataType.INTEGER, // Default, could be improved with type inference
      readCount: 0,
      writeCount: 0,
      firstRead: null,
      firstWrite: null,
      lastRead: null,
      lastWrite: null
    };
  }

  /**
   * Create a local variable
   */
  private createLocalVariable(offset: number, instruction: NWScriptInstruction): NWScriptVariable {
    return {
      name: `var${this.localVarCounter++}`,
      offset: offset,
      isGlobal: false,
      dataType: NWScriptDataType.INTEGER, // Default, could be improved with type inference
      readCount: 0,
      writeCount: 0,
      firstRead: null,
      firstWrite: null,
      lastRead: null,
      lastWrite: null
    };
  }

  /**
   * Get a variable by offset
   */
  getVariable(offset: number, isGlobal: boolean): NWScriptVariable | null {
    if (isGlobal) {
      return this.globalVars.get(offset) || null;
    } else {
      return this.localVars.get(offset) || null;
    }
  }

  /**
   * Get all global variables
   */
  getGlobalVariables(): NWScriptVariable[] {
    return Array.from(this.globalVars.values())
      .sort((a, b) => a.offset - b.offset);
  }

  /**
   * Get all local variables
   */
  getLocalVariables(): NWScriptVariable[] {
    return Array.from(this.localVars.values())
      .sort((a, b) => a.offset - b.offset);
  }

  /**
   * Get all variables (global and local)
   */
  getAllVariables(): NWScriptVariable[] {
    return [...this.getGlobalVariables(), ...this.getLocalVariables()];
  }

  /**
   * Update stack pointer (called when analyzing stack state)
   */
  setStackPointer(sp: number): void {
    this.currentStackPointer = sp;
  }

  /**
   * Update base pointer (called when analyzing base pointer state)
   */
  setBasePointer(bp: number): void {
    this.currentBasePointer = bp;
  }

  /**
   * Get current stack pointer
   */
  getStackPointer(): number {
    return this.currentStackPointer;
  }

  /**
   * Get current base pointer
   */
  getBasePointer(): number {
    return this.currentBasePointer;
  }

  /**
   * Attempt to infer better variable names based on usage patterns
   * This is a placeholder for more sophisticated naming heuristics
   */
  inferVariableNames(): void {
    // Could analyze:
    // - Variable usage patterns
    // - Common naming conventions
    // - Function parameter positions
    // - Loop counter patterns
    // For now, we use simple sequential names
  }

  /**
   * Clear all tracked variables
   */
  clear(): void {
    this.globalVars.clear();
    this.localVars.clear();
    this.globalVarCounter = 0;
    this.localVarCounter = 0;
    this.currentStackPointer = 0;
    this.currentBasePointer = 0;
  }
}

