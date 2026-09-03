import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import type { NWScriptGlobalInit } from "@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import {
  inferSubroutineCallAbiFromCallSites,
  inferSubroutineParameterSlotsFromCallSites,
  inferSubroutineReturnTypeFromCallSites,
  inferActionReturnFromStoreCleanup,
  inferJsrArgumentTypes,
  inferJsrArgumentTypesByTotalSlots,
  instructionForwardStackSlotDelta,
  nwscriptDataTypeStackBytes,
  nwscriptParametersTotalBytes,
  type InferredJsrArgument,
} from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  getArithmeticTypeSignature,
  getComparisonTypeSignature,
  getUnaryDataType,
  stackSlotsForByteSize,
  stackSlotsForDataType,
  toSignedInt32,
} from "@/nwscript/decompiler/NWScriptOpcodeSemantics";
import { computeInlinedThunkSkipAddresses } from "@/nwscript/decompiler/NWScriptStoreStateThunkSkip";
import {
  OP_ACTION, OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MODII,
  OP_EQUAL, OP_NEQUAL, OP_GEQ, OP_GT, OP_LT, OP_LEQ,
  OP_LOGANDII, OP_LOGORII, OP_BOOLANDII, OP_INCORII, OP_EXCORII,
  OP_SHLEFTII, OP_SHRIGHTII, OP_USHRIGHTII,
  OP_NEG, OP_COMPI, OP_NOTI,
  OP_JSR, OP_RETN, OP_RSADD, OP_JMP,
  OP_SAVEBP, OP_RESTOREBP, OP_MOVSP, OP_CPTOPBP, OP_CPTOPSP,
  OP_CPDOWNSP, OP_CPDOWNBP, OP_NOP, OP_CONST, OP_JZ, OP_JNZ, OP_DESTRUCT,
} from "@/nwscript/NWScriptOPCodes";

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
  returnStackSlots?: number;
  returnStructureFieldTypes?: NWScriptDataType[];
  isMain: boolean;
  jsrInstruction: NWScriptInstruction | null; // The JSR that calls this function
}

export interface NWScriptFunctionParameter {
  name: string;
  dataType: NWScriptDataType;
  /** BP-relative operand for CPTOPBP; when {@link resolvedViaSpOperand} holds, this is CPTOPSP's signed offset operand */
  offset: number;
  stackSlots?: number;
  structureFieldTypes?: NWScriptDataType[];
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
  private returnStructureFieldsByEntry: Map<number, NWScriptDataType[]> = new Map();

  /** Signed CPTOPBP offsets that refer to script globals — not subroutine parameters. */
  private readonly globalCptopbpOffsets = new Set<number>();

  constructor(cfg: NWScriptControlFlowGraph, globalInits: NWScriptGlobalInit[] = []) {
    this.cfg = cfg;
    this.globalInits = globalInits;
    for (const g of globalInits) {
      const o = g.offset > 0x7fffffff ? g.offset - 0x100000000 : g.offset;
      this.globalCptopbpOffsets.add(o);
    }
    // The owning wrapper procedure is excluded separately; one producer address is enough for
    // initialization-only block classification and avoids a source-size-dependent lookahead.
    for (const init of globalInits) {
      this.initAddresses.add(init.instructionAddress);
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
    this.nestedCallAddresses = computeInlinedThunkSkipAddresses(this.cfg.script);
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

    this.refineFunctionParameterTypesFixedPoint();

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
    
    const firstJSRTarget = firstJSR.address + toSignedInt32(firstJSR.offset);
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
              realMainJSRTarget = next.address + toSignedInt32(next.offset);
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
                  realMainJSRTarget = succInstr.address + toSignedInt32(succInstr.offset);
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

    const returnType = this.analyzeReturnType(entryAddress, bodyBlocks, parameters);
    const returnStructureFieldTypes = this.returnStructureFieldsByEntry.get(entryAddress);

    // Generate function name
    const functionName = this.generateFunctionName(entryAddress);

    return {
      name: functionName,
      entryBlock: entryBlock,
      returnBlock: returnBlock,
      bodyBlocks: bodyBlocks,
      parameters: parameters,
      returnType: returnType,
      returnStackSlots: returnStructureFieldTypes?.length,
      returnStructureFieldTypes,
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
          instruction.address + toSignedInt32(instruction.offset) === targetAddress) {
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
    const parameterOffsets = new Map<
      number,
      { dataType: NWScriptDataType; count: number; stackSlots: number }
    >();
    
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
            // CPTOPBP's type byte is the copy opcode type (normally 0x01), not the
            // source-language datatype. Width can identify vectors; scalar type is refined at callers.
            const stackSlots = stackSlotsForByteSize(
              instruction.size ?? 4,
              instruction.codeName || 'CPTOPBP'
            );
            const dataType = stackSlots === 3
              ? NWScriptDataType.VECTOR
              : stackSlots > 1
                ? NWScriptDataType.STRUCTURE
                : NWScriptDataType.INTEGER;
            
            const existing = parameterOffsets.get(offsetSigned);
            if (existing) {
              existing.count++;
              // Prefer more specific types
              if (dataType !== NWScriptDataType.INTEGER && existing.dataType === NWScriptDataType.INTEGER) {
                existing.dataType = dataType;
              }
              existing.stackSlots = Math.max(existing.stackSlots, stackSlots);
            } else {
              parameterOffsets.set(offsetSigned, { dataType, count: 1, stackSlots });
            }
          }
        }
      }
    }
    
    // Formal one is nearest TOS and has the least-negative frame offset. Wider formals use
    // the offset of the bottom of their occupied range (for example, a first vector is -12).
    const sortedOffsets = Array.from(parameterOffsets.keys()).sort((a, b) => b - a);
    
    const parameters: NWScriptFunctionParameter[] = [];
    for (let i = 0; i < sortedOffsets.length; i++) {
      const offset = sortedOffsets[i];
      const info = parameterOffsets.get(offset)!;
      
      // Parameter index (0 = first source-level formal)
      const paramIndex = i;
      
      // Generate parameter name based on type
      const typePrefix = this.getTypePrefix(info.dataType);
      const paramName = `${typePrefix}Param${paramIndex + 1}`; // param1, param2, param3, etc.
      
      parameters.push({
        name: paramName,
        dataType: info.dataType,
        offset: offset,
        stackSlots: info.stackSlots,
        structureFieldTypes: info.dataType === NWScriptDataType.STRUCTURE
          ? new Array<NWScriptDataType>(info.stackSlots).fill(NWScriptDataType.INTEGER)
          : undefined,
      });
    }
    
    const tailSlots = this.inferParameterCleanupSlots(bodyBlocks);
    const returnWriteBytes = this.inferReturnWriteBytes(bodyBlocks);
    const callerAbi = returnWriteBytes === null
      ? null
      : inferSubroutineCallAbiFromCallSites(
          this.cfg.script,
          entryAddress,
          returnWriteBytes
        );
    const authoritativeSlots = tailSlots > 0
      ? tailSlots
      : callerAbi?.parameterSlots ?? null;
    const callSiteLayout = authoritativeSlots === null
      ? null
      : this.inferParameterLayoutFromCallSites(entryAddress, authoritativeSlots);
    const minCallerArgSlots = inferSubroutineParameterSlotsFromCallSites(
      this.cfg.script,
      entryAddress
    );
    // A shared compiler epilogue is occasionally outside the conservative function body. In
    // that case CPTOPSP analysis can miss a formal used only in a path whose entry depth is
    // ambiguous. Accept the caller width only when every slot can also be parsed into complete
    // argument expressions. This rejects raw deltas polluted by a local RSADD or a non-void
    // result reservation while recovering cases such as a fourth string passed to a void helper.
    const parsedCallerLayout = authoritativeSlots === null && minCallerArgSlots > 0
      ? this.inferParameterLayoutFromCallSites(entryAddress, minCallerArgSlots)
      : null;
    const finalize = (selected: NWScriptFunctionParameter[]) =>
      this.refineParameterTypesFromBody(
        this.refineParameterTypesFromCallSites(selected, entryAddress),
        entryBlock,
        bodyBlocks
      );
    const selectCompleteLayout = (
      inferred: NWScriptFunctionParameter[]
    ): NWScriptFunctionParameter[] => {
      if (
        callSiteLayout &&
        this.parameterStackSlots(inferred) !== authoritativeSlots
      ) {
        return callSiteLayout;
      }
      if (
        parsedCallerLayout &&
        this.parameterStackSlots(inferred) !== minCallerArgSlots
      ) {
        return parsedCallerLayout;
      }
      return inferred;
    };

    if (parameters.length > 0) {
      return finalize(selectCompleteLayout(parameters));
    }

    if (!allowCptopspInference) {
      return [];
    }

    let out = this.inferParametersFromCptopspOperands(entryBlock, bodyBlocks);
    if (minCallerArgSlots === 0) {
      return finalize(selectCompleteLayout(out));
    }

    const narrowed = this.narrowCptopspParamsToCallArity(out, minCallerArgSlots);
    return finalize(selectCompleteLayout(narrowed));
  }

  /** Last negative MOVSP in a compiler tail removes the incoming argument frame. */
  private inferParameterCleanupSlots(bodyBlocks: NWScriptBasicBlock[]): number {
    const positiveCandidates = new Set<number>();
    for (const block of bodyBlocks) {
      for (let index = 0; index < block.instructions.length; index += 1) {
        if (block.instructions[index].code !== OP_RETN) continue;
        let previousIndex = index - 1;
        while (
          previousIndex >= 0 &&
          (block.instructions[previousIndex].code === OP_NOP ||
            block.instructions[previousIndex].code === OP_RESTOREBP)
        ) {
          previousIndex -= 1;
        }
        const previous = previousIndex >= 0 ? block.instructions[previousIndex] : null;
        if (previous?.code !== OP_MOVSP || previous.offset === undefined) continue;
        const signed = previous.offset > 0x7fffffff
          ? previous.offset - 0x100000000
          : previous.offset;
        if (signed < 0 && signed % 4 === 0) {
          positiveCandidates.add(Math.abs(signed) / 4);
        }
      }
    }

    // STORE_STATE payloads and compiler-generated helper islands can contribute a bare RETN to
    // a conservatively collected function body. Such a terminal has no ABI cleanup information;
    // it must not cancel the real shared epilogue's MOVSP. Conflicting positive widths remain
    // ambiguous and deliberately fall back to caller/body inference.
    return positiveCandidates.size === 1 ? Array.from(positiveCandidates)[0] : 0;
  }

  /** Build a canonical first-formal-first ABI layout from every direct caller. */
  private inferParameterLayoutFromCallSites(
    entryAddress: number,
    totalSlots: number
  ): NWScriptFunctionParameter[] | null {
    let consensus: InferredJsrArgument[] | null = null;
    let provenCallCount = 0;

    for (const instruction of this.cfg.script.instructions.values()) {
      if (
        instruction.code !== OP_JSR ||
        instruction.offset === undefined ||
        instruction.address + toSignedInt32(instruction.offset) !== entryAddress
      ) {
        continue;
      }
      const inferred = inferJsrArgumentTypesByTotalSlots(instruction, totalSlots);
      // A caller may compute an argument through another JSR, which makes a local backwards
      // expression walk intentionally stop. Other direct callers still carry valid ABI evidence.
      if (!inferred) continue;
      provenCallCount += 1;
      if (!consensus) {
        consensus = inferred;
        continue;
      }
      if (consensus.length !== inferred.length) return null;
      for (let index = 0; index < consensus.length; index += 1) {
        const observed = inferred[index];
        if (consensus[index].stackSlots !== observed.stackSlots) return null;
        if (observed.dataType === null) continue;
        if (
          consensus[index].dataType !== null &&
          consensus[index].dataType !== observed.dataType
        ) return null;
        consensus[index] = observed;
      }
    }

    if (provenCallCount === 0 || !consensus) return null;

    let bytesFromTop = 0;
    return consensus.map((observed, index) => {
      const dataType = observed.dataType ??
        (observed.stackSlots > 1
          ? NWScriptDataType.STRUCTURE
          : NWScriptDataType.INTEGER);
      bytesFromTop += observed.stackSlots * 4;
      return {
        name: `${this.getTypePrefix(dataType)}Param${index + 1}`,
        dataType,
        offset: -bytesFromTop,
        stackSlots: observed.stackSlots,
        structureFieldTypes: dataType === NWScriptDataType.STRUCTURE
          ? new Array<NWScriptDataType>(observed.stackSlots).fill(NWScriptDataType.INTEGER)
          : undefined,
        resolvedViaSpOperand: true,
      };
    });
  }

  private refineParameterTypesFromCallSites(
    parameters: NWScriptFunctionParameter[],
    entryAddress: number
  ): NWScriptFunctionParameter[] {
    const sorted = [...parameters].sort((left, right) => right.offset - left.offset);
    const observations = sorted.map(() => new Set<NWScriptDataType>());

    for (const instruction of this.cfg.script.instructions.values()) {
      if (
        instruction.code !== OP_JSR ||
        instruction.offset === undefined ||
        instruction.address + toSignedInt32(instruction.offset) !== entryAddress
      ) {
        continue;
      }
      const inferred = inferJsrArgumentTypes(instruction, sorted);
      inferred?.forEach((dataType, index) => {
        if (dataType !== null) observations[index].add(dataType);
      });
    }

    return sorted.map((parameter, index) => {
      const observed = observations[index];
      const dataType = observed.size === 1
        ? Array.from(observed)[0]
        : parameter.dataType;
      return {
        ...parameter,
        dataType,
        name: `${this.getTypePrefix(dataType)}Param${index + 1}`,
      };
    });
  }

  /**
   * Refine scalar formals from typed consumers in the callee. CPTOPSP/CPTOPBP copy
   * opcodes carry only a width, so defaulting every four-byte value to int loses
   * object/string and engine-structure types when the caller expression is itself an
   * untyped frame copy. ACTION signatures and typed operators provide authoritative
   * constraints for those values.
   */
  private refineParameterTypesFromBody(
    parameters: NWScriptFunctionParameter[],
    entryBlock: NWScriptBasicBlock,
    bodyBlocks: NWScriptBasicBlock[]
  ): NWScriptFunctionParameter[] {
    if (parameters.length === 0) return parameters;

    type AbstractValue = {
      origins: Set<string>;
      declaredType?: NWScriptDataType;
    };
    const unknown = (declaredType?: NWScriptDataType): AbstractValue => ({
      origins: new Set<string>(),
      declaredType,
    });
    const parameterOffsets = new Set(parameters.map(parameter => parameter.offset));
    const parametersByOffset = new Map(
      parameters.map(parameter => [parameter.offset, parameter] as const)
    );
    const evidence = new Map<number, Set<NWScriptDataType>>();
    const structureEvidence = new Map<
      number,
      Map<number, Set<NWScriptDataType>>
    >();
    const bodySet = new Set(bodyBlocks);
    const originKey = (offset: number, field: number): string => `${offset}:${field}`;
    const parseOrigin = (origin: string): [number, number] => {
      const separator = origin.lastIndexOf(':');
      return [
        Number.parseInt(origin.slice(0, separator), 10),
        Number.parseInt(origin.slice(separator + 1), 10),
      ];
    };

    // Compute each block's stack depth relative to procedure entry. This turns a raw
    // SP operand into the stable formal-frame offset used by `parameters`.
    const entryDeltas = new Map<NWScriptBasicBlock, number | null>([[entryBlock, 0]]);
    const queue: NWScriptBasicBlock[] = [entryBlock];
    while (queue.length > 0) {
      const block = queue.shift()!;
      const knownEntry = entryDeltas.get(block);
      if (knownEntry === undefined || knownEntry === null) continue;
      let delta = knownEntry;
      let knownExit = true;
      for (const instruction of block.instructions) {
        const instructionDelta = this.parameterAnalysisStackDelta(instruction);
        if (instructionDelta === null) {
          knownExit = false;
          break;
        }
        delta += instructionDelta;
      }
      if (!knownExit) continue;
      for (const successor of this.cfg.getIntraProceduralSuccessors(block)) {
        if (!bodySet.has(successor)) continue;
        const existing = entryDeltas.get(successor);
        if (existing === undefined) {
          entryDeltas.set(successor, delta);
          queue.push(successor);
        } else if (existing !== null && existing !== delta) {
          entryDeltas.set(successor, null);
        }
      }
    }

    const record = (value: AbstractValue, dataType: NWScriptDataType): void => {
      if (dataType === NWScriptDataType.VOID || dataType === NWScriptDataType.ACTION) return;
      for (const origin of value.origins) {
        const [offset, field] = parseOrigin(origin);
        if (!parameterOffsets.has(offset)) continue;
        const parameter = parametersByOffset.get(offset);
        if (parameter?.dataType === NWScriptDataType.STRUCTURE) {
          if (dataType === NWScriptDataType.STRUCTURE) continue;
          const byField = structureEvidence.get(offset) ?? new Map();
          const observed = byField.get(field) ?? new Set<NWScriptDataType>();
          observed.add(dataType);
          byField.set(field, observed);
          structureEvidence.set(offset, byField);
          continue;
        }
        const observed = evidence.get(offset) ?? new Set<NWScriptDataType>();
        observed.add(dataType);
        evidence.set(offset, observed);
      }
    };

    for (const block of bodyBlocks) {
      const entryDelta = entryDeltas.get(block);
      if (entryDelta === undefined || entryDelta === null || entryDelta < 0) continue;

      // One array element represents one physical dword. Multi-slot values repeat the
      // same provenance object so copies and consumers can operate by bytecode width.
      const stack: AbstractValue[] = Array.from({ length: entryDelta }, unknown);
      const push = (value: AbstractValue, slots: number): void => {
        for (let slot = 0; slot < slots; slot += 1) stack.push(value);
      };
      const pop = (slots: number): AbstractValue => {
        const origins = new Set<string>();
        for (let slot = 0; slot < slots && stack.length > 0; slot += 1) {
          for (const origin of stack.pop()!.origins) origins.add(origin);
        }
        return { origins };
      };
      const consume = (
        dataType: NWScriptDataType,
        slots = stackSlotsForDataType(dataType)
      ): AbstractValue => {
        const value = pop(slots);
        record(value, dataType);
        return value;
      };

      for (const instruction of block.instructions) {
        if (instruction.code === OP_CPTOPSP || instruction.code === OP_CPTOPBP) {
          let slots: number;
          try {
            slots = stackSlotsForByteSize(instruction.size ?? 4, instruction.codeName || 'CPTOP');
          } catch {
            break;
          }
          const signed = toSignedInt32(instruction.offset);
          const frameOffset = instruction.code === OP_CPTOPSP
            ? signed + stack.length * 4
            : signed;
          const parameter = parametersByOffset.get(frameOffset);
          if (parameter) {
            for (let field = 0; field < slots; field += 1) {
              stack.push({ origins: new Set([originKey(frameOffset, field)]) });
            }
          } else if (
            instruction.code === OP_CPTOPSP &&
            frameOffset >= 0 &&
            frameOffset % 4 === 0 &&
            frameOffset / 4 + slots <= stack.length
          ) {
            for (const value of stack.slice(frameOffset / 4, frameOffset / 4 + slots)) {
              stack.push({
                origins: new Set(value.origins),
                declaredType: value.declaredType,
              });
            }
          } else {
            push(unknown(), slots);
          }
          continue;
        }

        if (instruction.code === OP_CONST || instruction.code === OP_RSADD) {
          const dataType = getUnaryDataType(instruction.type);
          push(
            unknown(instruction.code === OP_RSADD ? dataType ?? undefined : undefined),
            Math.max(1, stackSlotsForDataType(dataType ?? undefined))
          );
          continue;
        }

        if (instruction.code === OP_ACTION) {
          const definition = instruction.actionDefinition;
          const inferred = inferActionReturnFromStoreCleanup(instruction);
          if (definition) {
            const argCount = Math.min(instruction.argCount ?? 0, definition.args.length);
            for (let index = 0; index < argCount; index += 1) {
              consume(definition.args[index]);
            }
            push(
              unknown(),
              inferred?.stackSlots ?? stackSlotsForDataType(definition.type)
            );
          } else {
            const argCount = instruction.argCount ?? 0;
            for (let index = 0; index < argCount; index += 1) {
              consume(NWScriptDataType.INTEGER);
            }
            push(unknown(inferred?.dataType), inferred?.stackSlots ?? 0);
          }
          continue;
        }

        if (
          instruction.code === OP_ADD || instruction.code === OP_SUB ||
          instruction.code === OP_MUL || instruction.code === OP_DIV ||
          instruction.code === OP_MODII
        ) {
          const signature = getArithmeticTypeSignature(instruction.code, instruction.type);
          if (!signature) break;
          consume(signature.right);
          consume(signature.left);
          push(unknown(), stackSlotsForDataType(signature.result));
          continue;
        }

        if (
          instruction.code === OP_EQUAL || instruction.code === OP_NEQUAL ||
          instruction.code === OP_GEQ || instruction.code === OP_GT ||
          instruction.code === OP_LT || instruction.code === OP_LEQ
        ) {
          const signature = getComparisonTypeSignature(instruction.code, instruction.type);
          if (!signature) break;
          consume(signature.right);
          consume(signature.left);
          push(unknown(), 1);
          continue;
        }

        if (
          instruction.code === OP_LOGANDII || instruction.code === OP_LOGORII ||
          instruction.code === OP_BOOLANDII || instruction.code === OP_INCORII ||
          instruction.code === OP_EXCORII || instruction.code === OP_SHLEFTII ||
          instruction.code === OP_SHRIGHTII || instruction.code === OP_USHRIGHTII
        ) {
          consume(NWScriptDataType.INTEGER);
          consume(NWScriptDataType.INTEGER);
          push(unknown(), 1);
          continue;
        }

        if (instruction.code === OP_NEG || instruction.code === OP_COMPI || instruction.code === OP_NOTI) {
          const dataType = getUnaryDataType(instruction.type);
          if (dataType === null) break;
          consume(dataType);
          push(unknown(), stackSlotsForDataType(dataType));
          continue;
        }

        if (instruction.code === OP_JZ || instruction.code === OP_JNZ) {
          consume(NWScriptDataType.INTEGER);
          continue;
        }

        if (instruction.code === OP_MOVSP) {
          const signed = toSignedInt32(instruction.offset);
          let slots: number;
          try {
            slots = stackSlotsForByteSize(Math.abs(signed), 'MOVSP');
          } catch {
            break;
          }
          if (signed < 0) pop(slots);
          else push(unknown(), slots);
          continue;
        }

        if (instruction.code === OP_DESTRUCT) {
          let destroySlots: number;
          let saveOffsetSlots: number;
          let saveSlots: number;
          try {
            destroySlots = stackSlotsForByteSize(
              instruction.sizeToDestroy,
              'DESTRUCT destroy'
            );
            saveOffsetSlots = stackSlotsForByteSize(
              instruction.offsetToSaveElement,
              'DESTRUCT offset'
            );
            saveSlots = stackSlotsForByteSize(
              instruction.sizeOfElementToSave,
              'DESTRUCT saved value'
            );
          } catch {
            break;
          }
          if (
            destroySlots > stack.length ||
            saveOffsetSlots + saveSlots > destroySlots
          ) break;
          const regionStart = stack.length - destroySlots;
          const saved = stack.slice(
            regionStart + saveOffsetSlots,
            regionStart + saveOffsetSlots + saveSlots
          );
          stack.splice(regionStart, destroySlots, ...saved);
          continue;
        }

        if (instruction.code === OP_CPDOWNSP || instruction.code === OP_CPDOWNBP) {
          let slots: number;
          try {
            slots = stackSlotsForByteSize(
              instruction.size ?? 4,
              instruction.codeName || 'CPDOWN'
            );
          } catch {
            break;
          }
          if (slots > stack.length) break;
          const source = stack.slice(stack.length - slots);

          if (instruction.code === OP_CPDOWNSP) {
            const signed = toSignedInt32(instruction.offset);
            if (signed % 4 !== 0) break;
            const targetIndex = stack.length + signed / 4;
            if (targetIndex >= 0 && targetIndex + slots <= stack.length) {
              for (let field = 0; field < slots; field += 1) {
                const target = stack[targetIndex + field];
                if (target.declaredType !== undefined) {
                  record(source[field], target.declaredType);
                }
                target.origins = new Set(source[field].origins);
              }
            }
          } else {
            const startOffset = toSignedInt32(instruction.offset);
            for (let field = 0; field < slots; field += 1) {
              const global = this.globalInits.find(
                init => toSignedInt32(init.offset) === startOffset + field * 4
              );
              if (global) record(source[field], global.dataType);
            }
          }
          continue;
        }

        if (instruction.code === OP_JSR) {
          const target = instruction.offset === undefined
            ? undefined
            : this.functions.get(
                instruction.address + toSignedInt32(instruction.offset)
              );
          if (!target) break;
          for (const parameter of target.parameters) {
            consume(
              parameter.dataType,
              parameter.stackSlots ?? stackSlotsForDataType(parameter.dataType)
            );
          }
          continue;
        }

        const delta = this.parameterAnalysisStackDelta(instruction);
        if (delta === null) break;
        if (delta < 0) pop(-delta);
        else if (delta > 0) push(unknown(), delta);
      }
    }

    return parameters.map((parameter, index) => {
      const observed = evidence.get(parameter.offset);
      const dataType = observed?.size === 1 ? Array.from(observed)[0] : parameter.dataType;
      const fieldEvidence = structureEvidence.get(parameter.offset);
      const structureFieldTypes = dataType === NWScriptDataType.STRUCTURE
        ? Array.from(
            { length: parameter.stackSlots ?? parameter.structureFieldTypes?.length ?? 1 },
            (_, field) => {
              const types = fieldEvidence?.get(field);
              return types?.size === 1
                ? Array.from(types)[0]
                : parameter.structureFieldTypes?.[field] ?? NWScriptDataType.INTEGER;
            }
          )
        : undefined;
      return {
        ...parameter,
        dataType,
        structureFieldTypes,
        name: `${this.getTypePrefix(dataType)}Param${index + 1}`,
      };
    });
  }

  /**
   * Propagate formal types through user-function calls after every direct JSR target has an
   * initial signature. NCS scalar frame copies are untyped, so a wrapper that only forwards an
   * object/string/engine value cannot be typed correctly in a single address-order pass.
   */
  private refineFunctionParameterTypesFixedPoint(): void {
    const functions = Array.from(this.functions.values());
    const maxPasses = Math.max(1, functions.length);
    for (let pass = 0; pass < maxPasses; pass += 1) {
      let changed = false;
      for (const func of functions) {
        if (func.parameters.length === 0) continue;
        const refined = this.refineParameterTypesFromBody(
          this.refineParameterTypesFromCallSites(
            func.parameters,
            func.entryBlock.startInstruction.address
          ),
          func.entryBlock,
          func.bodyBlocks
        );
        if (refined.some((parameter, index) =>
          parameter.dataType !== func.parameters[index]?.dataType ||
          JSON.stringify(parameter.structureFieldTypes ?? []) !==
            JSON.stringify(func.parameters[index]?.structureFieldTypes ?? [])
        )) {
          func.parameters = refined;
          if (!func.isMain) {
            func.returnType = this.analyzeReturnType(
              func.entryBlock.startInstruction.address,
              func.bodyBlocks,
              func.parameters
            );
            func.returnStructureFieldTypes = this.returnStructureFieldsByEntry.get(
              func.entryBlock.startInstruction.address
            );
            func.returnStackSlots = func.returnStructureFieldTypes?.length;
          }
          changed = true;
        }
      }
      if (!changed) break;
    }
  }

  private parameterAnalysisStackDelta(instruction: NWScriptInstruction): number | null {
    if (instruction.code !== OP_JSR || instruction.offset === undefined) {
      return instructionForwardStackSlotDelta(instruction);
    }
    const callee = this.functions.get(
      instruction.address + toSignedInt32(instruction.offset)
    );
    return callee
      ? -(nwscriptParametersTotalBytes(callee.parameters) / 4)
      : null;
  }

  /**
   * CPTOPSP-operand inference can pick up locals/temps (e.g. -8) ahead of the real lone int param (-4).
   * When call sites push {@code minSlots} words, keep operands closest to zero and preserve
   * first-formal-first (least-negative-first) ordering.
   */
  private narrowCptopspParamsToCallArity(
    params: NWScriptFunctionParameter[],
    minSlots: number
  ): NWScriptFunctionParameter[] {
    const bpParams = params.filter((p) => !p.resolvedViaSpOperand);
    const spParams = params.filter((p) => p.resolvedViaSpOperand);
    const bpSlots = this.parameterStackSlots(bpParams);
    const availableSpSlots = Math.max(0, minSlots - bpSlots);
    if (availableSpSlots < 1 || this.parameterStackSlots(spParams) <= availableSpSlots) {
      return params;
    }
    const nearestFirst = [...spParams].sort((a, b) => b.offset - a.offset);
    const picked: NWScriptFunctionParameter[] = [];
    let pickedSlots = 0;
    for (const parameter of nearestFirst) {
      const width = nwscriptParametersTotalBytes([parameter]) / 4;
      if (pickedSlots + width > availableSpSlots) continue;
      picked.push(parameter);
      pickedSlots += width;
      if (pickedSlots === availableSpSlots) break;
    }
    picked.sort((a, b) => b.offset - a.offset);
    const renumbered = picked.map((p, i) => {
      const typePrefix = this.getTypePrefix(p.dataType);
      return {
        ...p,
        name: `${typePrefix}Param${i + 1}`,
      };
    });
    return [...bpParams, ...renumbered].sort((a, b) => b.offset - a.offset);
  }

  private parameterStackSlots(parameters: NWScriptFunctionParameter[]): number {
    return nwscriptParametersTotalBytes(parameters) / 4;
  }

  /**
   * Infer SP-based formals using frame-relative positions, not raw CPTOPSP operands. Raw operands
   * change as temporaries are pushed, so two different parameters can legitimately use the same
   * encoded offset. Positions at or above entry SP are locals/temporaries and are excluded.
   */
  private inferParametersFromCptopspOperands(
    entryBlock: NWScriptBasicBlock,
    bodyBlocks: NWScriptBasicBlock[]
  ): NWScriptFunctionParameter[] {
    const tally = new Map<
      number,
      { dataType: NWScriptDataType; count: number; stackSlots: number }
    >();
    const bodySet = new Set(bodyBlocks);
    const entryDeltas = new Map<NWScriptBasicBlock, number | null>([[entryBlock, 0]]);
    const queue: NWScriptBasicBlock[] = [entryBlock];

    while (queue.length > 0) {
      const block = queue.shift()!;
      const entryDelta = entryDeltas.get(block);
      if (entryDelta === undefined || entryDelta === null) continue;
      let deltaSlots = entryDelta;
      let exitKnown = true;

      for (const instruction of block.instructions) {
        if (instruction.code === OP_CPTOPSP && instruction.offset !== undefined) {
          const signed = instruction.offset > 0x7fffffff
            ? instruction.offset - 0x100000000
            : instruction.offset;
          const frameOffset = signed + deltaSlots * 4;
          if (frameOffset < 0) {
            const stackSlots = stackSlotsForByteSize(
              instruction.size ?? 4,
              instruction.codeName || 'CPTOPSP'
            );
            const dataType = stackSlots === 3
              ? NWScriptDataType.VECTOR
              : stackSlots > 1
                ? NWScriptDataType.STRUCTURE
                : NWScriptDataType.INTEGER;

            const existing = tally.get(frameOffset);
            if (existing) {
              existing.count += 1;
              if (dataType !== NWScriptDataType.INTEGER && existing.dataType === NWScriptDataType.INTEGER) {
                existing.dataType = dataType;
              }
              existing.stackSlots = Math.max(existing.stackSlots, stackSlots);
            } else {
              tally.set(frameOffset, { dataType, count: 1, stackSlots });
            }
          }
        }

        const instructionDelta = instructionForwardStackSlotDelta(instruction);
        if (instructionDelta === null) {
          exitKnown = false;
          break;
        }
        deltaSlots += instructionDelta;
      }

      if (!exitKnown) continue;
      for (const successor of this.cfg.getIntraProceduralSuccessors(block)) {
        if (!bodySet.has(successor)) continue;
        const known = entryDeltas.get(successor);
        if (known === undefined) {
          entryDeltas.set(successor, deltaSlots);
          queue.push(successor);
        } else if (known !== null && known !== deltaSlots) {
          // Conflicting depths mean this region is malformed or outside what static inference can prove.
          entryDeltas.set(successor, null);
          queue.push(successor);
        }
      }
    }

    if (tally.size === 0) {
      return [];
    }

    const sortedOffsets = [...tally.keys()].sort((a, b) => b - a);
    return sortedOffsets.map((off, i) => {
      const info = tally.get(off)!;
      const typePrefix = this.getTypePrefix(info.dataType);
      return {
        name: `${typePrefix}Param${i + 1}`,
        dataType: info.dataType,
        offset: off,
        stackSlots: info.stackSlots,
        structureFieldTypes: info.dataType === NWScriptDataType.STRUCTURE
          ? new Array<NWScriptDataType>(info.stackSlots).fill(NWScriptDataType.INTEGER)
          : undefined,
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
      case NWScriptDataType.VECTOR: return 'vector';
      case NWScriptDataType.EFFECT: return 'effect';
      case NWScriptDataType.EVENT: return 'event';
      case NWScriptDataType.LOCATION: return 'location';
      case NWScriptDataType.TALENT: return 'talent';
      case NWScriptDataType.STRUCTURE: return 'struct';
      default: return 'int';
    }
  }

  /** Infer a user routine return only when callee writes and every caller reservation agree. */
  private analyzeReturnType(
    entryAddress: number,
    bodyBlocks: NWScriptBasicBlock[],
    parameters: NWScriptFunctionParameter[]
  ): NWScriptDataType {
    const returnBytes = this.inferReturnWriteBytes(bodyBlocks);
    if (returnBytes === null) return NWScriptDataType.VOID;
    const parameterSlots = nwscriptParametersTotalBytes(parameters) / 4;
    const callerAbi = inferSubroutineCallAbiFromCallSites(
      this.cfg.script,
      entryAddress,
      returnBytes
    );
    if (callerAbi?.parameterSlots === parameterSlots) {
      if (
        callerAbi.returnType === NWScriptDataType.STRUCTURE &&
        callerAbi.returnStructureFieldTypes
      ) {
        this.returnStructureFieldsByEntry.set(
          entryAddress,
          callerAbi.returnStructureFieldTypes
        );
      } else {
        this.returnStructureFieldsByEntry.delete(entryAddress);
      }
      return callerAbi.returnType;
    }
    const returnType = inferSubroutineReturnTypeFromCallSites(
      this.cfg.script,
      entryAddress,
      parameterSlots,
      returnBytes
    );
    this.returnStructureFieldsByEntry.delete(entryAddress);
    return returnType;
  }

  private inferReturnWriteBytes(bodyBlocks: NWScriptBasicBlock[]): number | null {
    const returnWriteSizes = new Set<number>();
    for (const block of bodyBlocks) {
      for (let index = 0; index < block.instructions.length; index += 1) {
        const instruction = block.instructions[index];
        if (
          instruction.code === OP_CPDOWNSP &&
          this.isLikelyReturnWrite(block, index)
        ) {
          returnWriteSizes.add(instruction.size ?? 4);
        }
      }
    }
    return returnWriteSizes.size === 1 ? Array.from(returnWriteSizes)[0] : null;
  }

  private isLikelyReturnWrite(block: NWScriptBasicBlock, cpdownspIndex: number): boolean {
    for (let index = cpdownspIndex + 1; index < block.instructions.length; index += 1) {
      const instruction = block.instructions[index];
      if (
        instruction.code === OP_MOVSP ||
        instruction.code === OP_RESTOREBP ||
        instruction.code === OP_NOP
      ) {
        continue;
      }
      return instruction.code === OP_JMP || instruction.code === OP_RETN;
    }
    return false;
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
