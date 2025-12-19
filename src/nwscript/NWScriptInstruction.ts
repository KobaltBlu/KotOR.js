import { NWScriptInstructionInfo } from "./NWScriptInstructionInfo";
import type { NWScriptInstance } from "./NWScriptInstance";
import { INWScriptDefAction } from "../interface/nwscript/INWScriptDefAction";

import {
  OP_CPDOWNSP, OP_RSADD, OP_CPTOPSP, OP_CONST, OP_ACTION, OP_LOGANDII, OP_LOGORII, OP_INCORII, OP_EXCORII,
  OP_BOOLANDII, OP_EQUAL, OP_NEQUAL, OP_GEQ, OP_GT, OP_LT, OP_LEQ, OP_SHLEFTII, OP_SHRIGHTII, OP_USHRIGHTII,
  OP_ADD, OP_SUB, OP_MUL, OP_DIV, OP_MODII, OP_NEG, OP_COMPI, OP_MOVSP, OP_STORE_STATEALL, OP_JMP, OP_JSR,
  OP_JZ, OP_RETN, OP_DESTRUCT, OP_NOTI, OP_DECISP, OP_INCISP, OP_JNZ, OP_CPDOWNBP, OP_CPTOPBP, OP_DECIBP, OP_INCIBP,
  OP_SAVEBP, OP_RESTOREBP, OP_STORE_STATE, OP_NOP, OP_T
} from './NWScriptOPCodes';

import {
  CALL_CPDOWNSP, CALL_RSADD, CALL_CPTOPSP, CALL_CONST, CALL_ACTION, CALL_LOGANDII, CALL_LOGORII, CALL_INCORII, CALL_EXCORII,
  CALL_BOOLANDII, CALL_EQUAL, CALL_NEQUAL, CALL_GEQ, CALL_GT, CALL_LT, CALL_LEQ, CALL_SHLEFTII, CALL_SHRIGHTII, CALL_USHRIGHTII,
  CALL_ADD, CALL_SUB, CALL_MUL, CALL_DIV, CALL_MOD, CALL_NEG, CALL_COMPI, CALL_MOVSP, CALL_STORE_STATEALL, CALL_JMP,   CALL_JSR,
  CALL_JZ, CALL_RETN, CALL_DESTRUCT, CALL_NOTI, CALL_DECISP, CALL_INCISP, CALL_JNZ, CALL_CPDOWNBP, CALL_CPTOPBP, CALL_DECIBP, CALL_INCIBP,
  CALL_SAVEBP, CALL_RESTOREBP, CALL_STORE_STATE, CALL_NOP
} from './NWScriptInstructionSet';

const OP_CALL_MAP: Map<number, ( this: NWScriptInstance, instruction: NWScriptInstruction ) => void> = new Map([
  [OP_CPDOWNSP, CALL_CPDOWNSP],
  [OP_RSADD, CALL_RSADD],
  [OP_CPTOPSP, CALL_CPTOPSP],
  [OP_CONST, CALL_CONST],
  [OP_ACTION, CALL_ACTION],
  [OP_LOGANDII, CALL_LOGANDII],
  [OP_LOGORII, CALL_LOGORII],
  [OP_INCORII, CALL_INCORII],
  [OP_EXCORII, CALL_EXCORII],
  [OP_BOOLANDII, CALL_BOOLANDII],
  [OP_EQUAL, CALL_EQUAL],
  [OP_NEQUAL, CALL_NEQUAL],
  [OP_GEQ, CALL_GEQ],
  [OP_GT, CALL_GT],
  [OP_LT, CALL_LT],
  [OP_LEQ, CALL_LEQ],
  [OP_SHLEFTII, CALL_SHLEFTII],
  [OP_SHRIGHTII, CALL_SHRIGHTII],
  [OP_USHRIGHTII, CALL_USHRIGHTII],
  [OP_ADD, CALL_ADD],
  [OP_SUB, CALL_SUB],
  [OP_MUL, CALL_MUL],
  [OP_DIV, CALL_DIV],
  [OP_MODII, CALL_MOD],
  [OP_NEG, CALL_NEG],
  [OP_COMPI, CALL_COMPI],
  [OP_MOVSP, CALL_MOVSP],
  [OP_STORE_STATEALL, CALL_STORE_STATEALL],
  [OP_JMP, CALL_JMP],
  [OP_JSR, CALL_JSR],
  [OP_JZ, CALL_JZ],
  [OP_RETN, CALL_RETN],
  [OP_DESTRUCT, CALL_DESTRUCT],
  [OP_NOTI, CALL_NOTI],
  [OP_DECISP, CALL_DECISP],
  [OP_INCISP, CALL_INCISP],
  [OP_JNZ, CALL_JNZ],
  [OP_CPDOWNBP, CALL_CPDOWNBP],
  [OP_CPTOPBP, CALL_CPTOPBP],
  [OP_DECIBP, CALL_DECIBP],
  [OP_INCIBP, CALL_INCIBP],
  [OP_SAVEBP, CALL_SAVEBP],
  [OP_RESTOREBP, CALL_RESTOREBP],
  [OP_STORE_STATE, CALL_STORE_STATE],
  [OP_NOP, CALL_NOP],
  [OP_T, CALL_NOP],
]);
/**
 * NWScriptInstruction class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file NWScriptInstruction.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class NWScriptInstruction {
  /**
   * The opcode of the instruction
   */
  code: number;

  /**
   * The type of the instruction
   */
  type: number;

  /**
   * The address of the instruction in the script byte code
   */
  address: number;

  /**
   * The size of the instruction in bytes
   */
  instructionSize: number;
  
  /**
   * The previous instruction in the script byte code
   */
  prevInstr: NWScriptInstruction;
  
  /**
   * The next instruction in the script byte code
   */
  nextInstr: NWScriptInstruction;

  /**
   * The name of the instruction
   */
  codeName: string;

  /**
   * Whether the instruction is the end of the script file
   */
  eof: boolean = false;
  
  /**
   * Whether the instruction is an argument for an action (Unused in KotOR JS)
   */
  isArg: boolean = false;
  
  /**
   * The index of the instruction in the script byte code
   */
  index: number = -1;
  
  /**
   * The hexadecimal representation of the opcode of the instruction
   */
  code_hex: string;
  
  /**
   * The hexadecimal representation of the type of the instruction
   */
  type_hex: string;
  
  /**
   * The hexadecimal representation of the address of the instruction in the script byte code
   */
  address_hex: string;
  
  /**
   * Whether the instruction is a break point
   */
  break_point: boolean = false;

  /**
   * The offset of the instruction in the script byte code
   */
  offset: number;
  
  /**
   * The size of the instruction in bytes
   */
  size: number;
  
  /**
   * The pointer of the instruction in the script byte code
   */
  pointer: number;

  /**
   * The base pointer offset of the instruction in the script byte code
   */
  bpOffset: number;
  
  /**
   * The stack pointer offset of the instruction in the script byte code
   */
  spOffset: number;

  /**
   * The size of the structure of the instruction in bytes
   */ 
  sizeOfStructure: number;

  /**
   * The size of the elements to destroy of the instruction in bytes
   */
  sizeToDestroy: number;

  /**
   * The offset to save the element of the instruction in the script byte code
   */
  offsetToSaveElement: number;

  /**
   * The size of the elements to save of the instruction in bytes
   */
  sizeOfElementToSave: number;

  /**
   * The action of the instruction
   * - Used for the ACTION opcode
   */
  action: number;

  /**
   * The definition of the action of the instruction
   * - Used for the ACTION opcode
   */
  actionDefinition: INWScriptDefAction;

  /**
   * The count of the arguments of the instruction
   * - Used for the ACTION opcode
   */
  argCount: number;

  /**
   * The arguments of the instruction
   * - Used for the ACTION opcode
   */
  arguments: any[] = [];

  /**
   * The integer value of the instruction
   * - Used for the CONST opcode
   */
  integer: number;

  /**
   * The float value of the instruction
   * - Used for the CONST opcode
   */
  float: number;
  
  /**
   * The object value of the instruction
   * - Used for the CONST opcode
   */
  object: number;

  /**
   * The string value of the instruction
   * - Used for the CONST opcode
   */
  string: string;

  /**
   * The function to call when the instruction is executed
   * - This is overridden on load with the appropriate function based on the opcode
   */
  opCall: ( this: NWScriptInstance, instruction: NWScriptInstruction ) => void

  constructor(opCode: number, opType: number, opAddress: number = 0){
    this.code = opCode;
    this.type = opType != OP_T ? opType : 0;
    this.address = opAddress;
    this.codeName = NWScriptInstructionInfo[this.code]?.name;
    this.code_hex = this.intToHex(this.code, 2);
    this.type_hex = this.intToHex(this.type, 2);
    this.address_hex = this.intToHex(this.address, 8);
    this.opCall = OP_CALL_MAP.get(this.code) || CALL_NOP;
  }

  /**
   * Convert a number to a hexadecimal string
   * @param number - The number to convert
   * @param min_length - The minimum length of the hexadecimal string
   * @returns The hexadecimal string
   */
  intToHex( number = 0, min_length = 1 ){
    let hex = (number).toString(16);
    let hex_length = hex.length < min_length ? min_length : hex.length;
    let hex_pad = (new Array(hex_length)).fill('0').join('');
    return (hex_pad + hex).substr(-hex_length);
  }

}
