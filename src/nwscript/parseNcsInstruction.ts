/**
 * Shared NCS instruction decoder used by {@link NWScript.parseIntruction}
 * and the inspector. One switch, no second bytecode scanner.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file parseNcsInstruction.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
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
  OP_STORE_STATE,
  OP_T,
} from "@/nwscript/NWScriptOPCodes";
import type { BinaryReader } from "@/utility/binary/BinaryReader";

export function parseNcsInstruction(
  reader: BinaryReader,
  lastInstruction: NWScriptInstruction | null,
  index: number,
  actionsMap?: { [key: number]: INWScriptDefAction },
): NWScriptInstruction {
  const instructionAddress = reader.position;
  const opCode = reader.readByte();
  const opType = opCode != OP_T ? reader.readByte() : reader.readInt32();

  const instruction = new NWScriptInstruction(opCode, opType, instructionAddress);
  instruction.prevInstr = lastInstruction as NWScriptInstruction;
  instruction.index = index;

  if (lastInstruction) {
    lastInstruction.nextInstr = instruction;
  }

  switch (opCode) {
    case OP_CPDOWNSP:
    case OP_CPTOPSP:
    case OP_CPDOWNBP:
    case OP_CPTOPBP:
      instruction.offset = reader.readInt32();
      instruction.size = reader.readInt16();
      if (instruction.offset == undefined || instruction.size == undefined) {
        console.warn(instruction.codeName, instruction.offset, instruction.size, reader.position);
      }
      break;
    case OP_CONST:
      switch (instruction.type) {
        case 3:
          instruction.integer = reader.readInt32();
          break;
        case 4:
          instruction.float = reader.readSingle();
          break;
        case 5:
          instruction.string = reader.readChars(reader.readUInt16());
          break;
        case 6:
          instruction.object = reader.readInt32();
          break;
      }
      break;
    case OP_ACTION:
      instruction.action = reader.readUInt16();
      instruction.argCount = reader.readByte();
      instruction.actionDefinition = actionsMap?.[instruction.action];
      break;
    case OP_EQUAL:
    case OP_NEQUAL:
      if (instruction.type == NWScriptDataType.STRUCTURE) {
        instruction.sizeOfStructure = reader.readUInt16();
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
      instruction.offset = reader.readInt32();
      break;
    case OP_DESTRUCT:
      instruction.sizeToDestroy = reader.readInt16();
      instruction.offsetToSaveElement = reader.readInt16();
      instruction.sizeOfElementToSave = reader.readInt16();
      break;
    case OP_STORE_STATE:
      instruction.bpOffset = reader.readInt32();
      instruction.spOffset = reader.readInt32();
      break;
    case OP_T:
      instruction.size = opType;
      break;
  }

  instruction.instructionSize = reader.position - instructionAddress;
  return instruction;
}
