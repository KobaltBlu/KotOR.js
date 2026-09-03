/**
 * Structured NCS inspection model built from {@link NWScript.parseIntruction}.
 *
 * File offsets include the 13-byte `NCS V1.0` header. Code offsets match
 * {@link NWScriptInstruction.address} after {@link NWScript.init} slices that header.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ncsInspection.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { NWScriptByteCode } from "@/enums/nwscript/NWScriptByteCode";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { Endians } from "@/enums/resource/Endians";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import type { NWScript } from "@/nwscript/NWScript";
import { NWScriptInstruction } from "@/nwscript/NWScriptInstruction";
import { parseNcsInstruction } from "@/nwscript/parseNcsInstruction";
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
import { BinaryReader } from "@/utility/binary/BinaryReader";

export const NCS_HEADER_MAGIC = "NCS V1.0";
export const NCS_HEADER_SIZE = 13;

export type NcsPartKind =
  | "opcode"
  | "aux"
  | "integer"
  | "float"
  | "object"
  | "string"
  | "stringLength"
  | "actionId"
  | "argc"
  | "relativeAddress"
  | "stackOffset"
  | "size"
  | "bpOffset"
  | "spOffset"
  | "sizeToDestroy"
  | "offsetToSaveElement"
  | "sizeOfElementToSave"
  | "sizeOfStructure"
  | "bytes";

export interface NcsInstructionPart {
  kind: NcsPartKind;
  label: string;
  /** Offset from the start of the file (includes header). */
  fileOffset: number;
  /** Offset from the start of the code section. */
  codeOffset: number;
  size: number;
  value?: number | string;
}

export interface NcsInspectedInstruction {
  index: number;
  codeOffset: number;
  fileOffset: number;
  size: number;
  opcode: number;
  aux: number;
  mnemonic: string;
  assembly: string;
  parts: NcsInstructionPart[];
  jumpTarget?: number;
  actionId?: number;
  actionName?: string;
  argCount?: number;
}

export interface NcsInspectionHeader {
  magic: string;
  hasHeader: boolean;
  headerSize: number;
  fileOffset: number;
  codeOffset: number;
  programType?: number;
  declaredSize?: number;
}

export interface NcsFunctionEntry {
  codeOffset: number;
  fileOffset: number;
  name: string;
  kind: "jsr" | "decompiled";
}

export interface NcsInspection {
  fileBytes: Uint8Array;
  header: NcsInspectionHeader;
  instructions: NcsInspectedInstruction[];
  functions: NcsFunctionEntry[];
  inspectError?: string;
  script?: NWScript;
}

export interface InspectNcsOptions {
  /** Reuse an already-parsed script (must match `bytes`). */
  script?: NWScript;
  actionsMap?: { [key: number]: INWScriptDefAction };
  /** Recovered decompiler names keyed by code offset. */
  recoveredFunctions?: ReadonlyArray<{ codeOffset: number; name: string }>;
}

export function hasNcsHeader(bytes: Uint8Array): boolean {
  if (bytes.length < 8) {
    return false;
  }
  return new TextDecoder("latin1").decode(bytes.subarray(0, 8)) === NCS_HEADER_MAGIC;
}

export function parseNcsHeader(bytes: Uint8Array): NcsInspectionHeader {
  if (!hasNcsHeader(bytes)) {
    return {
      magic: "",
      hasHeader: false,
      headerSize: 0,
      fileOffset: 0,
      codeOffset: 0,
    };
  }
  const reader = new BinaryReader(bytes, Endians.BIG);
  reader.skip(8);
  const programType = bytes.length > 8 ? reader.readByte() : undefined;
  const declaredSize = bytes.length >= NCS_HEADER_SIZE ? reader.readUInt32() : undefined;
  return {
    magic: NCS_HEADER_MAGIC,
    hasHeader: true,
    headerSize: NCS_HEADER_SIZE,
    fileOffset: 0,
    codeOffset: 0,
    programType,
    declaredSize,
  };
}

function formatHex(value: number, width: number): string {
  const unsigned = value < 0 ? (0x100000000 + value) : value;
  return unsigned.toString(16).toUpperCase().padStart(width, "0");
}

function mnemonicFor(opcode: number): string {
  return (NWScriptByteCode as unknown as Record<number, string>)[opcode]
    ?? NWScriptByteCode[opcode]
    ?? `OP_${formatHex(opcode, 2)}`;
}

function isJumpOpcode(opcode: number): boolean {
  return opcode === OP_JMP || opcode === OP_JSR || opcode === OP_JZ || opcode === OP_JNZ;
}

function expectedInstructionSize(instruction: NWScriptInstruction): number {
  switch (instruction.code) {
    case OP_CPDOWNSP:
    case OP_CPTOPSP:
    case OP_CPDOWNBP:
    case OP_CPTOPBP:
      return 8;
    case OP_CONST:
      switch (instruction.type) {
        case NWScriptDataType.INTEGER:
        case NWScriptDataType.FLOAT:
        case NWScriptDataType.OBJECT:
          return 6;
        case NWScriptDataType.STRING:
          return 4 + (instruction.string ? instruction.string.length : 0);
        default:
          return 2;
      }
    case OP_ACTION:
      return 5;
    case OP_EQUAL:
    case OP_NEQUAL:
      return instruction.type === NWScriptDataType.STRUCTURE ? 4 : 2;
    case OP_MOVSP:
    case OP_JMP:
    case OP_JSR:
    case OP_JZ:
    case OP_DECISP:
    case OP_INCISP:
    case OP_JNZ:
    case OP_DECIBP:
    case OP_INCIBP:
      return 6;
    case OP_DESTRUCT:
      return 8;
    case OP_STORE_STATE:
      return 10;
    case OP_T:
      return 5;
    default:
      return 2;
  }
}

function part(
  kind: NcsPartKind,
  label: string,
  fileOffset: number,
  codeOffset: number,
  size: number,
  value?: number | string,
): NcsInstructionPart {
  return { kind, label, fileOffset, codeOffset, size, value };
}

function buildParts(instruction: NWScriptInstruction, headerSize: number): NcsInstructionPart[] {
  const code = instruction.address;
  const file = code + headerSize;
  const parts: NcsInstructionPart[] = [
    part("opcode", "Opcode", file, code, 1, instruction.code),
  ];
  let cursor = 1;

  if (instruction.code === OP_T) {
    parts.push(part("size", "Program size", file + cursor, code + cursor, 4, instruction.size ?? instruction.type));
    return parts;
  }

  parts.push(part("aux", "Type", file + cursor, code + cursor, 1, instruction.type));
  cursor += 1;

  switch (instruction.code) {
    case OP_CPDOWNSP:
    case OP_CPTOPSP:
    case OP_CPDOWNBP:
    case OP_CPTOPBP:
      parts.push(part("stackOffset", "Stack offset", file + cursor, code + cursor, 4, instruction.offset));
      cursor += 4;
      parts.push(part("size", "Size", file + cursor, code + cursor, 2, instruction.size));
      break;
    case OP_CONST:
      switch (instruction.type) {
        case NWScriptDataType.INTEGER:
          parts.push(part("integer", "Integer", file + cursor, code + cursor, 4, instruction.integer));
          break;
        case NWScriptDataType.FLOAT:
          parts.push(part("float", "Float", file + cursor, code + cursor, 4, instruction.float));
          break;
        case NWScriptDataType.STRING: {
          const str = instruction.string ?? "";
          parts.push(part("stringLength", "String length", file + cursor, code + cursor, 2, str.length));
          cursor += 2;
          parts.push(part("string", "String", file + cursor, code + cursor, str.length, str));
          break;
        }
        case NWScriptDataType.OBJECT:
          parts.push(part("object", "Object", file + cursor, code + cursor, 4, instruction.object));
          break;
      }
      break;
    case OP_ACTION:
      parts.push(part("actionId", "ACTION id", file + cursor, code + cursor, 2, instruction.action));
      cursor += 2;
      parts.push(part("argc", "Arg count", file + cursor, code + cursor, 1, instruction.argCount));
      break;
    case OP_EQUAL:
    case OP_NEQUAL:
      if (instruction.type === NWScriptDataType.STRUCTURE) {
        parts.push(part("sizeOfStructure", "Structure size", file + cursor, code + cursor, 2, instruction.sizeOfStructure));
      }
      break;
    case OP_MOVSP:
    case OP_DECISP:
    case OP_INCISP:
    case OP_DECIBP:
    case OP_INCIBP:
      parts.push(part("stackOffset", "Stack offset", file + cursor, code + cursor, 4, instruction.offset));
      break;
    case OP_JMP:
    case OP_JSR:
    case OP_JZ:
    case OP_JNZ:
      parts.push(part("relativeAddress", "Relative address", file + cursor, code + cursor, 4, instruction.offset));
      break;
    case OP_DESTRUCT:
      parts.push(part("sizeToDestroy", "Size to destroy", file + cursor, code + cursor, 2, instruction.sizeToDestroy));
      cursor += 2;
      parts.push(part("offsetToSaveElement", "Offset to save", file + cursor, code + cursor, 2, instruction.offsetToSaveElement));
      cursor += 2;
      parts.push(part("sizeOfElementToSave", "Size to save", file + cursor, code + cursor, 2, instruction.sizeOfElementToSave));
      break;
    case OP_STORE_STATE:
      parts.push(part("bpOffset", "BP offset", file + cursor, code + cursor, 4, instruction.bpOffset));
      cursor += 4;
      parts.push(part("spOffset", "SP offset", file + cursor, code + cursor, 4, instruction.spOffset));
      break;
  }

  return parts;
}

function inspectInstruction(instruction: NWScriptInstruction, headerSize: number): NcsInspectedInstruction {
  const actionName = instruction.actionDefinition?.name;
  const jumpTarget = isJumpOpcode(instruction.code) && instruction.offset != null
    ? instruction.address + instruction.offset
    : undefined;

  return {
    index: instruction.index,
    codeOffset: instruction.address,
    fileOffset: instruction.address + headerSize,
    size: instruction.instructionSize,
    opcode: instruction.code,
    aux: instruction.type,
    mnemonic: instruction.codeName || mnemonicFor(instruction.code),
    assembly: instruction.toAssemblyString(),
    parts: buildParts(instruction, headerSize),
    jumpTarget,
    actionId: instruction.code === OP_ACTION ? instruction.action : undefined,
    actionName,
    argCount: instruction.code === OP_ACTION ? instruction.argCount : undefined,
  };
}

function collectJsrFunctions(instructions: NcsInspectedInstruction[], headerSize: number): NcsFunctionEntry[] {
  const seen = new Map<number, NcsFunctionEntry>();
  for (const instr of instructions) {
    if (instr.opcode !== OP_JSR || instr.jumpTarget == null) {
      continue;
    }
    const codeOffset = instr.jumpTarget;
    if (seen.has(codeOffset)) {
      continue;
    }
    seen.set(codeOffset, {
      codeOffset,
      fileOffset: codeOffset + headerSize,
      name: `fn_${formatHex(codeOffset, 8)}`,
      kind: "jsr",
    });
  }
  return [...seen.values()].sort((a, b) => a.codeOffset - b.codeOffset);
}

function mergeRecoveredFunctions(
  jsrFunctions: NcsFunctionEntry[],
  recovered: ReadonlyArray<{ codeOffset: number; name: string }> | undefined,
  headerSize: number,
): NcsFunctionEntry[] {
  if (!recovered?.length) {
    return jsrFunctions;
  }
  const byOffset = new Map<number, NcsFunctionEntry>();
  for (const entry of jsrFunctions) {
    byOffset.set(entry.codeOffset, entry);
  }
  for (const fn of recovered) {
    byOffset.set(fn.codeOffset, {
      codeOffset: fn.codeOffset,
      fileOffset: fn.codeOffset + headerSize,
      name: fn.name,
      kind: "decompiled",
    });
  }
  return [...byOffset.values()].sort((a, b) => a.codeOffset - b.codeOffset);
}

function parseInstructionsTolerant(
  bytes: Uint8Array,
  header: NcsInspectionHeader,
  actionsMap?: { [key: number]: INWScriptDefAction },
): { instructions: Map<number, NWScriptInstruction>; inspectError?: string; code: Uint8Array } {
  const reader = new BinaryReader(bytes, Endians.BIG);
  let codeReader: BinaryReader;
  let progSize: number;
  let code: Uint8Array;

  if (header.hasHeader) {
    if (bytes.length < NCS_HEADER_SIZE) {
      return { instructions: new Map(), code: bytes, inspectError: "Truncated NCS header" };
    }
    if (header.programType != null && header.programType !== OP_T) {
      return {
        instructions: new Map(),
        code: bytes,
        inspectError: `Invalid program type, expected OP_T (0x42) but got ${header.programType}`,
      };
    }
    const declaredEnd = header.declaredSize && header.declaredSize > NCS_HEADER_SIZE
      ? header.declaredSize
      : bytes.length;
    const end = Math.min(bytes.length, declaredEnd);
    codeReader = reader.slice(NCS_HEADER_SIZE, end);
    code = codeReader.buffer;
    progSize = codeReader.buffer.length;
  } else {
    codeReader = reader;
    code = bytes;
    progSize = bytes.length;
  }

  const instructions = new Map<number, NWScriptInstruction>();
  let last: NWScriptInstruction | null = null;
  let instrIdx = 0;
  while (codeReader.position < progSize) {
    const start = codeReader.position;
    const remaining = progSize - start;
    if (remaining < 1) {
      break;
    }
    try {
      last = parseNcsInstruction(codeReader, last, instrIdx, actionsMap);
      const expected = expectedInstructionSize(last);
      if (last.instructionSize < expected || last.instructionSize > remaining) {
        return { instructions, code, inspectError: `Truncated instruction at code offset 0x${formatHex(start, 8)}` };
      }
      instructions.set(last.address, last);
      instrIdx++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { instructions, code, inspectError: `Decode error at code offset 0x${formatHex(start, 8)}: ${msg}` };
    }
  }

  return { instructions, code };
}

/**
 * Inspect NCS bytes using the engine decoder. Truncated files keep instructions
 * that decoded successfully and set {@link NcsInspection.inspectError}.
 */
export function inspectNcs(bytes: Uint8Array, options: InspectNcsOptions = {}): NcsInspection {
  const header = parseNcsHeader(bytes);
  const script = options.script;
  const parsed = parseInstructionsTolerant(bytes, header, options.actionsMap ?? script?.actionsMap);
  const inspectError = parsed.inspectError;
  const parsedInstructions = [...parsed.instructions.values()];

  const instructions = parsedInstructions
    .sort((a, b) => a.address - b.address)
    .map((instr) => inspectInstruction(instr, header.headerSize));

  const functions = mergeRecoveredFunctions(
    collectJsrFunctions(instructions, header.headerSize),
    options.recoveredFunctions,
    header.headerSize,
  );

  return {
    fileBytes: bytes,
    header,
    instructions,
    functions,
    inspectError,
    script,
  };
}

export function instructionAtFileOffset(
  inspection: NcsInspection,
  fileOffset: number,
): NcsInspectedInstruction | undefined {
  return inspection.instructions.find(
    (instr) => fileOffset >= instr.fileOffset && fileOffset < instr.fileOffset + instr.size,
  );
}

export function instructionAtCodeOffset(
  inspection: NcsInspection,
  codeOffset: number,
): NcsInspectedInstruction | undefined {
  return inspection.instructions.find((instr) => instr.codeOffset === codeOffset)
    ?? inspection.instructions.find(
      (instr) => codeOffset >= instr.codeOffset && codeOffset < instr.codeOffset + instr.size,
    );
}

export function partAtFileOffset(
  instruction: NcsInspectedInstruction,
  fileOffset: number,
): NcsInstructionPart | undefined {
  return instruction.parts.find(
    (item) => fileOffset >= item.fileOffset && fileOffset < item.fileOffset + Math.max(item.size, 1),
  );
}

export function formatNcsDisassembly(inspection: NcsInspection): string {
  const lines: string[] = [];
  if (inspection.header.hasHeader) {
    lines.push(`; ${inspection.header.magic}`);
    lines.push(`; headerSize=${inspection.header.headerSize} declaredSize=${inspection.header.declaredSize ?? "?"}`);
  } else {
    lines.push("; NCS code (no file header / ScriptSituation)");
  }
  if (inspection.inspectError) {
    lines.push(`; inspectError: ${inspection.inspectError}`);
  }
  lines.push("");
  for (const instr of inspection.instructions) {
    lines.push(instr.assembly);
  }
  return lines.join("\n");
}

function tokenizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function parseByteSequence(query: string): number[] | undefined {
  const hex = query.replace(/[#$\s]/g, "");
  if (!hex.length || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    return undefined;
  }
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes.length ? bytes : undefined;
}

function parseOffsetQuery(query: string): number | undefined {
  const trimmed = query.trim();
  if (!trimmed.length) {
    return undefined;
  }
  if (/^0x[0-9a-f]+$/i.test(trimmed) || /^\$[0-9a-f]+$/i.test(trimmed)) {
    return parseInt(trimmed.replace("$", "0x"), 16);
  }
  if (/^[0-9a-f]{2,8}$/i.test(trimmed) && /[a-f]/i.test(trimmed)) {
    return parseInt(trimmed, 16);
  }
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  return undefined;
}

export function searchNcsInstructions(inspection: NcsInspection, rawQuery: string): number[] {
  const query = tokenizeSearchQuery(rawQuery);
  if (!query) {
    return [];
  }

  const offset = parseOffsetQuery(rawQuery);
  const bytes = parseByteSequence(rawQuery);
  const matches: number[] = [];

  for (const instr of inspection.instructions) {
    let hit = false;
    if (offset != null) {
      hit = instr.codeOffset === offset
        || instr.fileOffset === offset
        || instr.jumpTarget === offset;
    }
    if (!hit && bytes?.length) {
      const slice = inspection.fileBytes.subarray(instr.fileOffset, instr.fileOffset + instr.size);
      if (slice.length >= bytes.length) {
        for (let i = 0; i <= slice.length - bytes.length; i++) {
          let ok = true;
          for (let j = 0; j < bytes.length; j++) {
            if (slice[i + j] !== bytes[j]) {
              ok = false;
              break;
            }
          }
          if (ok) {
            hit = true;
            break;
          }
        }
      }
    }
    if (!hit) {
      hit = instr.mnemonic.toLowerCase().includes(query)
        || (instr.actionName?.toLowerCase().includes(query) ?? false)
        || instr.assembly.toLowerCase().includes(query)
        || (isJumpOpcode(instr.opcode) && instr.jumpTarget != null && (
          `off_${formatHex(instr.jumpTarget, 8)}`.toLowerCase().includes(query)
          || `fn_${formatHex(instr.jumpTarget, 8)}`.toLowerCase().includes(query)
        ));
    }
    if (hit) {
      matches.push(instr.index);
    }
  }

  return matches;
}

export function isJumpPart(kind: NcsPartKind): boolean {
  return kind === "relativeAddress";
}

export function isStackOperandPart(kind: NcsPartKind): boolean {
  return kind === "stackOffset" || isJumpPart(kind);
}