import { NWScriptInstructionInfo } from "./NWScriptInstructionInfo";
import type { NWScriptInstance } from "./NWScriptInstance";
import { INWScriptDefAction } from "../interface/nwscript/INWScriptDefAction";

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
  code: number;
  type: number;
  address: number;
  prevInstr: NWScriptInstruction;
  nextInstr: NWScriptInstruction;
  codeName: string;
  eof: boolean;
  isArg: boolean;
  index: number;
  code_hex: string;
  type_hex: string;
  address_hex: string;
  break_point: boolean = false;

  offset: number;
  size: number;
  pointer: number;

  bpOffset: number;
  spOffset: number;

  sizeOfStructure: number;
  sizeToDestroy: number;
  offsetToSaveElement: number;
  sizeOfElementToSave: number;

  action: number;
  actionDefinition: INWScriptDefAction;
  argCount: number;
  arguments: any[];

  integer: number;
  float: number;
  object: number;
  string: string;

  opCall: ( this: NWScriptInstance, instruction: NWScriptInstruction ) => void

  constructor(args: any = {}){

    args = Object.assign({
      code: 0,
      type: 0,
      address: 0,
      prevInstr: null,
      nextInstr: null,
      eof: false,
      isArg: false,
      index: -1
    }, args);

    this.code = args.code;
    this.type = args.type;
    this.address = args.address;
    this.prevInstr = args.prevInstr;
    this.nextInstr = args.nextInstr;

    this.codeName = NWScriptInstructionInfo[this.code]?.name;

    this.eof = args.eof;
    this.isArg = args.isArg;
    this.index = args.index;

    this.code_hex = this.intToHex(this.code, 2);
    this.type_hex = this.intToHex(this.type, 2);
    this.address_hex = this.intToHex(this.address, 8);

  }

  intToHex( number = 0, min_length = 1 ){
    let hex = (number).toString(16);
    let hex_length = hex.length < min_length ? min_length : hex.length;
    let hex_pad = (new Array(hex_length)).fill('0').join('');
    return (hex_pad + hex).substr(-hex_length);
  }

}
