import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import type { NWScriptGlobalInit } from "@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { inferSubroutineParameterSlotsFromCallSites } from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import { OP_JSR, OP_RETN, OP_RSADD, OP_STORE_STATE, OP_STORE_STATEALL, OP_JMP, OP_JZ, OP_JNZ, OP_SAVEBP, OP_RESTOREBP, OP_MOVSP, OP_CPTOPBP, OP_CPTOPSP, OP_CPDOWNSP, OP_CPDOWNBP, OP_CONST, OP_ACTION, OP_ADD } from "@/nwscript/NWScriptOPCodes";

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
  /** BP-relative operand for CPTOPBP; when {@link resolvedViaSpOperand} holds, this is CPTOPSP's signed offset operand */
  offset: number;
  /** True when the compiler passes/reads parameters via CPTOPSP negative operands instead of CPTOPBP */
  resolvedViaSpOperand?: boolean;
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

  /** Signed CPTOPBP offsets that refer to script globals — not subroutine parameters. */
  private readonly globalCptopbpOffsets = new Set<number>();

  constructor(cfg: NWScriptControlFlowGraph, globalInits: NWScriptGlobalInit[] = []) {
    this.cfg = cfg;
    this.globalInits = globalInits;
    for (const g of globalInits) {
      const o = g.offset > 0x7fffffff ? g.offset - 0x100000000 : g.offset;
      this.globalCptopbpOffsets.add(o);
    }
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
   * Inlined thunk bytes live between STORE_STATE's JMP instruction's linear successor and the JMP target.
   * Contract: keep in sync with {@link NWScriptStoreStateThunkSkip.computeInlinedThunkSkipAddresses}.
   */
  private identifyNestedCallCode(): void {
    for (const instruction of this.cfg.script.instructions.values()) {
      if (instruction.code === OP_STORE_STATE || instruction.code === OP_STORE_STATEALL) {
        const nextInstr = instruction.nextInstr;
        if (nextInstr && nextInstr.code === OP_JMP && nextInstr.offset !== undefined) {
          const jmpTarget = nextInstr.address + nextInstr.offset;

          let current: NWScriptInstruction | null | undefined = nextInstr.nextInstr;
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

    // NCSDecomp runs a bounded fixed-point on subroutine typing/prototypes; we rely on
    // NWScriptArgumentStackLayout.buildJsrCalleeArgSlotsByEntryPc at AST conversion time instead.

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

    // Main / StartingConditional have no formal parameters; CPTOPSP-only inference would
    // mis-label locals/temps in the large body as intParam1, intParam2, ...
    const parameters = this.analyzeParameters(jsrInstruction, bodyBlocks, false, entryAddress, entryBlock);

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
    const parameters = this.analyzeParameters(jsrInstruction, bodyBlocks, true, entryAddress, entryBlock);

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

      // Skip init / thunk islands, but never skip the callee entry block: a false-positive init/nested
      // classification on entry would `continue` before successors were queued and left bodyBlocks empty
      // (smoke_20 Mid / Leaf had no CPTOPSP-based parameters).
      if (current !== entryBlock && this.isInitializationBlock(current)) {
        continue;
      }

      if (current !== entryBlock && this.isNestedCallBlock(current)) {
        continue;
      }

      // Don't follow into other functions
      // But allow STORE_STATE+JMP targets (they're part of the same function, not separate functions)
      if (current !== entryBlock && 
          this.cfg.subroutineEntries.has(current.startInstruction.address) &&
          !this.cfg.storeStateJmpTargets.has(current.startInstruction.address)) {
        continue;
      }

      // Always include the entry block; for other blocks skip init-only / nested-call payloads.
      if (current === entryBlock || (!this.isInitializationBlock(current) && !this.isNestedCallBlock(current))) {
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
   * @param allowCptopspInference when false, skip CPTOPSP-operand fallback (used for main/StartingConditional)
   */
  private analyzeParameters(
    _jsrInstruction: NWScriptInstruction | null,
    bodyBlocks: NWScriptBasicBlock[],
    allowCptopspInference: boolean,
    entryAddress: number,
    entryBlock: NWScriptBasicBlock
  ): NWScriptFunctionParameter[] {
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
            if (this.globalCptopbpOffsets.has(offsetSigned)) {
              continue;
            }
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
    
    if (parameters.length > 0) {
      return parameters;
    }

    if (!allowCptopspInference) {
      return [];
    }

    // Prefer arity from non-thunk call sites; fall back to STORE_STATE thunk JSRs
    // (DelayCommand(..., Helper(arg))) when the callee is only invoked from a thunk.
    const minCallerArgSlotsExcludingThunks = inferSubroutineParameterSlotsFromCallSites(
      this.cfg.script,
      entryAddress,
      (instr) => !this.nestedCallAddresses.has(instr.address)
    );
    const minCallerArgSlotsIncludingThunks = inferSubroutineParameterSlotsFromCallSites(
      this.cfg.script,
      entryAddress
    );
    const minCallerArgSlots =
      minCallerArgSlotsExcludingThunks > 0
        ? minCallerArgSlotsExcludingThunks
        : minCallerArgSlotsIncludingThunks;
    if (minCallerArgSlots === 0) {
      return [];
    }

    let out = this.inferParametersFromCptopspOperands(bodyBlocks);
    if (out.length < minCallerArgSlots) {
      const fb = this.fallbackCptopspParamsFromEntryBlock(entryBlock, bodyBlocks, minCallerArgSlots);
      if (fb.length > out.length) {
        out = fb;
      }
    }
    out = this.narrowCptopspParamsToCallArity(out, minCallerArgSlots);
    // Empty stubs (e.g. Db_PostString) never CPTOP their formals — invent from CONST
    // pushes at call sites so the decl arity matches the calls.
    if (out.length === 0 && minCallerArgSlots > 0) {
      out = this.inventFormalsFromCallSiteConsts(entryAddress, minCallerArgSlots);
    }
    return this.refineCptopspParamTypesFromCallSites(entryAddress, out);
  }

  /**
   * Invent formals for empty-body stubs from CONST type codes pushed immediately before
   * each JSR to {@code entryAddress}. Left-to-right CONST order = param1..paramN.
   */
  private inventFormalsFromCallSiteConsts(
    entryAddress: number,
    minSlots: number
  ): NWScriptFunctionParameter[] {
    const typeVotes: NWScriptDataType[][] = Array.from({ length: minSlots }, () => []);
    for (const instr of this.cfg.script.instructions.values()) {
      if (instr.code !== OP_JSR || instr.offset === undefined) {
        continue;
      }
      if (instr.address + instr.offset !== entryAddress) {
        continue;
      }
      const argTypes = this.inferArgTypesBeforeJsr(instr, minSlots);
      for (let i = 0; i < argTypes.length; i++) {
        typeVotes[i].push(argTypes[i]);
      }
    }

    const params: NWScriptFunctionParameter[] = [];
    for (let i = 0; i < minSlots; i++) {
      const votes = typeVotes[i];
      let dataType = NWScriptDataType.INTEGER;
      if (votes.length > 0) {
        const objectVotes = votes.filter((v) => v === NWScriptDataType.OBJECT).length;
        const floatVotes = votes.filter((v) => v === NWScriptDataType.FLOAT).length;
        const stringVotes = votes.filter((v) => v === NWScriptDataType.STRING).length;
        if (objectVotes > 0) dataType = NWScriptDataType.OBJECT;
        else if (floatVotes > 0) dataType = NWScriptDataType.FLOAT;
        else if (stringVotes > 0) dataType = NWScriptDataType.STRING;
        else dataType = NWScriptDataType.INTEGER;
      }
      const typePrefix = this.getTypePrefix(dataType);
      const offset = -(minSlots - i) * 4;
      params.push({
        name: `${typePrefix}Param${i + 1}`,
        dataType,
        offset,
        resolvedViaSpOperand: true,
      });
    }
    return params;
  }

  /**
   * Map CONST type byte / binary type to NWScriptDataType.
   */
  private dataTypeFromConstOrBinaryType(typeCode: number): NWScriptDataType {
    if (typeCode === 4) return NWScriptDataType.FLOAT;
    if (typeCode === 5 || typeCode === 0x23) return NWScriptDataType.STRING;
    if (typeCode === 6) return NWScriptDataType.OBJECT;
    if (typeCode === 3) return NWScriptDataType.INTEGER;
    return NWScriptDataType.INTEGER;
  }

  /**
   * Mini type-stack walk of the instruction chain immediately before a JSR.
   * Models CONST pushes, valued ACTION returns, and ADD type 0x23 (string concat).
   * Returns arg types top-first (param1 = stack top at JSR).
   */
  private inferArgTypesBeforeJsr(
    jsr: NWScriptInstruction,
    maxSlots: number
  ): NWScriptDataType[] {
    const rev: NWScriptInstruction[] = [];
    let p: NWScriptInstruction | null | undefined = jsr.prevInstr;
    let steps = 0;
    while (p && steps++ < 64) {
      if (p.code === OP_JSR || p.code === OP_RETN || p.code === OP_JMP) {
        break;
      }
      rev.push(p);
      p = p.prevInstr;
    }
    rev.reverse();

    const typeStack: NWScriptDataType[] = [];
    const pushType = (dt: NWScriptDataType) => {
      typeStack.push(dt);
    };
    const popType = (): NWScriptDataType => {
      return typeStack.pop() ?? NWScriptDataType.INTEGER;
    };

    for (const ins of rev) {
      if (ins.code === OP_CONST && ins.type !== undefined) {
        pushType(this.dataTypeFromConstOrBinaryType(ins.type));
        continue;
      }
      if (ins.code === OP_CPTOPSP || ins.code === OP_CPTOPBP) {
        pushType(NWScriptDataType.INTEGER);
        continue;
      }
      if (ins.code === OP_RSADD) {
        // Return/local reservation — not an arg; ignore for type stack of caller args.
        continue;
      }
      if (ins.code === OP_ADD && ins.type === 0x23) {
        popType();
        popType();
        pushType(NWScriptDataType.STRING);
        continue;
      }
      if (ins.code === OP_ACTION) {
        const def = ins.actionDefinition;
        if (def) {
          const argCount = def.args?.length ?? 0;
          for (let i = 0; i < argCount; i++) {
            popType();
          }
          if (def.type !== undefined && def.type !== NWScriptDataType.VOID) {
            pushType(def.type);
          }
        } else {
          // Unknown action: treat as valued (common for Get* returning one slot).
          pushType(NWScriptDataType.INTEGER);
        }
        continue;
      }
      // MOVSP / CPDOWN etc. — leave type stack alone for arg inference
    }

    const out: NWScriptDataType[] = [];
    for (let i = 0; i < maxSlots && typeStack.length > 0; i++) {
      out.push(typeStack.pop()!);
    }
    return out;
  }

  /**
   * If a formal is CPTOP'd as the sole arg to PrintString, vote STRING.
   */
  private voteStringFromPrintStringBody(
    entryAddress: number,
    spParams: NWScriptFunctionParameter[],
    typeVotes: NWScriptDataType[][]
  ): void {
    const entryBlock = this.cfg.getBlockForAddress(entryAddress);
    if (!entryBlock) {
      return;
    }
    let cur: NWScriptInstruction | null | undefined = entryBlock.startInstruction;
    let guard = 100000;
    while (cur && guard-- > 0) {
      if (cur.code === OP_RETN) {
        break;
      }
      if (cur.code === OP_ACTION && cur.actionDefinition?.name === "PrintString") {
        let q: NWScriptInstruction | null | undefined = cur.prevInstr;
        let qSteps = 0;
        while (q && qSteps++ < 8) {
          if (q.code === OP_CPTOPSP && q.offset !== undefined) {
            const off = q.offset > 0x7FFFFFFF ? q.offset - 0x100000000 : q.offset;
            const idx = spParams.findIndex((p) => p.offset === off);
            if (idx >= 0) {
              typeVotes[idx].push(NWScriptDataType.STRING);
            }
            break;
          }
          if (q.code === OP_CONST || q.code === OP_ACTION || q.code === OP_JSR) {
            break;
          }
          q = q.prevInstr;
        }
      }
      cur = cur.nextInstr;
    }
  }

  /**
   * CPTOPSP type bytes are often generic (0x01); refine formal types from call-site
   * type stacks (CONST / valued ACTION / ADDSS) and PrintString body feedback.
   */
  private refineCptopspParamTypesFromCallSites(
    entryAddress: number,
    params: NWScriptFunctionParameter[]
  ): NWScriptFunctionParameter[] {
    if (params.length === 0) {
      return params;
    }
    const spParams = params.filter((p) => p.resolvedViaSpOperand);
    if (spParams.length === 0) {
      return params;
    }

    const typeVotes: NWScriptDataType[][] = spParams.map(() => []);
    for (const instr of this.cfg.script.instructions.values()) {
      if (instr.code !== OP_JSR || instr.offset === undefined) {
        continue;
      }
      if (instr.address + instr.offset !== entryAddress) {
        continue;
      }
      const argTypes = this.inferArgTypesBeforeJsr(instr, spParams.length);
      for (let i = 0; i < argTypes.length; i++) {
        typeVotes[i].push(argTypes[i]);
      }
    }

    this.voteStringFromPrintStringBody(entryAddress, spParams, typeVotes);

    return params.map((param) => {
      if (!param.resolvedViaSpOperand) {
        return param;
      }
      const spIndex = spParams.indexOf(param);
      if (spIndex < 0 || typeVotes[spIndex].length === 0) {
        return param;
      }
      const votes = typeVotes[spIndex];
      const objectVotes = votes.filter((v) => v === NWScriptDataType.OBJECT).length;
      const floatVotes = votes.filter((v) => v === NWScriptDataType.FLOAT).length;
      const stringVotes = votes.filter((v) => v === NWScriptDataType.STRING).length;
      let dataType = param.dataType;
      if (objectVotes > 0) dataType = NWScriptDataType.OBJECT;
      else if (floatVotes > 0) dataType = NWScriptDataType.FLOAT;
      else if (stringVotes > 0) dataType = NWScriptDataType.STRING;
      if (dataType === param.dataType) {
        return param;
      }
      const typePrefix = this.getTypePrefix(dataType);
      const indexMatch = param.name.match(/(\d+)$/);
      const idx = indexMatch ? indexMatch[1] : "1";
      return {
        ...param,
        dataType,
        name: `${typePrefix}Param${idx}`,
      };
    });
  }

  /**
   * CPTOPSP-operand inference can pick up locals/temps (e.g. -8) ahead of the real lone int param (-4).
   * When call sites push {@code minSlots} words, keep the {@code minSlots} operands closest to zero (least negative),
   * then renumber most-negative-first as intParam1, …
   */
  private narrowCptopspParamsToCallArity(
    params: NWScriptFunctionParameter[],
    minSlots: number
  ): NWScriptFunctionParameter[] {
    const bpParams = params.filter((p) => !p.resolvedViaSpOperand);
    const spParams = params.filter((p) => p.resolvedViaSpOperand);
    if (minSlots < 1 || spParams.length <= minSlots) {
      return params;
    }
    const asc = [...spParams].sort((a, b) => a.offset - b.offset);
    const picked = asc.slice(-minSlots);
    picked.sort((a, b) => a.offset - b.offset);
    const renumbered = picked.map((p, i) => {
      const typePrefix = this.getTypePrefix(p.dataType);
      return {
        ...p,
        name: `${typePrefix}Param${i + 1}`,
      };
    });
    return [...bpParams, ...renumbered];
  }

  private fallbackCptopspParamsFromEntryBlock(
    entryBlock: NWScriptBasicBlock,
    bodyBlocks: NWScriptBasicBlock[],
    maxParams: number
  ): NWScriptFunctionParameter[] {
    const scanOrder: NWScriptBasicBlock[] = [entryBlock];
    for (const b of bodyBlocks) {
      if (b.startInstruction.address !== entryBlock.startInstruction.address) {
        scanOrder.push(b);
      }
    }
    const distinct: number[] = [];
    const seen = new Set<number>();
    outer: for (const block of scanOrder) {
      for (const instruction of block.instructions) {
        if (instruction.code !== OP_CPTOPSP || instruction.offset === undefined) {
          continue;
        }
        const signed = instruction.offset > 0x7fffffff ? instruction.offset - 0x100000000 : instruction.offset;
        if (signed >= 0 || seen.has(signed)) {
          continue;
        }
        seen.add(signed);
        distinct.push(signed);
        if (distinct.length >= maxParams * 8) {
          break outer;
        }
      }
    }
    distinct.sort((a, b) => a - b);
    const take = distinct.slice(0, maxParams);
    return take.map((off, i) => {
      let dataType = NWScriptDataType.INTEGER;
      for (const block of scanOrder) {
        for (const instruction of block.instructions) {
          if (
            instruction.code === OP_CPTOPSP &&
            instruction.offset !== undefined &&
            (instruction.offset > 0x7fffffff ? instruction.offset - 0x100000000 : instruction.offset) === off
          ) {
            if (instruction.type === 4) {
              dataType = NWScriptDataType.FLOAT;
            } else if (instruction.type === 5) {
              dataType = NWScriptDataType.STRING;
            } else if (instruction.type === 6) {
              dataType = NWScriptDataType.OBJECT;
            }
            break;
          }
        }
      }
      const typePrefix = this.getTypePrefix(dataType);
      return {
        name: `${typePrefix}Param${i + 1}`,
        dataType,
        offset: off,
        resolvedViaSpOperand: true,
      };
    });
  }

  /**
   * Many void helpers read int/float/etc. arguments only via CPTOPSP (never CPTOPBP). Infer distinct
   * negative CPTOPSP operands ordered most-negative-first as formal parameters (matches typical frame layout).
   */
  private inferParametersFromCptopspOperands(bodyBlocks: NWScriptBasicBlock[]): NWScriptFunctionParameter[] {
    const tally = new Map<number, { dataType: NWScriptDataType; count: number }>();
    for (const block of bodyBlocks) {
      for (const instruction of block.instructions) {
        if (instruction.code !== OP_CPTOPSP || instruction.offset === undefined) {
          continue;
        }
        const signed = instruction.offset > 0x7fffffff ? instruction.offset - 0x100000000 : instruction.offset;
        if (signed >= 0) {
          continue;
        }

        let dataType = NWScriptDataType.INTEGER;
        if (instruction.type === 4) {
          dataType = NWScriptDataType.FLOAT;
        } else if (instruction.type === 5) {
          dataType = NWScriptDataType.STRING;
        } else if (instruction.type === 6) {
          dataType = NWScriptDataType.OBJECT;
        }

        const existing = tally.get(signed);
        if (existing) {
          existing.count++;
          if (dataType !== NWScriptDataType.INTEGER && existing.dataType === NWScriptDataType.INTEGER) {
            existing.dataType = dataType;
          }
        } else {
          tally.set(signed, { dataType, count: 1 });
        }
      }
    }

    if (tally.size === 0) {
      return [];
    }

    const sortedOffsets = [...tally.keys()].sort((a, b) => a - b);
    return sortedOffsets.map((off, i) => {
      const info = tally.get(off)!;
      const typePrefix = this.getTypePrefix(info.dataType);
      return {
        name: `${typePrefix}Param${i + 1}`,
        dataType: info.dataType,
        offset: off,
        resolvedViaSpOperand: true,
      };
    });
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
   * Analyze return type for a **subroutine** (JSR target), not main/StartingConditional.
   *
   * Caller RSADD-before-JSR is necessary but not sufficient: a preceding local
   * {@code int x;} is also RSADD immediately before a void call. Require a
   * callee return-slot write (CPDOWNSP → MOVSP → RETN) before trusting caller RSADD.
   */
  private analyzeReturnType(entryBlock: NWScriptBasicBlock, bodyBlocks: NWScriptBasicBlock[]): NWScriptDataType {
    if (!this.calleeHasReturnValueWrite(bodyBlocks)) {
      return NWScriptDataType.VOID;
    }

    const entryAddress = entryBlock.startInstruction?.address;
    if (entryAddress === undefined) {
      return NWScriptDataType.INTEGER;
    }

    const votes = new Map<NWScriptDataType, number>();
    for (const instruction of this.cfg.script.instructions.values()) {
      if (
        instruction.code !== OP_JSR ||
        instruction.offset === undefined ||
        instruction.address + instruction.offset !== entryAddress
      ) {
        continue;
      }
      const rsadd = this.findCallerReturnRsadd(instruction);
      if (!rsadd) {
        continue;
      }
      const dt = this.rsaddTypeToDataType(rsadd.type);
      if (dt === NWScriptDataType.VOID) {
        continue;
      }
      votes.set(dt, (votes.get(dt) || 0) + 1);
    }

    if (votes.size === 0) {
      // Callee epilogue can look like a return write (last assign + MOVSP + RETN).
      // Without a caller RSADD vote, keep VOID.
      return NWScriptDataType.VOID;
    }

    let best: NWScriptDataType = NWScriptDataType.INTEGER;
    let bestCount = 0;
    for (const [dt, count] of votes) {
      if (count > bestCount) {
        best = dt;
        bestCount = count;
      }
    }
    return best;
  }

  /** True if any body block has CPDOWNSP → MOVSP … → RETN/JMP (user return value). */
  private calleeHasReturnValueWrite(bodyBlocks: NWScriptBasicBlock[]): boolean {
    for (const block of bodyBlocks) {
      for (let i = 0; i < block.instructions.length; i++) {
        const instr = block.instructions[i];
        if (instr.code !== OP_CPDOWNSP) continue;
        if (i + 1 >= block.instructions.length) continue;
        if (block.instructions[i + 1].code !== OP_MOVSP) continue;
        const limit = Math.min(i + 8, block.instructions.length);
        for (let j = i + 2; j < limit; j++) {
          const next = block.instructions[j];
          if (next.code === OP_RETN || next.code === OP_JMP) return true;
          if (next.code === OP_JSR || next.code === OP_JZ || next.code === OP_JNZ) break;
        }
      }
    }
    return false;
  }

  /** Map RSADD unary type byte to {@link NWScriptDataType}. */
  private rsaddTypeToDataType(rsaddType: number): NWScriptDataType {
    switch (rsaddType) {
      case 3: return NWScriptDataType.INTEGER;
      case 4: return NWScriptDataType.FLOAT;
      case 5: return NWScriptDataType.STRING;
      case 6: return NWScriptDataType.OBJECT;
      default: return NWScriptDataType.VOID;
    }
  }

  /**
   * Walk backward from a JSR for the caller RSADD that reserved return space.
   * Rejects RSADD followed by CPDOWNSP before the JSR (local init pattern).
   */
  private findCallerReturnRsadd(jsr: NWScriptInstruction): NWScriptInstruction | null {
    let current: NWScriptInstruction | null = jsr.prevInstr;
    const between: NWScriptInstruction[] = [];
    let steps = 0;
    while (current && steps < 64) {
      if (current.code === OP_RSADD) {
        for (const instr of between) {
          if (instr.code === OP_CPDOWNSP || instr.code === OP_CPDOWNBP) {
            return null;
          }
        }
        return current;
      }
      if (
        current.code === OP_JMP ||
        current.code === OP_JZ ||
        current.code === OP_JNZ ||
        current.code === OP_RETN ||
        current.code === OP_JSR
      ) {
        break;
      }
      between.push(current);
      current = current.prevInstr;
      steps++;
    }
    return null;
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


