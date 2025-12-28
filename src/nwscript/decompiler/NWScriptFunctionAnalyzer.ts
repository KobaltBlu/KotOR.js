import type { NWScriptControlFlowGraph } from "./NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "./NWScriptBasicBlock";
import type { NWScriptInstruction } from "../NWScriptInstruction";
import type { NWScriptGlobalInit } from "./NWScriptGlobalVariableAnalyzer";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";
import { OP_JSR, OP_RETN, OP_RSADD, OP_STORE_STATE, OP_STORE_STATEALL, OP_JMP, OP_SAVEBP, OP_RESTOREBP, OP_MOVSP, OP_CPTOPBP } from '../NWScriptOPCodes';

/**
 * Represents a function/subroutine in the decompiled code.
 */
export interface NWScriptFunction {
  name: string;
  entryBlock: NWScriptBasicBlock;
  returnBlock: NWScriptBasicBlock | null;
  bodyBlocks: NWScriptBasicBlock[];
  parameters: NWScriptFunctionParameter[];
  returnType: NWScriptDataType;
  isMain: boolean;
  jsrInstruction: NWScriptInstruction | null; // The JSR that calls this function
}

export interface NWScriptFunctionParameter {
  name: string;
  dataType: NWScriptDataType;
  offset: number; // Stack offset
}

/**
 * Analyzes functions and subroutines in the control flow graph.
 * Identifies function boundaries, parameters, and return types.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptFunctionAnalyzer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptFunctionAnalyzer {
  private cfg: NWScriptControlFlowGraph;
  private functions: Map<number, NWScriptFunction> = new Map();
  private mainFunction: NWScriptFunction | null = null;
  private globalInits: NWScriptGlobalInit[] = [];
  private initAddresses: Set<number> = new Set();
  private nestedCallAddresses: Set<number> = new Set(); // Addresses in nested call code (between STORE_STATE+JMP and JMP target)
  private globalInitFunctionAddress: number | null = null; // Entry address of global init function (if exists)

  constructor(cfg: NWScriptControlFlowGraph, globalInits: NWScriptGlobalInit[] = []) {
    this.cfg = cfg;
    this.globalInits = globalInits;
    // Build set of initialization addresses for quick lookup
    for (const init of globalInits) {
      this.initAddresses.add(init.instructionAddress);
      // Also mark the following instructions (CONST, CPDOWNSP, MOVSP)
      const rsadd = this.cfg.script.instructions.get(init.instructionAddress);
      if (rsadd) {
        let current = rsadd.nextInstr;
        let count = 0;
        while (current && count < 5) {
          this.initAddresses.add(current.address);
          if (current.code === 0x1B) break; // MOVSP
          current = current.nextInstr;
          count++;
        }
      }
    }
    
    // Identify nested call code (between STORE_STATE+JMP and JMP target)
    this.identifyNestedCallCode();
  }
  
  /**
   * Identify all addresses that are part of nested call code
   * CRITICAL: The callback entry is at STORE_STATE_address + instruction.type
   * The callback code is between the callback entry and the JMP target
   * (where the outer ACTION call happens)
   */
  private identifyNestedCallCode(): void {
    for (const instruction of this.cfg.script.instructions.values()) {
      if (instruction.code === OP_STORE_STATE || instruction.code === OP_STORE_STATEALL) {
        // The type field is the callback offset
        // Callback entry = STORE_STATE_address + type
        const callbackEntry = instruction.address + instruction.type;
        
        const nextInstr = instruction.nextInstr;
        if (nextInstr && nextInstr.code === OP_JMP && nextInstr.offset !== undefined) {
          const jmpTarget = nextInstr.address + nextInstr.offset;
          
          // Mark all instructions between callback entry and JMP target as callback code
          // This is the code that will be executed later by DelayCommand
          let current = this.cfg.script.instructions.get(callbackEntry);
          while (current && current.address < jmpTarget) {
            this.nestedCallAddresses.add(current.address);
            if (current.code === OP_RETN) {
              break;
            }
            current = current.nextInstr;
          }
        }
      }
    }
  }

  /**
   * Analyze all functions in the script
   */
  analyze(): NWScriptFunction[] {
    this.functions.clear();
    this.mainFunction = null;
    this.globalInitFunctionAddress = null; // Reset before analysis

    // Identify main function (entry block)
    if (this.cfg.entryBlock) {
      this.mainFunction = this.analyzeMainFunction();
      if (this.mainFunction) {
        this.functions.set(this.mainFunction.entryBlock.startInstruction.address, this.mainFunction);
      }
    }

    // Identify all subroutines (JSR targets)
    // Use a Set to track processed entry addresses to avoid duplicates
    const processedAddresses = new Set<number>();
    
    for (const [entryAddress, entryBlock] of this.cfg.subroutineEntries) {
      // Skip if we've already processed this entry address
      if (processedAddresses.has(entryAddress)) {
        continue;
      }
      
      // Skip if this is the main function's entry address (already processed)
      if (this.mainFunction && this.mainFunction.entryBlock.startInstruction.address === entryAddress) {
        continue;
      }
      
      // Skip if this is a STORE_STATE JMP target (not a real function)
      if (this.cfg.storeStateJmpTargets.has(entryAddress)) {
        continue;
      }
      
      // Skip if this is a callback entry (created by STORE_STATE, not a real function)
      if (this.cfg.callbackEntries.has(entryAddress)) {
        continue;
      }
      
      // Skip if this is the global init function (contains only global variable initializations)
      if (this.globalInitFunctionAddress !== null && entryAddress === this.globalInitFunctionAddress) {
        continue;
      }
      
      const func = this.analyzeSubroutine(entryBlock, entryAddress);
      if (func) {
        // Only add if we don't already have a function at this entry address
        if (!this.functions.has(entryAddress)) {
          this.functions.set(entryAddress, func);
          processedAddresses.add(entryAddress);
        }
      }
    }

    // Assign proper function names (sub1, sub2, etc.)
    this.assignFunctionNames();

    // Return unique functions only (by entry address)
    return Array.from(this.functions.values());
  }

  /**
   * Analyze the main function
   * In NWScript, the entry point can be:
   * 1. A single JSR -> void main()
   * 2. RSADD + JSR -> int StartingConditional()
   * 
   * Special case: If we see SAVEBP -> JSR -> RESTOREBP -> MOVSP -> RETN pattern,
   * the JSR target is for global variable initialization, and we need to find
   * the next JSR that points to the actual main/StartingConditional function.
   */
  private analyzeMainFunction(): NWScriptFunction | null {
    if (!this.cfg.entryBlock) {
      return null;
    }

    // CRITICAL: Entry RSADDI (if present) indicates return type of REAL StartingConditional.
    // This is the ONLY place where RSADD indicates StartingConditional. After the entry JSR,
    // all RSADD patterns are either global variable initializations or part of normal
    // function definitions (RSADD + JSR = function with return type).
    
    // Search through entry block for first RSADD and JSR
    // The entry block may start with T (0x42) instruction, so we need to search
    // Pattern: [T] [RSADD] JSR RETN
    let entryRSADD: NWScriptInstruction | null = null;
    let firstJSR: NWScriptInstruction | null = null;
    
    let current = this.cfg.entryBlock.startInstruction;
    while (current && current.address <= this.cfg.entryBlock.endInstruction.address) {
      // Check for RSADD (must come before JSR if present)
      if (current.code === OP_RSADD && !entryRSADD && !firstJSR) {
        entryRSADD = current;
      }
      // Check for JSR (required)
      if (current.code === OP_JSR && current.offset !== undefined && !firstJSR) {
        firstJSR = current;
        // Once we find JSR, we can stop (RSADD must come before JSR if present)
        break;
      }
      current = current.nextInstr;
    }
    
    if (!firstJSR) {
      return null;
    }
    
    const firstJSRTarget = firstJSR.address + firstJSR.offset;
    const firstJSRBlock = this.cfg.getBlockForAddress(firstJSRTarget);
    
    if (!firstJSRBlock) {
      return null;
    }
    
    // Check if first JSR target contains SAVEBP -> JSR pattern
    // If yes, it's a global init function, and we need to find the second JSR
    let hasGlobals = false;
    let realMainJSRTarget: number | null = null;
    let isStartingConditional = false;
    
    // Search for SAVEBP -> JSR pattern in first JSR target
    const visited = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [firstJSRBlock];
    
    while (queue.length > 0 && !hasGlobals) {
      const block = queue.shift()!;
      if (visited.has(block)) continue;
      visited.add(block);
      
      for (const instr of block.instructions) {
        if (instr.code === OP_SAVEBP) {
          // Found SAVEBP - now search for JSR that comes after it
          // JSR might be in the same block or a successor block
          
          // First check within the same block
          let foundJSR = false;
          let next = instr.nextInstr;
          while (next && next.address <= block.endInstruction.address) {
            if (next.code === OP_JSR && next.offset !== undefined) {
              // Found SAVEBP -> JSR pattern - first JSR is global init
              hasGlobals = true;
              realMainJSRTarget = next.address + next.offset;
              isStartingConditional = entryRSADD !== null;
              foundJSR = true;
              break;
            }
            if (next.code === OP_RESTOREBP) {
              // Hit RESTOREBP before JSR - invalid pattern
              break;
            }
            next = next.nextInstr;
          }
          
          // If not found in same block, search successor blocks
          if (!foundJSR) {
            const jsrSearchVisited = new Set<NWScriptBasicBlock>();
            const jsrSearchQueue: NWScriptBasicBlock[] = Array.from(block.successors);
            
            while (jsrSearchQueue.length > 0 && !foundJSR) {
              const succBlock = jsrSearchQueue.shift()!;
              if (jsrSearchVisited.has(succBlock)) continue;
              jsrSearchVisited.add(succBlock);
              
              // Check if this block contains JSR after SAVEBP
              for (const succInstr of succBlock.instructions) {
                if (succInstr.code === OP_JSR && succInstr.offset !== undefined && succInstr.address > instr.address) {
                  // Found JSR in successor after SAVEBP
                  hasGlobals = true;
                  realMainJSRTarget = succInstr.address + succInstr.offset;
                  isStartingConditional = entryRSADD !== null;
                  foundJSR = true;
                  break;
                }
                if (succInstr.code === OP_RESTOREBP && succInstr.address > instr.address) {
                  // Hit RESTOREBP before JSR - invalid pattern
                  break;
                }
              }
              
              // Continue searching if we haven't found JSR yet
              if (!foundJSR) {
                for (const succSucc of succBlock.successors) {
                  if (!jsrSearchVisited.has(succSucc)) {
                    const hasRetn = succSucc.instructions.some(i => i.code === OP_RETN);
                    if (!hasRetn) {
                      jsrSearchQueue.push(succSucc);
                    }
                  }
                }
              }
            }
          }
          
          if (hasGlobals) break;
        }
      }
      
      // Continue searching if we haven't found SAVEBP yet
      if (!hasGlobals) {
        for (const successor of block.successors) {
          if (!visited.has(successor)) {
            const hasRetn = successor.instructions.some(instr => instr.code === OP_RETN);
            if (!hasRetn) {
              queue.push(successor);
            }
          }
        }
      }
    }
    
    // Determine the actual main/StartingConditional function
    let jsrInstruction: NWScriptInstruction | null = null;
    let mainEntryBlock: NWScriptBasicBlock | null = null;
    let mainEntryAddress: number | null = null;
    
    if (hasGlobals) {
      // First JSR is global init, second JSR (after SAVEBP) is real main/StartingConditional
      // Store the global init function address so we can exclude it from subroutines
      this.globalInitFunctionAddress = firstJSRTarget;
      
      if (realMainJSRTarget !== null) {
        mainEntryBlock = this.cfg.getBlockForAddress(realMainJSRTarget);
        if (mainEntryBlock) {
          mainEntryAddress = realMainJSRTarget;
          // Find the JSR instruction that calls this (it's after SAVEBP in global init)
          jsrInstruction = this.findJSRInstruction(realMainJSRTarget);
          isStartingConditional = entryRSADD !== null;
        }
      }
    } else {
      // No globals - clear any previous global init address
      this.globalInitFunctionAddress = null;
      // No globals - first JSR is main/StartingConditional
      mainEntryBlock = firstJSRBlock;
      mainEntryAddress = firstJSRTarget;
      jsrInstruction = firstJSR;
      isStartingConditional = entryRSADD !== null;
    }
    
    if (!mainEntryBlock || mainEntryAddress === null) {
      return null;
    }
    
    // Use the determined main/StartingConditional entry
    const entryBlock = mainEntryBlock;
    const entryAddress = mainEntryAddress;
    
    // Collect all blocks reachable from entry that aren't part of subroutines
    const bodyBlocks = this.collectFunctionBody(entryBlock);
    const returnBlock = this.findReturnBlock(entryBlock, bodyBlocks);

    // Determine function name and return type
    const functionName = isStartingConditional ? 'StartingConditional' : 'main';

    // Use entry RSADD as the return-type hint even when globals are present.
    // In the globals case, the entry block (or the RSADD just before the inner JSR)
    // still describes the real function's return type.
    let returnType: NWScriptDataType;
    if (entryRSADD) {
      switch (entryRSADD.type) {
        case 3: returnType = NWScriptDataType.INTEGER; break;
        case 4: returnType = NWScriptDataType.FLOAT; break;
        case 5: returnType = NWScriptDataType.STRING; break;
        case 6: returnType = NWScriptDataType.OBJECT; break;
        default: returnType = isStartingConditional ? NWScriptDataType.INTEGER : NWScriptDataType.VOID; break;
      }
    } else {
      returnType = isStartingConditional ? NWScriptDataType.INTEGER : NWScriptDataType.VOID;
    }

    // Analyze parameters from CPTOPBP instructions in function body
    const parameters = this.analyzeParameters(jsrInstruction, bodyBlocks);

    return {
      name: functionName,
      entryBlock: entryBlock,
      returnBlock: returnBlock,
      bodyBlocks: bodyBlocks,
      parameters: parameters,
      returnType: returnType,
      isMain: true,
      jsrInstruction: jsrInstruction
    };
  }

  /**
   * Check if a block contains the global initialization pattern:
   * SAVEBP -> JSR -> RESTOREBP -> MOVSP -> RETN
   */
  private checkGlobalInitPattern(block: NWScriptBasicBlock): boolean {
    let current = block.startInstruction;
    let foundSAVEBP = false;
    let foundJSR = false;
    let foundRESTOREBP = false;
    let foundMOVSP = false;
    
    // Look for the pattern in the block's instructions
    while (current && current.address <= block.endInstruction.address) {
      if (!foundSAVEBP && current.code === OP_SAVEBP) {
        foundSAVEBP = true;
      } else if (foundSAVEBP && !foundJSR && current.code === OP_JSR) {
        foundJSR = true;
      } else if (foundJSR && !foundRESTOREBP && current.code === OP_RESTOREBP) {
        foundRESTOREBP = true;
      } else if (foundRESTOREBP && !foundMOVSP && current.code === OP_MOVSP) {
        foundMOVSP = true;
      } else if (foundMOVSP && current.code === OP_RETN) {
        // Found the complete pattern
        return true;
      }
      
      // If we've started the pattern but hit something unexpected, reset
      if (foundSAVEBP && current.code !== OP_SAVEBP && 
          current.code !== OP_JSR && 
          current.code !== OP_RESTOREBP && 
          current.code !== OP_MOVSP && 
          current.code !== OP_RETN &&
          !foundRESTOREBP) {
        // Reset if we haven't found RESTOREBP yet
        foundSAVEBP = false;
        foundJSR = false;
      }
      
      current = current.nextInstr;
      if (!current) break;
    }
    
    return false;
  }

  /**
   * Analyze a subroutine (function called via JSR)
   */
  private analyzeSubroutine(entryBlock: NWScriptBasicBlock, entryAddress: number): NWScriptFunction | null {
    // Find the JSR instruction that calls this function
    // Note: A function might be called from multiple places, so we find the first JSR
    // If no JSR is found, it might still be a valid function (e.g., called indirectly)
    const jsrInstruction = this.findJSRInstruction(entryAddress);

    // Collect function body blocks
    const bodyBlocks = this.collectFunctionBody(entryBlock);
    
    // If no body blocks collected and no JSR, this might not be a valid function
    if (bodyBlocks.length === 0 && !jsrInstruction) {
      return null;
    }
    
    // Find return block
    const returnBlock = this.findReturnBlock(entryBlock, bodyBlocks);

    // Analyze parameters from CPTOPBP instructions in function body
    // Parameters are identified from the function body, not from the JSR instruction
    // If we don't have a JSR, we can still analyze parameters from the body
    const parameters = jsrInstruction 
      ? this.analyzeParameters(jsrInstruction, bodyBlocks)
      : this.analyzeParameters(entryBlock.startInstruction, bodyBlocks);

    // Analyze return type (stack usage after RETN)
    const returnType = this.analyzeReturnType(entryBlock, bodyBlocks);

    // Generate function name
    const functionName = this.generateFunctionName(entryAddress);

    return {
      name: functionName,
      entryBlock: entryBlock,
      returnBlock: returnBlock,
      bodyBlocks: bodyBlocks,
      parameters: parameters,
      returnType: returnType,
      isMain: false,
      jsrInstruction: jsrInstruction
    };
  }

  /**
   * Find the JSR instruction that targets a specific address
   */
  private findJSRInstruction(targetAddress: number): NWScriptInstruction | null {
    for (const instruction of this.cfg.script.instructions.values()) {
      if (instruction.code === OP_JSR &&
          instruction.offset !== undefined &&
          instruction.address + instruction.offset === targetAddress) {
        return instruction;
      }
    }
    return null;
  }

  /**
   * Collect all blocks that are part of a function body
   */
  private collectFunctionBody(entryBlock: NWScriptBasicBlock): NWScriptBasicBlock[] {
    const bodyBlocks: NWScriptBasicBlock[] = [];
    const visited = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [entryBlock];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      // Skip blocks that are entirely initialization sequences
      if (this.isInitializationBlock(current)) {
        continue;
      }

      // Skip blocks that are part of nested call code (STORE_STATE+JMP pattern)
      if (this.isNestedCallBlock(current)) {
        continue;
      }

      // Don't follow into other functions
      // But allow STORE_STATE+JMP targets (they're part of the same function, not separate functions)
      if (current !== entryBlock && 
          this.cfg.subroutineEntries.has(current.startInstruction.address) &&
          !this.cfg.storeStateJmpTargets.has(current.startInstruction.address)) {
        continue;
      }

      // Add block if it's not just initialization or nested call code
      if (!this.isInitializationBlock(current) && !this.isNestedCallBlock(current)) {
        bodyBlocks.push(current);
      }

      // Follow successors until we hit a RETN or another function
      for (const successor of current.successors) {
        if (!visited.has(successor)) {
          // Check if this is a return point
          if (successor.endInstruction && successor.endInstruction.code === OP_RETN) {
            // Only add if it's not nested call code
            if (!this.isInitializationBlock(successor) && !this.isNestedCallBlock(successor)) {
              bodyBlocks.push(successor);
            }
            continue;
          }

          // Check if this is another function entry
          // But allow STORE_STATE+JMP targets (they're part of the same function)
          if (this.cfg.subroutineEntries.has(successor.startInstruction.address) &&
              !this.cfg.storeStateJmpTargets.has(successor.startInstruction.address)) {
            continue;
          }

          queue.push(successor);
        }
      }
    }

    return bodyBlocks;
  }
  
  /**
   * Check if a block is part of nested call code (between STORE_STATE+JMP and JMP target)
   */
  private isNestedCallBlock(block: NWScriptBasicBlock): boolean {
    // Check if any instruction in the block is part of nested call code
    for (const instruction of block.instructions) {
      if (this.nestedCallAddresses.has(instruction.address)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a block is entirely an initialization sequence
   */
  private isInitializationBlock(block: NWScriptBasicBlock): boolean {
    // Check if all instructions in the block are initialization instructions
    let allInit = true;
    let hasNonInit = false;

    for (const instruction of block.instructions) {
      if (this.initAddresses.has(instruction.address)) {
        // This is an init instruction
      } else if (instruction.code !== OP_RSADD && 
                 instruction.code !== 0x04 && // CONST
                 instruction.code !== 0x01 && // CPDOWNSP
                 instruction.code !== 0x1B && // MOVSP
                 instruction.code !== 0x19) { // NEG
        hasNonInit = true;
        break;
      }
    }

    // If block has only initialization instructions, it's an init block
    return !hasNonInit && block.instructions.length > 0 && 
           block.instructions.some(instr => this.initAddresses.has(instr.address));
  }

  /**
   * Find the return block(s) of a function
   */
  private findReturnBlock(entryBlock: NWScriptBasicBlock, bodyBlocks: NWScriptBasicBlock[]): NWScriptBasicBlock | null {
    // Look for blocks ending with RETN
    for (const block of bodyBlocks) {
      if (block.endInstruction && block.endInstruction.code === OP_RETN) {
        return block;
      }
    }

    // If no RETN found, function might not return (or reaches end of script)
    return null;
  }

  /**
   * Analyze function parameters from CPTOPBP instructions within the function body
   * Parameters are accessed via CPTOPBP with negative offsets
   */
  private analyzeParameters(jsrInstruction: NWScriptInstruction, bodyBlocks: NWScriptBasicBlock[]): NWScriptFunctionParameter[] {
    const parameterOffsets = new Map<number, { dataType: NWScriptDataType, count: number }>();
    
    // Scan all instructions in function body for CPTOPBP with negative offsets
    for (const block of bodyBlocks) {
      for (const instruction of block.instructions) {
        if (instruction.code === OP_CPTOPBP && instruction.offset !== undefined) {
          const offset = instruction.offset;
          // Convert to signed 32-bit integer
          const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
          
          // Negative offsets are function parameters (accessed relative to BP)
          if (offsetSigned < 0) {
            // Infer data type from instruction type
            let dataType = NWScriptDataType.INTEGER;
            if (instruction.type === 4) dataType = NWScriptDataType.FLOAT;
            else if (instruction.type === 5) dataType = NWScriptDataType.STRING;
            else if (instruction.type === 6) dataType = NWScriptDataType.OBJECT;
            
            const existing = parameterOffsets.get(offsetSigned);
            if (existing) {
              existing.count++;
              // Prefer more specific types
              if (dataType !== NWScriptDataType.INTEGER && existing.dataType === NWScriptDataType.INTEGER) {
                existing.dataType = dataType;
              }
            } else {
              parameterOffsets.set(offsetSigned, { dataType, count: 1 });
            }
          }
        }
      }
    }
    
    // Convert offsets to sorted parameter list
    // Parameters are accessed with negative offsets relative to BP
    // We need to sort them by offset (most negative = first parameter, least negative = last parameter)
    const sortedOffsets = Array.from(parameterOffsets.keys()).sort((a, b) => a - b); // Ascending (most negative first)
    
    const parameters: NWScriptFunctionParameter[] = [];
    for (let i = 0; i < sortedOffsets.length; i++) {
      const offset = sortedOffsets[i];
      const info = parameterOffsets.get(offset)!;
      
      // Parameter index (0 = first parameter, accessed with most negative offset)
      const paramIndex = i;
      
      // Generate parameter name based on type
      const typePrefix = this.getTypePrefix(info.dataType);
      const paramName = `${typePrefix}Param${paramIndex + 1}`; // param1, param2, param3, etc.
      
      parameters.push({
        name: paramName,
        dataType: info.dataType,
        offset: offset
      });
    }
    
    return parameters;
  }
  
  /**
   * Get type prefix for parameter naming
   */
  private getTypePrefix(dataType: NWScriptDataType): string {
    switch (dataType) {
      case NWScriptDataType.INTEGER: return 'int';
      case NWScriptDataType.FLOAT: return 'float';
      case NWScriptDataType.STRING: return 'string';
      case NWScriptDataType.OBJECT: return 'object';
      default: return 'int';
    }
  }

  /**
   * Analyze return type from stack usage
   */
  private analyzeReturnType(entryBlock: NWScriptBasicBlock, bodyBlocks: NWScriptBasicBlock[]): NWScriptDataType {
    // Look for RSADD at the start (indicates return type)
    for (const instruction of entryBlock.instructions) {
      if (instruction.code === OP_RSADD) {
        // Map type to return type
        switch (instruction.type) {
          case 3: return NWScriptDataType.INTEGER;
          case 4: return NWScriptDataType.FLOAT;
          case 5: return NWScriptDataType.STRING;
          case 6: return NWScriptDataType.OBJECT;
          default: return NWScriptDataType.VOID;
        }
      }
    }

    // Default to void if no RSADD found
    return NWScriptDataType.VOID;
  }

  /**
   * Generate a function name
   * Functions are named sub1, sub2, etc., in order of their entry addresses
   * (excluding main/StartingConditional which keep their special names)
   */
  private generateFunctionName(entryAddress: number): string {
    // This will be called during analysis, so we need to generate names based on order
    // We'll assign names after all functions are identified
    // For now, return a placeholder that will be replaced
    return `__sub_${entryAddress}__`;
  }

  /**
   * Assign proper function names (sub1, sub2, etc.) after all functions are identified
   */
  private assignFunctionNames(): void {
    // Get all functions except main, sorted by entry address
    const subroutines = Array.from(this.functions.values())
      .filter(func => !func.isMain)
      .sort((a, b) => a.entryBlock.startInstruction.address - b.entryBlock.startInstruction.address);

    // Assign names: sub1, sub2, sub3, etc.
    for (let i = 0; i < subroutines.length; i++) {
      subroutines[i].name = `sub${i + 1}`;
    }
  }

  /**
   * Get all functions
   */
  getFunctions(): NWScriptFunction[] {
    return Array.from(this.functions.values());
  }

  /**
   * Get the main function
   */
  getMainFunction(): NWScriptFunction | null {
    return this.mainFunction;
  }

  /**
   * Get a function by entry address
   */
  getFunction(entryAddress: number): NWScriptFunction | null {
    return this.functions.get(entryAddress) || null;
  }
}


