import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { NWScriptTypes } from "@/enums/nwscript/NWScriptTypes";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";
import {
  OP_ADD,
  OP_DIV,
  OP_EQUAL,
  OP_GEQ,
  OP_GT,
  OP_LEQ,
  OP_LT,
  OP_MODII,
  OP_MUL,
  OP_NEQUAL,
  OP_SUB,
} from "@/nwscript/NWScriptOPCodes";

/**
 * Canonical stack/type facts used by NCS analysis.
 *
 * Keep bytecode-width knowledge here instead of duplicating partial switch statements in
 * the stack simulator, expression recovery, and call-site analysis.
 */

export interface NWScriptBinaryTypeSignature {
  left: NWScriptDataType;
  right: NWScriptDataType;
  result: NWScriptDataType;
}

const BINARY_TYPE_SIGNATURES = new Map<number, NWScriptBinaryTypeSignature>([
  [NWScriptTypes.II, { left: NWScriptDataType.INTEGER, right: NWScriptDataType.INTEGER, result: NWScriptDataType.INTEGER }],
  [NWScriptTypes.FF, { left: NWScriptDataType.FLOAT, right: NWScriptDataType.FLOAT, result: NWScriptDataType.FLOAT }],
  [NWScriptTypes.OO, { left: NWScriptDataType.OBJECT, right: NWScriptDataType.OBJECT, result: NWScriptDataType.OBJECT }],
  [NWScriptTypes.SS, { left: NWScriptDataType.STRING, right: NWScriptDataType.STRING, result: NWScriptDataType.STRING }],
  [NWScriptTypes.TT, { left: NWScriptDataType.STRUCTURE, right: NWScriptDataType.STRUCTURE, result: NWScriptDataType.STRUCTURE }],
  [NWScriptTypes.IF, { left: NWScriptDataType.INTEGER, right: NWScriptDataType.FLOAT, result: NWScriptDataType.FLOAT }],
  [NWScriptTypes.FI, { left: NWScriptDataType.FLOAT, right: NWScriptDataType.INTEGER, result: NWScriptDataType.FLOAT }],
  [NWScriptTypes.EFEF, { left: NWScriptDataType.EFFECT, right: NWScriptDataType.EFFECT, result: NWScriptDataType.EFFECT }],
  [NWScriptTypes.EVEV, { left: NWScriptDataType.EVENT, right: NWScriptDataType.EVENT, result: NWScriptDataType.EVENT }],
  [NWScriptTypes.LOCLOC, { left: NWScriptDataType.LOCATION, right: NWScriptDataType.LOCATION, result: NWScriptDataType.LOCATION }],
  [NWScriptTypes.TALTAL, { left: NWScriptDataType.TALENT, right: NWScriptDataType.TALENT, result: NWScriptDataType.TALENT }],
  [NWScriptTypes.VV, { left: NWScriptDataType.VECTOR, right: NWScriptDataType.VECTOR, result: NWScriptDataType.VECTOR }],
  [NWScriptTypes.VF, { left: NWScriptDataType.VECTOR, right: NWScriptDataType.FLOAT, result: NWScriptDataType.VECTOR }],
  [NWScriptTypes.FV, { left: NWScriptDataType.FLOAT, right: NWScriptDataType.VECTOR, result: NWScriptDataType.VECTOR }],
]);

const ARITHMETIC_TYPES_BY_OPCODE = new Map<number, Set<number>>([
  [OP_ADD, new Set([NWScriptTypes.II, NWScriptTypes.IF, NWScriptTypes.FI, NWScriptTypes.FF, NWScriptTypes.SS, NWScriptTypes.VV])],
  [OP_SUB, new Set([NWScriptTypes.II, NWScriptTypes.IF, NWScriptTypes.FI, NWScriptTypes.FF, NWScriptTypes.VV])],
  [OP_MUL, new Set([NWScriptTypes.II, NWScriptTypes.IF, NWScriptTypes.FI, NWScriptTypes.FF, NWScriptTypes.VF, NWScriptTypes.FV])],
  [OP_DIV, new Set([NWScriptTypes.II, NWScriptTypes.IF, NWScriptTypes.FI, NWScriptTypes.FF, NWScriptTypes.VF])],
  [OP_MODII, new Set([NWScriptTypes.II])],
]);

const EQUALITY_TYPES = new Set([
  NWScriptTypes.II,
  NWScriptTypes.FF,
  NWScriptTypes.OO,
  NWScriptTypes.SS,
  NWScriptTypes.TT,
  NWScriptTypes.EFEF,
  NWScriptTypes.EVEV,
  NWScriptTypes.LOCLOC,
  NWScriptTypes.TALTAL,
]);
const ORDERED_COMPARISON_TYPES = new Set([NWScriptTypes.II, NWScriptTypes.FF]);

export function toSignedInt32(value: number | undefined): number {
  const raw = value ?? 0;
  return raw > 0x7fffffff ? raw - 0x100000000 : raw;
}

/** Decode the one-byte scalar/engine-value type used by CONST, RSADD, and frame accesses. */
export function getUnaryDataType(typeCode: number | undefined): NWScriptDataType | null {
  switch (typeCode) {
    case NWScriptDataType.INTEGER:
    case NWScriptDataType.FLOAT:
    case NWScriptDataType.STRING:
    case NWScriptDataType.OBJECT:
    case NWScriptDataType.EFFECT:
    case NWScriptDataType.EVENT:
    case NWScriptDataType.LOCATION:
    case NWScriptDataType.TALENT:
    case NWScriptDataType.VECTOR:
    case NWScriptDataType.STRUCTURE:
      return typeCode;
    default:
      return null;
  }
}

export function stackSlotsForDataType(dataType: NWScriptDataType | undefined): number {
  switch (dataType) {
    case undefined:
    case NWScriptDataType.VOID:
    case NWScriptDataType.ACTION:
      return 0;
    case NWScriptDataType.VECTOR:
      return 3;
    default:
      return 1;
  }
}

export function stackBytesForDataType(dataType: NWScriptDataType | undefined): number {
  return stackSlotsForDataType(dataType) * 4;
}

export function stackSlotsForByteSize(size: number | undefined, instructionName: string): number {
  if (size === undefined) {
    throw new Error(`${instructionName} is missing its stack byte size`);
  }
  const bytes = size;
  if (bytes < 0 || bytes % 4 !== 0) {
    throw new Error(`${instructionName} requires a non-negative four-byte-aligned size, received ${bytes}`);
  }
  return bytes / 4;
}

export function getBinaryTypeSignature(typeCode: number | undefined): NWScriptBinaryTypeSignature | null {
  return BINARY_TYPE_SIGNATURES.get(typeCode ?? -1) ?? null;
}

export function getArithmeticTypeSignature(
  opcode: number,
  typeCode: number | undefined
): NWScriptBinaryTypeSignature | null {
  if (!ARITHMETIC_TYPES_BY_OPCODE.get(opcode)?.has(typeCode ?? -1)) {
    return null;
  }
  return getBinaryTypeSignature(typeCode);
}

export function getComparisonTypeSignature(
  opcode: number,
  typeCode: number | undefined
): NWScriptBinaryTypeSignature | null {
  const allowed = opcode === OP_EQUAL || opcode === OP_NEQUAL
    ? EQUALITY_TYPES
    : opcode === OP_GEQ || opcode === OP_GT || opcode === OP_LT || opcode === OP_LEQ
      ? ORDERED_COMPARISON_TYPES
      : null;
  if (!allowed?.has(typeCode ?? -1)) {
    return null;
  }
  return getBinaryTypeSignature(typeCode);
}

export function getBinaryResultDataType(typeCode: number | undefined): NWScriptDataType {
  const signature = getBinaryTypeSignature(typeCode);
  if (!signature) {
    throw new Error(`Unsupported NCS binary type code 0x${(typeCode ?? 0).toString(16).padStart(2, "0")}`);
  }
  return signature.result;
}

export function actionArgumentStackSlots(action: INWScriptDefAction | undefined, argCount: number): number | null {
  if (!action) {
    return null;
  }

  if (!Number.isInteger(argCount) || argCount < 0 || argCount > action.args.length) {
    return null;
  }
  let slots = 0;
  for (let i = 0; i < argCount; i++) {
    slots += stackSlotsForDataType(action.args[i]);
  }
  return slots;
}
