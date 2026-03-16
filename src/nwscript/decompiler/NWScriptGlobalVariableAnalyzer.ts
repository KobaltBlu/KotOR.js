import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import { EdgeType } from '@/nwscript/decompiler/NWScriptEdge';
import type { NWScript } from "@/nwscript/NWScript";
import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { OP_RSADD, OP_CONST, OP_CPDOWNSP, OP_CPDOWNBP, OP_MOVSP, OP_NEG, OP_ACTION, OP_SAVEBP, OP_JSR, OP_RESTOREBP, OP_RETN } from '@/nwscript/NWScriptOPCodes';

/**
 * Represents a detected global variable initialization
 */
export interface NWScriptGlobalInit {
  offset: number; // BP offset for the global variable
  dataType: NWScriptDataType;
  initialValue: any;
  hasInitializer: boolean; // Whether this variable has an explicit initializer
  instructionAddress: number; // Address of the RSADD instruction
}

/**
 * Analyzes global variable initializations from the instruction stream.
 * Detects the pattern: RSADD -> CONST -> CPDOWNSP -> MOVSP
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file NWScriptGlobalVariableAnalyzer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptGlobalVariableAnalyzer {
  private script: NWScript;
  private cfg: NWScriptControlFlowGraph | null = null;
  private globalInits: NWScriptGlobalInit[] = [];
  private processedAddresses: Set<number> = new Set();

  constructor(script: NWScript, cfg?: NWScriptControlFlowGraph) {
    this.script = script;
    this.cfg = cfg || null;
  }

  /**
   * Analyze and detect all global variable initializations
   * If CFG is provided, only analyzes blocks within the global initialization function
   */
  analyze(): NWScriptGlobalInit[] {
    this.globalInits = [];
    this.processedAddresses.clear();

    if (!this.script.instructions) {
      return [];
    }

    // If CFG is available, identify and analyze only the global initialization block
    let globalInitBlocks: NWScriptBasicBlock[] = [];
    let savebpAddress: number | null = null;
    if (this.cfg) {
      const result = this.identifyGlobalInitBlocks();
      globalInitBlocks = result.blocks;
      savebpAddress = result.savebpAddress;
    }

    // CRITICAL FIX: If there's no SAVEBP pattern, there are NO global variables
    // Variables in the first JSR block are only globals if that block contains SAVEBP
    // before JSRing to the real void main or int StartingConditional
    if (this.cfg && globalInitBlocks.length === 0) {
      // No global init function found - return empty (no globals)
      return [];
    }

    // Get instructions to analyze
    let instructionsToAnalyze: NWScriptInstruction[] = [];

    if (globalInitBlocks.length > 0) {
      // Only analyze instructions within the global init blocks
      // AND before SAVEBP address (if SAVEBP exists)
      // CRITICAL: Include instructions from blocks that contain SAVEBP, but only those before SAVEBP
      for (const block of globalInitBlocks) {
        for (const instr of block.instructions) {
          // Only include instructions before SAVEBP
          // This allows us to include RSADD -> CONST -> CPDOWNSP -> MOVSP patterns
          // that are in the same block as SAVEBP
          if (!savebpAddress || instr.address < savebpAddress) {
            instructionsToAnalyze.push(instr);
          }
        }
      }
    } else {
      // No CFG available - fallback to analyzing all instructions (old behavior)
      // This should rarely happen in practice
      instructionsToAnalyze = Array.from(this.script.instructions.values());
    }

    // Sort instructions by address
    const sortedInstructions = instructionsToAnalyze.sort((a, b) => a.address - b.address);

    // Track all RSADD instructions to find uninitialized ones later
    const allRSADD: NWScriptInstruction[] = [];

    // First pass: Look for initialization patterns by following instruction chains
    for (const rsadd of sortedInstructions) {
      if (rsadd.code !== OP_RSADD) continue;
      allRSADD.push(rsadd);

      if (this.processedAddresses.has(rsadd.address)) continue;

      // Follow the instruction chain to find the pattern
      let current = rsadd.nextInstr;
      if (!current) continue;

      // Find CONST
      while (current && current.code !== OP_CONST && current.address < rsadd.address + 50) {
        current = current.nextInstr;
      }
      if (!current || current.code !== OP_CONST) continue;
      const constInstr = current;

      // Check for NEG after CONST
      let hasNeg = false;
      if (constInstr.nextInstr && constInstr.nextInstr.code === OP_NEG) {
        hasNeg = true;
        current = constInstr.nextInstr.nextInstr;
      } else {
        current = constInstr.nextInstr;
      }

      // CRITICAL FIX: Skip if there's an ACTION call between CONST and CPDOWNSP
      // This indicates a function call (e.g., GetGlobalNumber), not a constant initialization
      let hasAction = false;
      let searchCurrent = current;
      while (searchCurrent && searchCurrent.code !== OP_CPDOWNSP && searchCurrent.address < constInstr.address + 50) {
        if (searchCurrent.code === OP_ACTION) {
          hasAction = true;
          break;
        }
        searchCurrent = searchCurrent.nextInstr;
      }

      // If we found an ACTION call, this is NOT a global variable initialization
      // It's a function call that should be in the function body
      if (hasAction) {
        continue;
      }

      // Find CPDOWNSP
      while (current && current.code !== OP_CPDOWNSP && current.address < constInstr.address + 30) {
        current = current.nextInstr;
      }
      if (!current || current.code !== OP_CPDOWNSP) continue;
      const cpdownsp = current;

      // Check CPDOWNSP parameters
      // CPDOWNSP FFFFFFF8 means offset -8 (writing to the space reserved by RSADD)
      // The offset is a signed 32-bit integer (e.g. -8)
      const cpdownspOffset = cpdownsp.offset;
      const cpdownspOffsetSigned = cpdownspOffset > 0x7FFFFFFF ? cpdownspOffset - 0x100000000 : cpdownspOffset;
      if (cpdownspOffsetSigned !== -8 || cpdownsp.size !== 4) continue;

      // Find MOVSP
      current = cpdownsp.nextInstr;
      while (current && current.code !== OP_MOVSP && current.address < cpdownsp.address + 20) {
        current = current.nextInstr;
      }
      if (!current || current.code !== OP_MOVSP) continue;
      const movsp = current;

      // Check MOVSP offset
      // MOVSP FFFFFFFC means offset -4 (cleaning up the stack)
      const movspOffset = movsp.offset;
      const movspOffsetSigned = movspOffset > 0x7FFFFFFF ? movspOffset - 0x100000000 : movspOffset;
      if (movspOffsetSigned !== -4) continue;

      // Extract initialization
      const init = this.extractInitialization(rsadd, constInstr, cpdownsp, hasNeg);
      if (init) {
        this.globalInits.push(init);
        // Mark all instructions as processed
        this.processedAddresses.add(rsadd.address);
        this.processedAddresses.add(constInstr.address);
        if (hasNeg && constInstr.nextInstr) {
          this.processedAddresses.add(constInstr.nextInstr.address);
        }
        this.processedAddresses.add(cpdownsp.address);
        this.processedAddresses.add(movsp.address);
      }
    }

    // Second pass: Find uninitialized globals (RSADD without initialization pattern)
    // Only consider writes that are part of a complete initialization pattern
    for (const rsadd of allRSADD) {
      if (this.processedAddresses.has(rsadd.address)) continue;

      // Check if there's a complete initialization pattern for this RSADD
      // Pattern: RSADD -> CONST -> [NEG] -> CPDOWNSP -> MOVSP
      // We search within a very limited window and verify the complete pattern
      let hasInitialization = false;
      let current = rsadd.nextInstr;

      // Very limited search window - initialization patterns are immediate
      // Stop immediately if we hit another RSADD (new variable declaration)
      const maxSearchDistance = 20; // Only search within immediate initialization context
      let searchLimit = 0;

      while (current && searchLimit < maxSearchDistance) {
        // Stop if we hit another RSADD - that's a new variable, not initialization of this one
        if (current.code === OP_RSADD && current.address !== rsadd.address) {
          break;
        }

        // Look for the initialization pattern: CONST -> [NEG] -> CPDOWNSP -> MOVSP
        if (current.code === OP_CONST) {
          const constInstr = current;

          // Check for NEG after CONST
          let hasNeg = false;
          let nextAfterConst = constInstr.nextInstr;
          if (nextAfterConst && nextAfterConst.code === OP_NEG) {
            hasNeg = true;
            nextAfterConst = nextAfterConst.nextInstr;
          }

          // CRITICAL FIX: Skip if there's an ACTION call between CONST and CPDOWNSP
          // This indicates a function call, not a constant initialization
          let hasAction = false;
          let actionCheck = nextAfterConst;
          while (actionCheck && actionCheck.code !== OP_CPDOWNSP && actionCheck.code !== OP_CPDOWNBP && actionCheck.address < constInstr.address + 50) {
            if (actionCheck.code === OP_ACTION) {
              hasAction = true;
              break;
            }
            actionCheck = actionCheck.nextInstr;
          }

          if (hasAction) {
            // This is a function call pattern, not a global initialization
            current = current.nextInstr;
            continue;
          }

          // Look for CPDOWNSP after CONST (or NEG)
          let cpdownspInstr = nextAfterConst;
          let cpdownspSearchLimit = 0;
          while (cpdownspInstr && cpdownspSearchLimit < 10) {
            if (cpdownspInstr.code === OP_CPDOWNSP || cpdownspInstr.code === OP_CPDOWNBP) {
              const offset = cpdownspInstr.offset;
              const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;

              // CPDOWNSP -8 writes to the space reserved by the most recent RSADD
              // But we need to verify this is actually for our RSADD
              // The pattern should be: RSADD -> CONST -> CPDOWNSP -8 -> MOVSP -4
              if (offsetSigned === -8 && cpdownspInstr.size === 4) {
                // Check for MOVSP -4 after CPDOWNSP
                let movspInstr = cpdownspInstr.nextInstr;
                let movspSearchLimit = 0;
                while (movspInstr && movspSearchLimit < 10) {
                  if (movspInstr.code === OP_MOVSP && movspInstr.offset !== undefined) {
                    const movspOffset = movspInstr.offset;
                    const movspOffsetSigned = movspOffset > 0x7FFFFFFF ? movspOffset - 0x100000000 : movspOffset;

                    // MOVSP -4 after CPDOWNSP completes the initialization pattern
                    if (movspOffsetSigned === -4) {
                      // Verify this pattern is for our RSADD by checking the sequence
                      // The instructions should be sequential: RSADD -> CONST -> CPDOWNSP -> MOVSP
                      if (constInstr.address > rsadd.address &&
                          cpdownspInstr.address > constInstr.address &&
                          movspInstr.address > cpdownspInstr.address) {
                        hasInitialization = true;
                        break;
                      }
                    }
                  }
                  movspInstr = movspInstr.nextInstr;
                  movspSearchLimit++;
                }

                if (hasInitialization) {
                  break;
                }
              }
            }

            // Stop if we hit another RSADD or CONST (different pattern)
            if (cpdownspInstr.code === OP_RSADD || cpdownspInstr.code === OP_CONST) {
              break;
            }

            cpdownspInstr = cpdownspInstr.nextInstr;
            cpdownspSearchLimit++;
          }

          if (hasInitialization) {
            break;
          }
        }

        current = current.nextInstr;
        searchLimit++;
      }

      // If no initialization pattern found, this is an uninitialized global
      if (!hasInitialization) {
        // Determine data type from RSADD type
        let dataType: NWScriptDataType;
        switch (rsadd.type) {
          case 3: dataType = NWScriptDataType.INTEGER; break;
          case 4: dataType = NWScriptDataType.FLOAT; break;
          case 5: dataType = NWScriptDataType.STRING; break;
          case 6: dataType = NWScriptDataType.OBJECT; break;
          default: continue; // Skip unknown types
        }

        // Calculate global variable BP offset (will be recalculated after all globals are found)
        // For now, use a placeholder - we'll fix it in a second pass
        const offset = 0; // Placeholder, will be recalculated

        this.globalInits.push({
          offset: offset,
          dataType: dataType,
          initialValue: undefined,
          hasInitializer: false,
          instructionAddress: rsadd.address
        });

        // Mark RSADD as processed
        this.processedAddresses.add(rsadd.address);
      }
    }

    // CRITICAL FIX: Recalculate BP offsets now that we know the total count
    // After SAVEBP, BP points to the "top" of globals (just after the last global)
    // Global 0 (first) is at BP - (N*4), Global 1 is at BP - ((N-1)*4), etc.
    // Global i is at BP - ((N-i)*4) where N = total globals
    const totalGlobals = this.globalInits.length;
    for (let i = 0; i < this.globalInits.length; i++) {
      const globalIndex = i;
      const offset = -4 * (totalGlobals - globalIndex);
      this.globalInits[i].offset = offset;
    }

    return this.globalInits;
  }

  /**
   * Check if a sequence of instructions matches the initialization pattern
   */
  private isInitializationPattern(
    rsadd: NWScriptInstruction,
    constInstr: NWScriptInstruction,
    cpdownsp: NWScriptInstruction,
    movsp: NWScriptInstruction
  ): boolean {
    // Check RSADD
    if (rsadd.code !== OP_RSADD) return false;
    if (this.processedAddresses.has(rsadd.address)) return false;

    // Check CONST
    if (constInstr.code !== OP_CONST) return false;
    if (constInstr.address <= rsadd.address) return false;

    // Check CPDOWNSP with offset FFFFFFF8 (which is -8, writing to the reserved space)
    if (cpdownsp.code !== OP_CPDOWNSP) return false;
    if (cpdownsp.offset !== -8 || cpdownsp.size !== 4) return false;
    if (cpdownsp.address <= constInstr.address) return false;

    // Check MOVSP with offset FFFFFFFC (which is -4, cleaning up the stack)
    if (movsp.code !== OP_MOVSP) return false;
    if (movsp.offset !== -4) return false;
    if (movsp.address <= cpdownsp.address) return false;

    return true;
  }

  /**
   * Extract initialization information from the pattern
   */
  private extractInitialization(
    rsadd: NWScriptInstruction,
    constInstr: NWScriptInstruction,
    cpdownsp: NWScriptInstruction,
    hasNeg: boolean = false
  ): NWScriptGlobalInit | null {
    // Determine data type from RSADD type
    let dataType: NWScriptDataType;
    switch (rsadd.type) {
      case 3: dataType = NWScriptDataType.INTEGER; break;
      case 4: dataType = NWScriptDataType.FLOAT; break;
      case 5: dataType = NWScriptDataType.STRING; break;
      case 6: dataType = NWScriptDataType.OBJECT; break;
      default: return null;
    }

    // Extract value from CONST instruction
    let initialValue: any;
    let hasInitializer = true;
    
    switch (constInstr.type) {
      case 3: // INTEGER
        initialValue = constInstr.integer;
        // Integer values are always valid initializers (including 0 and 1)
        // The presence of CPDOWNSP writing to the reserved space indicates initialization
        break;
      case 4: // FLOAT
        initialValue = constInstr.float;
        // Float values are always valid initializers (including 0.0)
        break;
      case 5: // STRING
        initialValue = constInstr.string;
        // Empty string is a valid initializer
        break;
      case 6: // OBJECT
        initialValue = constInstr.object;
        // Object value 0 means OBJECT_INVALID, which typically means no initializer
        // Also, value 1 might be a default/placeholder that shouldn't be treated as initializer
        if (initialValue === 0 || initialValue === undefined || initialValue === 1) {
          hasInitializer = false;
          initialValue = undefined;
        }
        break;
      default:
        return null;
    }

    // Apply negation if NEG instruction was present
    if (hasNeg) {
      if (dataType === NWScriptDataType.INTEGER || dataType === NWScriptDataType.FLOAT) {
        initialValue = -initialValue;
      }
    }

    // For objects, if the value is 0, 1, or undefined after processing, treat as no initializer
    // Value 1 for objects is often OBJECT_INVALID or a placeholder
    if (dataType === NWScriptDataType.OBJECT && (initialValue === 0 || initialValue === 1 || initialValue === undefined)) {
      hasInitializer = false;
      initialValue = undefined;
    }

        // Calculate global variable BP offset (will be recalculated after all globals are found)
        // For now, use a placeholder - we'll fix it in a second pass
        const offset = 0; // Placeholder, will be recalculated

    return {
      offset: offset,
      dataType: dataType,
      initialValue: initialValue,
      hasInitializer: hasInitializer,
      instructionAddress: rsadd.address
    };
  }

  /**
   * Get all detected global variable initializations
   */
  getGlobalInits(): NWScriptGlobalInit[] {
    return this.globalInits;
  }

  /**
   * Check if an instruction address is part of an initialization sequence
   */
  isInitializationInstruction(address: number): boolean {
    return this.processedAddresses.has(address);
  }

  /**
   * Get the initialization for a specific offset
   */
  getInitForOffset(offset: number): NWScriptGlobalInit | null {
    return this.globalInits.find(init => init.offset === offset) || null;
  }

  /**
   * Identify the global initialization blocks using CFG
   * CRITICAL: SAVEBP is NOT in the entry block. It's inside the first JSR target function,
   * near the end, before JSRing to the real main/StartingConditional.
   *
   * Pattern:
   * - Entry: JSR(first_function) -> RETN
   * - First function: [globals] ... SAVEBP -> JSR(main) -> RESTOREBP -> MOVSP -> RETN
   *
   * Returns blocks from the first JSR target up to (but not including) SAVEBP
   */
  private identifyGlobalInitBlocks(): { blocks: NWScriptBasicBlock[], savebpAddress: number | null } {
    if (!this.cfg || !this.cfg.entryBlock) {
      return { blocks: [], savebpAddress: null };
    }

    const entryBlock = this.cfg.entryBlock;

    // Get the first JSR from entry block
    let firstJSR: NWScriptInstruction | null = null;
    let current = entryBlock.startInstruction;
    while (current && current.address <= entryBlock.endInstruction.address) {
      if (current.code === OP_JSR && current.offset !== undefined) {
        firstJSR = current;
        break;
      }
      current = current.nextInstr;
    }
    
    if (!firstJSR) {
      // No JSR in entry block - no globals
      return { blocks: [], savebpAddress: null };
    }
    
    // Get the first JSR target address
    const firstJSRTarget = firstJSR.address + firstJSR.offset;
    const firstJSRBlock = this.cfg.getBlockForAddress(firstJSRTarget);
    
    if (!firstJSRBlock) {
      return { blocks: [], savebpAddress: null };
    }
    
    // Check if the first JSR target contains SAVEBP -> JSR pattern
    // This indicates it's a global init function
    let savebpAddress: number | null = null;
    let savebpBlock: NWScriptBasicBlock | null = null;
    
    // Search for SAVEBP in blocks reachable from first JSR target
    const visited = new Set<NWScriptBasicBlock>();
    const queue: NWScriptBasicBlock[] = [firstJSRBlock];
    
    while (queue.length > 0 && !savebpAddress) {
      const block = queue.shift()!;
      if (visited.has(block)) continue;
      visited.add(block);
      
      // Check if this block contains SAVEBP
      for (const instr of block.instructions) {
        if (instr.code === OP_SAVEBP) {
          // Found SAVEBP - now search for JSR that comes after it
          // JSR might be in the same block or a successor block
          savebpAddress = instr.address;
          savebpBlock = block;

          // Search for JSR after SAVEBP
          // First check within the same block
          let foundJSR = false;
          let next = instr.nextInstr;
          while (next && next.address <= block.endInstruction.address) {
            if (next.code === OP_JSR) {
              foundJSR = true;
              break;
            }
            if (next.code === OP_RESTOREBP) {
              // Hit RESTOREBP before JSR - invalid pattern
              savebpAddress = null;
              savebpBlock = null;
              break;
            }
            next = next.nextInstr;
          }
          
          // If not found in same block, search successor blocks
          if (!foundJSR && savebpAddress) {
            const jsrSearchVisited = new Set<NWScriptBasicBlock>();
            const jsrSearchQueue: NWScriptBasicBlock[] = Array.from(block.successors);
            
            while (jsrSearchQueue.length > 0 && !foundJSR && savebpAddress) {
              const succBlock = jsrSearchQueue.shift()!;
              if (jsrSearchVisited.has(succBlock)) continue;
              jsrSearchVisited.add(succBlock);
              
              // Check if this block contains JSR after SAVEBP
              for (const succInstr of succBlock.instructions) {
                if (succInstr.code === OP_JSR && succInstr.address > instr.address) {
                  foundJSR = true;
                  break;
                }
                if (succInstr.code === OP_RESTOREBP && succInstr.address > instr.address) {
                  // Hit RESTOREBP before JSR - invalid pattern
                  savebpAddress = null;
                  savebpBlock = null;
                  foundJSR = false;
                  break;
                }
              }

              // Continue searching if we haven't found JSR yet
              if (!foundJSR && savebpAddress) {
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

            // If we didn't find JSR, invalidate SAVEBP
            if (!foundJSR) {
              savebpAddress = null;
              savebpBlock = null;
            }
          }

          if (savebpAddress) break;
        }
      }

      // Continue searching if we haven't found SAVEBP yet
      if (!savebpAddress) {
        for (const successor of block.successors) {
          if (!visited.has(successor)) {
            // Skip RETURN edges - these go back to the caller (outside the function)
            const edge = this.cfg.getEdge(block, successor);
            if (edge && edge.type === EdgeType.RETURN) {
              continue;
            }

            // Stop if we hit a RETN (end of function)
            const hasRetn = successor.instructions.some(instr => instr.code === OP_RETN);
            if (!hasRetn) {
              queue.push(successor);
            }
          }
        }
      }
    }

    // Fallback: linear scan from first JSR target if CFG search failed
    if (!savebpAddress && firstJSRBlock) {
      let instr: NWScriptInstruction | null = firstJSRBlock.startInstruction;
      while (instr) {
        if (instr.code === OP_SAVEBP) {
          savebpAddress = instr.address;
          savebpBlock = this.cfg.getBlockForAddress(instr.address) || firstJSRBlock;
          break;
        }
        if (instr.code === OP_RETN) break;
        instr = instr.nextInstr;
      }
    }
    
    // If we didn't find SAVEBP, this is not a global init function
    if (!savebpAddress || !savebpBlock) {
      return { blocks: [], savebpAddress: null };
    }
    
    // Collect blocks from first JSR target up to (but not including) SAVEBP block
    // Variables in these blocks are globals
    // CRITICAL: We must only follow execution edges within the function, NOT return edges
    const blocks: NWScriptBasicBlock[] = [];
    const blockVisited = new Set<NWScriptBasicBlock>();
    const blockQueue: NWScriptBasicBlock[] = [firstJSRBlock];
    
    // Get the return point of the entry JSR (the RETN after JSR in entry block)
    // We should NOT follow edges to this block as it's outside the function
    const entryJSRReturnBlock = this.cfg.subroutineReturns.get(firstJSR.address);

    while (blockQueue.length > 0) {
      const block = blockQueue.shift()!;
      if (blockVisited.has(block)) continue;
      blockVisited.add(block);
      
      // Check if any instruction in this block is at or after SAVEBP address
      const blockHasSavebp = block.instructions.some(instr => 
        instr.address >= savebpAddress!
      );
      
      if (blockHasSavebp) {
        // This block contains SAVEBP - we still want to include it
        // because it may contain global variable initializations BEFORE SAVEBP
        // The instruction filtering above (line 79) will exclude instructions at/after SAVEBP
        blocks.push(block);
        // Don't follow successors from SAVEBP block (they're after globals)
        continue;
      }

      // Block is entirely before SAVEBP - include it
      blocks.push(block);

      // Follow successors, but stop at SAVEBP block
      // CRITICAL: Only follow execution edges within the function, NOT return edges
      // Return edges go back to the caller and are outside the function
      for (const successor of block.successors) {
        // Include SAVEBP block if it hasn't been visited yet (it contains globals before SAVEBP)
        if (!blockVisited.has(successor)) {
          // Skip RETURN edges - these go back to the caller (outside the function)
          const edge = this.cfg.getEdge(block, successor);
          if (edge && edge.type === EdgeType.RETURN) {
            continue;
          }

          // Skip the entry JSR return point (RETN in entry block) - it's outside the function
          if (entryJSRReturnBlock && successor === entryJSRReturnBlock) {
            continue;
          }

          // Skip CALL edges to other functions (though we should stop at SAVEBP before reaching them)
          if (edge && edge.type === EdgeType.CALL) {
            // Only skip if it's not the first JSR target (which we're already in)
            if (successor.startInstruction.address !== firstJSRTarget) {
              continue;
            }
          }
          
          // Check if successor is before SAVEBP or is the SAVEBP block itself
          // We include the SAVEBP block because it may contain globals before SAVEBP
          const successorBeforeSavebp = successor.instructions.every(instr => 
            instr.address < savebpAddress!
          );
          const isSavebpBlock = successor === savebpBlock;
          if (successorBeforeSavebp || isSavebpBlock) {
            blockQueue.push(successor);
          }
        }
      }
    }

    return { blocks, savebpAddress };
  }
}

