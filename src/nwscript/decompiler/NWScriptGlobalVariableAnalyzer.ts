import type { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import type { NWScript } from "@/nwscript/NWScript";
import type { NWScriptControlFlowGraph } from "@/nwscript/decompiler/NWScriptControlFlowGraph";
import type { NWScriptBasicBlock } from "@/nwscript/decompiler/NWScriptBasicBlock";
import type { NWScriptFunction } from "@/nwscript/decompiler/NWScriptFunctionAnalyzer";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { OP_RSADD, OP_CONST, OP_CPTOPSP, OP_CPDOWNSP, OP_MOVSP, OP_NEG, OP_SAVEBP, OP_JSR, OP_RESTOREBP, OP_RETN, OP_NOP } from "@/nwscript/NWScriptOPCodes";
import {
  getUnaryDataType,
  stackBytesForDataType,
  stackSlotsForByteSize,
  toSignedInt32,
} from "@/nwscript/decompiler/NWScriptOpcodeSemantics";
import {
  buildJsrCalleeArgSlotsByEntryPc,
  buildJsrUserRoutineMetaByEntryPc,
} from "@/nwscript/decompiler/NWScriptArgumentStackLayout";
import {
  NWScriptStackSimulator,
  type NWScriptFrameVariableIdentity,
  type NWScriptStackSnapshot,
} from "@/nwscript/decompiler/NWScriptStackSimulator";
import { NWScriptExpressionType } from "@/nwscript/decompiler/NWScriptExpression";
import type { NWScriptExpression } from "@/nwscript/decompiler/NWScriptExpression";
import { nwscriptDecompilerDebug } from "@/nwscript/decompiler/NWScriptDecompilerDebug";

/**
 * Represents a detected global variable initialization
 */
export interface NWScriptGlobalInit {
  offset: number; // BP offset for the global variable
  dataType: NWScriptDataType;
  initialValue: any;
  hasInitializer: boolean; // Whether this variable has an explicit initializer
  instructionAddress: number; // Address of the RSADD instruction
  /** Recovered non-literal initializer; populated after function ABI analysis. */
  initialExpression?: NWScriptExpression;
  /** Physical width of initialExpression when it initializes a vector/struct frame range. */
  initializerStackSlots?: number;
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
  private globalInitInstructions: NWScriptInstruction[] = [];

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
    this.globalInitInstructions = [];

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
    this.globalInitInstructions = sortedInstructions;
    // A simple initializer region can be evaluated immediately, including O3 constants that
    // have no RSADD. Calls require subroutine ABI information, so keep every RSADD as a
    // provisional frame candidate and reconcile the exact values at SAVEBP in the second phase.
    const simpleFrame = this.recoverSimpleGlobalFrame(sortedInstructions);
    if (simpleFrame) {
      this.globalInits = simpleFrame;
      for (const init of simpleFrame) this.processedAddresses.add(init.instructionAddress);
    } else {
      for (const instruction of sortedInstructions) {
        if (instruction.code !== OP_RSADD) continue;
        const dataType = this.dataTypeForRsadd(instruction);
        if (dataType === null) continue;
        this.globalInits.push({
          offset: 0,
          dataType,
          initialValue: undefined,
          hasInitializer: false,
          instructionAddress: instruction.address,
        });
        this.processedAddresses.add(instruction.address);
      }
    }

    // After SAVEBP, BP points just above the global frame. Account for physical width instead
    // of assuming every recovered global occupies one dword.
    this.assignFrameOffsets();

    return this.globalInits;
  }

  /**
   * Recover initializer expressions with the canonical stack evaluator after subroutine
   * signatures are known. Before SAVEBP, compiler-generated globals are addressed through SP;
   * assigning source identities to their persistent RSADD slots keeps references to an earlier
   * global as `globalVar_n` instead of duplicating its initializer (and its side effects).
   */
  recoverInitializerExpressions(functions: NWScriptFunction[] = []): NWScriptGlobalInit[] {
    if (this.globalInitInstructions.length === 0) {
      return this.globalInits;
    }

    const provisional = this.globalInits;
    const firstPass = this.simulateGlobalInitFrame(functions, provisional, false);
    if (!firstPass) return this.globalInits;

    // Only values still present at SAVEBP are globals. This removes transient JSR return
    // reservations and expression temporaries that the legacy RSADD scan cannot distinguish.
    this.globalInits = this.globalFrameFromSnapshot(firstPass, provisional);
    this.assignFrameOffsets();

    this.simulateGlobalInitFrame(functions, this.globalInits, true);
    return this.globalInits;
  }

  private simulateGlobalInitFrame(
    functions: NWScriptFunction[],
    inits: NWScriptGlobalInit[],
    captureInitializers: boolean
  ): NWScriptStackSnapshot | null {
    const simulator = new NWScriptStackSimulator();
    simulator.setJsrCalleeArgSlotsByEntryPc(
      buildJsrCalleeArgSlotsByEntryPc(functions, this.script)
    );
    simulator.setJsrUserRoutineMetaByEntryPc(
      buildJsrUserRoutineMetaByEntryPc(functions)
    );

    const allocationIndices = new Map<number, number>();
    const identities = new Map<number, NWScriptFrameVariableIdentity>();
    const aggregateIdentities = new Map<number, NWScriptFrameVariableIdentity>();
    const vectorStarts = new Set<number>();
    const structureLayouts = new Map<number, NWScriptDataType[]>();
    for (let index = 0; index < inits.length; index += 1) {
      const init = inits[index];
      const producer = this.script.instructions.get(init.instructionAddress);
      if (producer && !allocationIndices.has(producer.address)) {
        allocationIndices.set(producer.address, index);
      }
      identities.set(index, {
        name: `globalVar_${index}`,
        dataType: init.dataType,
        isGlobal: true,
      });
    }
    simulator.setLocalVariableAllocationIndices(allocationIndices);
    simulator.setFrameVariableIdentities(identities);
    simulator.setFrameAggregateIdentities(aggregateIdentities);
    simulator.setLocalVariableInits(inits);
    simulator.setVectorLocalAllocationStarts(vectorStarts);
    simulator.setStructureLocalLayouts(structureLayouts);

    try {
      for (const instruction of this.globalInitInstructions) {
        const targetIndex = instruction.code === OP_CPDOWNSP
          ? simulator.getLocalVariableIndexAtStackPosition(
              simulator.getStackPointer() + toSignedInt32(instruction.offset)
            )
          : undefined;
        const expression = simulator.processInstruction(instruction);
        if (
          instruction.code !== OP_CPDOWNSP ||
          targetIndex === undefined ||
          targetIndex < 0 ||
          targetIndex >= inits.length ||
          !expression ||
          expression.type === NWScriptExpressionType.UNKNOWN ||
          !captureInitializers
        ) {
          continue;
        }

        const slots = stackSlotsForByteSize(
          instruction.size ?? 4,
          'global initializer CPDOWNSP'
        );
        const init = inits[targetIndex];
        init.initialExpression = expression;
        init.initializerStackSlots = slots;
        init.hasInitializer = true;
        if (expression.dataType === NWScriptDataType.VECTOR && slots === 3) {
          vectorStarts.add(targetIndex);
          aggregateIdentities.set(targetIndex, {
            name: `globalVar_${targetIndex}`,
            dataType: NWScriptDataType.VECTOR,
            isGlobal: true,
          });
          for (let component = 0; component < 3; component += 1) {
            identities.set(targetIndex + component, {
              name: `globalVar_${targetIndex}.${['x', 'y', 'z'][component]}`,
              dataType: NWScriptDataType.FLOAT,
              isGlobal: true,
            });
          }
        } else if (
          expression.dataType === NWScriptDataType.STRUCTURE &&
          expression.structureFieldTypes.length === slots
        ) {
          structureLayouts.set(targetIndex, expression.structureFieldTypes);
          aggregateIdentities.set(targetIndex, {
            name: `globalVar_${targetIndex}`,
            dataType: NWScriptDataType.STRUCTURE,
            isGlobal: true,
            structureFieldTypes: expression.structureFieldTypes,
          });
          for (let field = 0; field < slots; field += 1) {
            identities.set(targetIndex + field, {
              name: `globalVar_${targetIndex}.field_${field}`,
              dataType: expression.structureFieldTypes[field] ?? NWScriptDataType.INTEGER,
              isGlobal: true,
            });
          }
        }
      }
      return simulator.takeStackSnapshot();
    } catch (error) {
      // Preserve literal/zero-value recovery when malformed or hand-authored initialization
      // bytecode cannot be evaluated as the compiler's linear pre-SAVEBP stack program.
      nwscriptDecompilerDebug('Global initializer stack recovery failed:', error);
      return null;
    }
  }

  private globalFrameFromSnapshot(
    snapshot: NWScriptStackSnapshot,
    provisional: NWScriptGlobalInit[]
  ): NWScriptGlobalInit[] {
    const result: NWScriptGlobalInit[] = [];
    for (const item of snapshot.stack) {
      const original = provisional.find(init => init.instructionAddress === item.address);
      if (item.slotWidth === 1 && original) {
        result.push({
          ...original,
          initialExpression: undefined,
          initializerStackSlots: undefined,
        });
        continue;
      }

      const fieldTypes = item.expression.dataType === NWScriptDataType.VECTOR
        ? Array.from({ length: item.slotWidth }, () => NWScriptDataType.FLOAT)
        : item.expression.structureFieldTypes.length === item.slotWidth
          ? item.expression.structureFieldTypes
          : Array.from({ length: item.slotWidth }, () => item.expression.dataType);
      for (let slot = 0; slot < item.slotWidth; slot += 1) {
        const expression = slot === 0 ? item.expression : undefined;
        result.push({
          offset: 0,
          dataType: fieldTypes[slot] ?? NWScriptDataType.INTEGER,
          initialValue: expression?.type === NWScriptExpressionType.CONSTANT
            ? expression.value
            : undefined,
          hasInitializer: item.address >= 0 && expression !== undefined,
          instructionAddress: item.address,
          initialExpression: expression,
          initializerStackSlots: expression ? item.slotWidth : undefined,
        });
      }
    }
    return result;
  }

  private assignFrameOffsets(): void {
    const totalBytes = this.globalInits.reduce(
      (sum, init) => sum + stackBytesForDataType(init.dataType),
      0
    );
    let offset = -totalBytes;
    for (const init of this.globalInits) {
      init.offset = offset;
      offset += stackBytesForDataType(init.dataType);
    }
  }

  private dataTypeForRsadd(rsadd: NWScriptInstruction): NWScriptDataType | null {
    const dataType = getUnaryDataType(rsadd.type);
    return dataType === null ||
      dataType === NWScriptDataType.VOID ||
      dataType === NWScriptDataType.VECTOR ||
      dataType === NWScriptDataType.STRUCTURE
      ? null
      : dataType;
  }

  private recoverSimpleGlobalFrame(
    instructions: NWScriptInstruction[]
  ): NWScriptGlobalInit[] | null {
    type FrameSlot = Omit<NWScriptGlobalInit, 'offset'>;
    const stack: FrameSlot[] = [];

    for (const instruction of instructions) {
      if (instruction.code === OP_RSADD) {
        const dataType = getUnaryDataType(instruction.type);
        if (
          dataType === null ||
          dataType === NWScriptDataType.VOID ||
          dataType === NWScriptDataType.VECTOR ||
          dataType === NWScriptDataType.STRUCTURE
        ) return null;
        stack.push({
          dataType,
          initialValue: undefined,
          hasInitializer: false,
          instructionAddress: instruction.address,
        });
        continue;
      }

      if (instruction.code === OP_CONST) {
        const dataType = getUnaryDataType(instruction.type);
        if (dataType === null) return null;
        const initialValue = dataType === NWScriptDataType.INTEGER
          ? instruction.integer
          : dataType === NWScriptDataType.FLOAT
            ? instruction.float
            : dataType === NWScriptDataType.STRING
              ? instruction.string
              : dataType === NWScriptDataType.OBJECT
                ? instruction.object
                : undefined;
        if (initialValue === undefined) return null;
        stack.push({
          dataType,
          initialValue,
          hasInitializer: true,
          instructionAddress: instruction.address,
        });
        continue;
      }

      if (instruction.code === OP_NEG) {
        const top = stack[stack.length - 1];
        if (
          !top ||
          typeof top.initialValue !== 'number' ||
          (top.dataType !== NWScriptDataType.INTEGER && top.dataType !== NWScriptDataType.FLOAT)
        ) return null;
        top.initialValue = -top.initialValue;
        continue;
      }

      if (instruction.code === OP_CPTOPSP) {
        const slots = stackSlotsForByteSize(instruction.size ?? 4, 'global CPTOPSP');
        const offset = toSignedInt32(instruction.offset);
        if (offset % 4 !== 0) return null;
        const start = stack.length + offset / 4;
        if (start < 0 || start + slots > stack.length) return null;
        stack.push(...stack.slice(start, start + slots).map(slot => ({ ...slot })));
        continue;
      }

      if (instruction.code === OP_CPDOWNSP) {
        const slots = stackSlotsForByteSize(instruction.size ?? 4, 'global CPDOWNSP');
        const offset = toSignedInt32(instruction.offset);
        if (offset % 4 !== 0 || slots > stack.length) return null;
        const target = stack.length + offset / 4;
        if (target < 0 || target + slots > stack.length) return null;
        const source = stack.slice(stack.length - slots);
        for (let slot = 0; slot < slots; slot++) {
          stack[target + slot] = {
            ...source[slot],
            instructionAddress: stack[target + slot].instructionAddress,
          };
        }
        continue;
      }

      if (instruction.code === OP_MOVSP) {
        const offset = toSignedInt32(instruction.offset);
        const slots = stackSlotsForByteSize(Math.abs(offset), 'global MOVSP');
        if (offset < 0) {
          if (slots > stack.length) return null;
          stack.splice(stack.length - slots, slots);
        } else {
          return null;
        }
        continue;
      }

      if (instruction.code === OP_NOP) continue;
      // Calls/actions and BP writes need full expression/ABI simulation; preserve the proven
      // legacy analysis instead of guessing a frame through them.
      return null;
    }

    return stack.map(slot => ({ ...slot, offset: 0 }));
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
    const firstJSRTarget = firstJSR.address + toSignedInt32(firstJSR.offset);
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
            const jsrSearchQueue: NWScriptBasicBlock[] =
              this.cfg.getIntraProceduralSuccessors(block);
            
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
                for (const succSucc of this.cfg.getIntraProceduralSuccessors(succBlock)) {
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
        for (const successor of this.cfg.getIntraProceduralSuccessors(block)) {
          if (!visited.has(successor)) {
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
    // Follow the wrapper's procedure-local control flow. A RETURN edge is the linear
    // continuation after a JSR; CALL edges are the ones that enter another procedure.
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

      // Follow procedure-local successors, but stop at the SAVEBP block.
      for (const successor of this.cfg.getIntraProceduralSuccessors(block)) {
        // Include SAVEBP block if it hasn't been visited yet (it contains globals before SAVEBP)
        if (!blockVisited.has(successor)) {
          // Skip the entry JSR return point (RETN in entry block) - it's outside the function
          if (entryJSRReturnBlock && successor === entryJSRReturnBlock) {
            continue;
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
