import type { NWScriptInstruction } from "../NWScriptInstruction";
import type { NWScript } from "../NWScript";
import type { NWScriptGlobalInit } from "./NWScriptGlobalVariableAnalyzer";
import { NWScriptDataType } from "../../enums/nwscript/NWScriptDataType";
import { OP_RSADD, OP_CONST, OP_CPDOWNSP, OP_MOVSP, OP_NEG, OP_ACTION } from '../NWScriptOPCodes';

/**
 * Represents a detected local variable initialization
 */
export interface NWScriptLocalInit {
  offset: number; // SP offset for the local variable
  dataType: NWScriptDataType;
  initialValue: any;
  hasInitializer: boolean; // Whether this variable has an explicit initializer
  instructionAddress: number; // Address of the RSADD instruction
}

/**
 * Analyzes local variable initializations from the instruction stream.
 * Detects the pattern: RSADD -> CONST -> CPDOWNSP -> MOVSP (for initialized)
 * or RSADD -> MOVSP (for uninitialized)
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptLocalVariableAnalyzer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptLocalVariableAnalyzer {
  private script: NWScript;
  private localInits: NWScriptLocalInit[] = [];
  private processedAddresses: Set<number> = new Set();
  private globalInitAddresses: Set<number> = new Set();

  constructor(script: NWScript, globalInits: NWScriptGlobalInit[] = []) {
    this.script = script;
    // Build set of global initialization addresses to exclude
    for (const globalInit of globalInits) {
      this.globalInitAddresses.add(globalInit.instructionAddress);
    }
  }

  /**
   * Analyze and detect all local variable initializations
   */
  analyze(): NWScriptLocalInit[] {
    this.localInits = [];
    this.processedAddresses.clear();

    if (!this.script.instructions) {
      return [];
    }

    // Get instructions sorted by address
    const sortedInstructions = Array.from(this.script.instructions.values())
      .sort((a, b) => a.address - b.address);

    // Track all RSADD instructions to find uninitialized ones later
    const allRSADD: NWScriptInstruction[] = [];

    // First pass: Look for initialization patterns (RSADD -> CONST -> CPDOWNSP -> MOVSP)
    for (const rsadd of sortedInstructions) {
      if (rsadd.code !== OP_RSADD) continue;
      
      // Skip if this is a global variable initialization
      if (this.globalInitAddresses.has(rsadd.address)) {
        continue;
      }
      
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

      // Find CPDOWNSP
      while (current && current.code !== OP_CPDOWNSP && current.address < constInstr.address + 30) {
        current = current.nextInstr;
      }
      if (!current || current.code !== OP_CPDOWNSP) continue;
      const cpdownsp = current;
      
      // Check if there's an ACTION call between CONST and CPDOWNSP
      // If so, this CONST is a parameter to the function, not the initializer value
      // We should still detect the variable but not set an initializer
      let hasAction = false;
      let checkCurrent = constInstr.nextInstr;
      while (checkCurrent && checkCurrent.address < cpdownsp.address) {
        if (checkCurrent.code === OP_ACTION) {
          hasAction = true;
          break;
        }
        checkCurrent = checkCurrent.nextInstr;
      }

      // Check CPDOWNSP parameters
      // For local variables, CPDOWNSP writes to a negative offset from current SP
      // The offset is typically -8 (writing to the space reserved by RSADD)
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
        // Use the actual CPDOWNSP offset (typically -8) as the variable offset
        // This is what CPTOPSP will use to read the variable (after accounting for stack movement)
        // For now, we'll use the CPDOWNSP offset directly, but note that CPTOPSP offsets
        // may differ due to stack pointer movement between variable declarations
        const cpdownspOffset = cpdownsp.offset;
        init.offset = cpdownspOffset; // Override with actual CPDOWNSP offset
        
        // If there's an ACTION call, this is a function call assignment, not a constant initialization
        // Clear the initializer but mark as having an initializer (the expression will be built elsewhere)
        if (hasAction) {
          init.initialValue = undefined;
          init.hasInitializer = true; // Has initializer (function call), but value is undefined
        }
        
        this.localInits.push(init);
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

    // Second pass: Find other initialization patterns (function calls, expressions) and uninitialized locals
    for (const rsadd of allRSADD) {
      if (this.processedAddresses.has(rsadd.address)) continue;

      // Check if there's a CPDOWNSP that writes to the space reserved by this RSADD
      let hasWrite = false;
      let cpdownspInstr: NWScriptInstruction | null = null;
      let current = rsadd.nextInstr;
      
      // Look ahead for CPDOWNSP with offset -8 (writing to reserved space)
      // Limit search to reasonable distance (e.g., 100 instructions)
      let searchLimit = 0;
      while (current && searchLimit < 100) {
        if (current.code === OP_CPDOWNSP) {
          const offset = current.offset;
          const offsetSigned = offset > 0x7FFFFFFF ? offset - 0x100000000 : offset;
          // Check if it writes to offset -8 (the space reserved by RSADD)
          if (offsetSigned === -8 && current.size === 4) {
            hasWrite = true;
            cpdownspInstr = current;
            break;
          }
        }
        current = current.nextInstr;
        searchLimit++;
      }

      // If we found a CPDOWNSP write but it wasn't part of a CONST pattern,
      // it might be a function call or expression assignment
      if (hasWrite && cpdownspInstr) {
        // Work backwards from CPDOWNSP to find what expression was on the stack
        // Look for ACTION (function call) or other expressions before CPDOWNSP
        let exprStart = rsadd.nextInstr;
        let exprEnd = cpdownspInstr.prevInstr;
        
        // Check if there's an ACTION call before CPDOWNSP
        let actionInstr: NWScriptInstruction | null = null;
        current = exprEnd;
        while (current && current.address >= exprStart.address) {
          if (current.code === OP_ACTION) {
            actionInstr = current;
            break;
          }
          current = current.prevInstr;
        }
        
        // If we found an ACTION call, this is a function call assignment
        // We can't extract the full expression here (that's done by StatementBuilder),
        // but we can mark it as initialized
        if (actionInstr) {
          // Determine data type from RSADD type
          let dataType: NWScriptDataType;
          switch (rsadd.type) {
            case 3: dataType = NWScriptDataType.INTEGER; break;
            case 4: dataType = NWScriptDataType.FLOAT; break;
            case 5: dataType = NWScriptDataType.STRING; break;
            case 6: dataType = NWScriptDataType.OBJECT; break;
            default: continue; // Skip unknown types
          }

          // Find MOVSP after CPDOWNSP
          let movspInstr: NWScriptInstruction | null = null;
          current = cpdownspInstr.nextInstr;
          while (current && current.address < cpdownspInstr.address + 20) {
            if (current.code === OP_MOVSP) {
              const movspOffset = current.offset;
              const movspOffsetSigned = movspOffset > 0x7FFFFFFF ? movspOffset - 0x100000000 : movspOffset;
              if (movspOffsetSigned === -4) {
                movspInstr = current;
                break;
              }
            }
            current = current.nextInstr;
          }

          // If we have the full pattern (RSADD -> ACTION -> CPDOWNSP -> MOVSP), mark as initialized
          // Note: We can't extract the expression here, but we mark it as initialized
          // The actual expression will be reconstructed by StatementBuilder/StackSimulator
          if (movspInstr) {
            // Use the actual CPDOWNSP offset (typically -8) as the variable offset
            // This is what CPTOPSP will use to read the variable
            const cpdownspOffset = cpdownspInstr.offset;
            const cpdownspOffsetSigned = cpdownspOffset > 0x7FFFFFFF ? cpdownspOffset - 0x100000000 : cpdownspOffset;
            
            this.localInits.push({
              offset: cpdownspOffset, // Use the actual CPTOPSP offset (unsigned for map key)
              dataType: dataType,
              initialValue: undefined, // Expression will be extracted elsewhere
              hasInitializer: true, // Has initializer (function call result)
              instructionAddress: rsadd.address
            });

            // Mark instructions as processed
            this.processedAddresses.add(rsadd.address);
            this.processedAddresses.add(actionInstr.address);
            this.processedAddresses.add(cpdownspInstr.address);
            this.processedAddresses.add(movspInstr.address);
            
            // Mark all instructions between RSADD and MOVSP as part of this initialization
            current = rsadd.nextInstr;
            while (current && current.address < movspInstr.address) {
              this.processedAddresses.add(current.address);
              current = current.nextInstr;
            }
          }
        }
      }

      // If no write found, this is an uninitialized local
      if (!hasWrite) {
        // Determine data type from RSADD type
        let dataType: NWScriptDataType;
        switch (rsadd.type) {
          case 3: dataType = NWScriptDataType.INTEGER; break;
          case 4: dataType = NWScriptDataType.FLOAT; break;
          case 5: dataType = NWScriptDataType.STRING; break;
          case 6: dataType = NWScriptDataType.OBJECT; break;
          default: continue; // Skip unknown types
        }

        // For uninitialized variables, we need to find what offset they use
        // Look for CPTOPSP instructions that read from this variable
        // For now, use a default offset based on order (will be corrected if we find CPTOPSP)
        // Default: -8 for first, -12 for second, -16 for third, etc.
        // But actually, we should track the stack state...
        // For simplicity, use -8 - (index * 4) as a heuristic
        const index = this.localInits.length;
        const defaultOffset = 0xFFFFFFF8 - (index * 4); // -8, -12, -16, etc.
        
        this.localInits.push({
          offset: defaultOffset,
          dataType: dataType,
          initialValue: undefined,
          hasInitializer: false,
          instructionAddress: rsadd.address
        });

        // Mark RSADD as processed
        this.processedAddresses.add(rsadd.address);
      }
    }

    return this.localInits;
  }

  /**
   * Extract initialization information from the pattern
   */
  private extractInitialization(
    rsadd: NWScriptInstruction,
    constInstr: NWScriptInstruction,
    cpdownsp: NWScriptInstruction,
    hasNeg: boolean = false
  ): NWScriptLocalInit | null {
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
    if (dataType === NWScriptDataType.OBJECT && (initialValue === 0 || initialValue === 1 || initialValue === undefined)) {
      hasInitializer = false;
      initialValue = undefined;
    }

    // Calculate local variable offset (based on order)
    const offset = this.localInits.length * 4;

    return {
      offset: offset,
      dataType: dataType,
      initialValue: initialValue,
      hasInitializer: hasInitializer,
      instructionAddress: rsadd.address
    };
  }

  /**
   * Get all detected local variable initializations
   */
  getLocalInits(): NWScriptLocalInit[] {
    return this.localInits;
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
  getInitForOffset(offset: number): NWScriptLocalInit | null {
    return this.localInits.find(init => init.offset === offset) || null;
  }
}

