/**
 * Standalone NCS → assembly text, matching {@link NWScript.toAssembly} /
 * {@link NWScriptInstruction.toAssemblyString} without pulling GameState.
 */

import { BinaryReader } from '../../src/utility/binary/BinaryReader';
import { Endians } from '../../src/enums/resource/Endians';
import { NWScriptDataType } from '../../src/enums/nwscript/NWScriptDataType';
import { NWScriptInstructionInfo } from '../../src/nwscript/NWScriptInstructionInfo';
import {
  OP_ACTION,
  OP_CONST,
  OP_CPDOWNBP,
  OP_CPDOWNSP,
  OP_CPTOPBP,
  OP_CPTOPSP,
  OP_DECIBP,
  OP_DECISP,
  OP_DESTRUCT,
  OP_EQUAL,
  OP_INCIBP,
  OP_INCISP,
  OP_JMP,
  OP_JNZ,
  OP_JSR,
  OP_JZ,
  OP_MOVSP,
  OP_NEQUAL,
  OP_RSADD,
  OP_STORE_STATE,
  OP_T,
} from '../../src/nwscript/NWScriptOPCodes';

interface AsmInstr {
  address: number;
  code: number;
  type: number;
  codeName: string;
  integer?: number;
  float?: number;
  string?: string;
  object?: number;
  action?: number;
  argCount?: number;
  offset?: number;
  size?: number;
  sizeToDestroy?: number;
  offsetToSaveElement?: number;
  sizeOfElementToSave?: number;
  bpOffset?: number;
  spOffset?: number;
  sizeOfStructure?: number;
}

function intToHex(value: number, minLength: number): string {
  let hex = value.toString(16).toUpperCase();
  if (value < 0) {
    hex = (0x100000000 + value).toString(16).toUpperCase();
  }
  return hex.padStart(minLength, '0');
}

function intToHexBytes(value: number, byteCount: number): string {
  return intToHex(value, byteCount * 2);
}

function floatToInt32(float: number): number {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, float, false);
  return view.getInt32(0, false);
}

function parseInstructions(data: Uint8Array): AsmInstr[] {
  let reader = new BinaryReader(data, Endians.BIG);
  reader.skip(8);
  const prog = reader.readByte();
  if (prog !== OP_T) {
    throw new Error(`Invalid NCS program type 0x${prog.toString(16)} (expected OP_T)`);
  }
  const progSize = reader.readUInt32();
  reader = reader.slice(13, progSize);
  const codeLen = reader.buffer.length;

  const instructions: AsmInstr[] = [];
  while (reader.position < codeLen) {
    const address = reader.position;
    const opCode = reader.readByte();
    const opType = opCode !== OP_T ? reader.readByte() : reader.readInt32();
    const instr: AsmInstr = {
      address,
      code: opCode,
      type: opType,
      codeName: NWScriptInstructionInfo[opCode]?.name || `OP_${opCode}`,
    };

    switch (opCode) {
      case OP_CPDOWNSP:
      case OP_CPTOPSP:
      case OP_CPDOWNBP:
      case OP_CPTOPBP:
        instr.offset = reader.readInt32();
        instr.size = reader.readInt16();
        break;
      case OP_CONST:
        switch (opType) {
          case 3:
            instr.integer = reader.readInt32();
            break;
          case 4:
            instr.float = reader.readSingle();
            break;
          case 5:
            instr.string = reader.readChars(reader.readUInt16());
            break;
          case 6:
            instr.object = reader.readInt32();
            break;
        }
        break;
      case OP_ACTION:
        instr.action = reader.readUInt16();
        instr.argCount = reader.readByte();
        break;
      case OP_EQUAL:
      case OP_NEQUAL:
        if (opType === NWScriptDataType.STRUCTURE) {
          instr.sizeOfStructure = reader.readUInt16();
        }
        break;
      case OP_MOVSP:
      case OP_JMP:
      case OP_JSR:
      case OP_JZ:
      case OP_DECISP:
      case OP_INCISP:
      case OP_JNZ:
      case OP_DECIBP:
      case OP_INCIBP:
        instr.offset = reader.readInt32();
        break;
      case OP_DESTRUCT:
        instr.sizeToDestroy = reader.readInt16();
        instr.offsetToSaveElement = reader.readInt16();
        instr.sizeOfElementToSave = reader.readInt16();
        break;
      case OP_STORE_STATE:
        instr.bpOffset = reader.readInt32();
        instr.spOffset = reader.readInt32();
        break;
      case OP_T:
        instr.size = opType;
        break;
      default:
        break;
    }

    instructions.push(instr);
  }

  return instructions;
}

function instructionToAssemblyString(instr: AsmInstr): string {
  const address = intToHex(instr.address, 8);
  const codeHex = intToHex(instr.code, 2);
  const typeHex = intToHex(instr.type, 2);
  const bytes: string[] = [codeHex];

  if (instr.code !== OP_T) {
    bytes.push(typeHex);
  } else {
    bytes.push(intToHexBytes(instr.type, 4));
  }

  let operandStr = '';

  switch (instr.code) {
    case OP_CONST:
      switch (instr.type) {
        case 3:
          bytes.push(intToHexBytes(instr.integer!, 4));
          operandStr = intToHex(instr.integer!, 8);
          break;
        case 4:
          bytes.push(intToHexBytes(floatToInt32(instr.float!), 4));
          operandStr = String(instr.float);
          break;
        case 5: {
          const strLen = instr.string ? instr.string.length : 0;
          bytes.push(intToHexBytes(strLen, 2));
          bytes.push('str');
          operandStr = `"${instr.string || ''}"`;
          break;
        }
        case 6:
          bytes.push(intToHexBytes(instr.object!, 4));
          operandStr = intToHex(instr.object!, 8);
          break;
      }
      break;
    case OP_ACTION:
      bytes.push(intToHexBytes(instr.action!, 2));
      bytes.push(intToHex(instr.argCount!, 2));
      operandStr = `Action_${intToHex(instr.action!, 4)}(${intToHex(instr.action!, 4)}), ${intToHex(instr.argCount!, 2)}`;
      break;
    case OP_JSR:
    case OP_JMP:
    case OP_JZ:
    case OP_JNZ:
    case OP_MOVSP:
    case OP_DECISP:
    case OP_INCISP:
    case OP_DECIBP:
    case OP_INCIBP:
      if (instr.offset !== undefined) {
        bytes.push(intToHexBytes(instr.offset, 4));
        const targetHex = intToHex(instr.address + instr.offset, 8);
        if (instr.code === OP_JSR) operandStr = `fn_${targetHex}`;
        else if (instr.code === OP_JMP || instr.code === OP_JNZ || instr.code === OP_JZ) operandStr = `off_${targetHex}`;
        else operandStr = intToHex(instr.offset, 8);
      }
      break;
    case OP_CPDOWNSP:
    case OP_CPTOPSP:
    case OP_CPDOWNBP:
    case OP_CPTOPBP:
      if (instr.offset !== undefined && instr.size !== undefined) {
        bytes.push(intToHexBytes(instr.offset, 4));
        bytes.push(intToHexBytes(instr.size, 2));
        operandStr = `${intToHex(instr.offset, 8)}, ${intToHex(instr.size, 4)}`;
      }
      break;
    case OP_DESTRUCT:
      if (
        instr.sizeToDestroy !== undefined &&
        instr.offsetToSaveElement !== undefined &&
        instr.sizeOfElementToSave !== undefined
      ) {
        bytes.push(intToHexBytes(instr.sizeToDestroy, 2));
        bytes.push(intToHexBytes(instr.offsetToSaveElement, 2));
        bytes.push(intToHexBytes(instr.sizeOfElementToSave, 2));
        operandStr = `${intToHex(instr.sizeToDestroy, 4)}, ${intToHex(instr.offsetToSaveElement, 4)}, ${intToHex(instr.sizeOfElementToSave, 4)}`;
      }
      break;
    case OP_STORE_STATE:
      if (instr.bpOffset !== undefined && instr.spOffset !== undefined) {
        bytes.push(intToHexBytes(instr.bpOffset, 4));
        bytes.push(intToHexBytes(instr.spOffset, 4));
        operandStr = `${intToHex(instr.bpOffset, 8)}, ${intToHex(instr.spOffset, 8)}`;
      }
      break;
    case OP_EQUAL:
    case OP_NEQUAL:
      if (instr.type === NWScriptDataType.STRUCTURE && instr.sizeOfStructure !== undefined) {
        bytes.push(intToHexBytes(instr.sizeOfStructure, 2));
        operandStr = intToHex(instr.sizeOfStructure, 4);
      }
      break;
    case OP_T:
      operandStr = intToHex(instr.type, 8);
      break;
    default:
      break;
  }

  let instrName = instr.codeName || `OP_${instr.code}`;
  if (instr.code === OP_RSADD) {
    switch (instr.type) {
      case 3: instrName = 'RSADDI'; break;
      case 4: instrName = 'RSADDF'; break;
      case 5: instrName = 'RSADDS'; break;
      case 6: instrName = 'RSADDO'; break;
    }
  } else if (instr.code === OP_CONST) {
    switch (instr.type) {
      case 3: instrName = 'CONSTI'; break;
      case 4: instrName = 'CONSTF'; break;
      case 5: instrName = 'CONSTS'; break;
      case 6: instrName = 'CONSTO'; break;
    }
  }

  const bytesStr = bytes.join(' ').padEnd(24);
  return `${address} ${bytesStr} ${instrName}${operandStr ? ' ' + operandStr : ''}`;
}

/** Convert an NCS buffer to multi-line assembly text (same format as Forge / NWScript.toAssembly). */
export function ncsBufferToAssembly(data: Uint8Array): string {
  if (!data?.length) throw new Error('Empty NCS buffer');
  const decoder = new TextDecoder();
  if (decoder.decode(data.slice(0, 8)) !== 'NCS V1.0') {
    throw new Error('Not an NCS V1.0 file');
  }
  const instructions = parseInstructions(data);
  return instructions.map(instructionToAssemblyString).join('\n') + '\n';
}
