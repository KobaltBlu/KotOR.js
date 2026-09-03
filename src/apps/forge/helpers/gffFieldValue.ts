/**
 * GFF field value formatting, clamping, and 64-bit / VOID helpers for the editor.
 *
 * @file gffFieldValue.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { CExoLocString } from "@/resource/CExoLocString";

export const GFF_LABEL_MAX = 16;
export const GFF_RESREF_MAX = 16;

export const GFF_INTEGER_BOUNDS: Partial<Record<GFFDataType, { min: number; max: number }>> = {
  [GFFDataType.BYTE]: { min: 0, max: 255 },
  [GFFDataType.WORD]: { min: 0, max: 65535 },
  [GFFDataType.SHORT]: { min: -32768, max: 32767 },
  [GFFDataType.DWORD]: { min: 0, max: 4294967295 },
  [GFFDataType.INT]: { min: -2147483648, max: 2147483647 },
};

export function clampGffLabel(label: string): string {
  return String(label || "").slice(0, GFF_LABEL_MAX);
}

export function clampGffResRef(value: string): string {
  return String(value || "").slice(0, GFF_RESREF_MAX);
}

export function parseOptionalNumber(text: string): number | undefined {
  const trimmed = String(text ?? "").trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return undefined;
  }
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  return n;
}

export function parseOptionalInteger(text: string): number | undefined {
  const n = parseOptionalNumber(text);
  if (n === undefined) {
    return undefined;
  }
  if (!Number.isInteger(n)) {
    return Math.trunc(n);
  }
  return n;
}

export function clampInteger(type: GFFDataType, value: number): number {
  const bounds = GFF_INTEGER_BOUNDS[type];
  if (!bounds) {
    return value;
  }
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

export function bytesToHex(bytes?: Uint8Array): string {
  if (!bytes || !bytes.length) {
    return "";
  }
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

export function hexToBytes(hex: string): Uint8Array | undefined {
  const compact = String(hex || "").replace(/\s+/g, "");
  if (compact === "") {
    return new Uint8Array(0);
  }
  if (compact.length % 2 !== 0 || /[^0-9a-fA-F]/.test(compact)) {
    return undefined;
  }
  const out = new Uint8Array(compact.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(compact.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function fieldDataView(field: GFFField): DataView | undefined {
  if (!field.data || field.data.length < 8) {
    return undefined;
  }
  return new DataView(field.data.buffer, field.data.byteOffset, field.data.byteLength);
}

export function getDword64Value(field: GFFField): bigint {
  const view = fieldDataView(field);
  if (view) {
    return view.getBigUint64(0, true);
  }
  try {
    const value = field.getValue();
    if (typeof value === "bigint") {
      return value;
    }
  } catch {
    /* empty data */
  }
  return 0n;
}

export function getInt64Value(field: GFFField): bigint {
  const view = fieldDataView(field);
  if (view) {
    return view.getBigInt64(0, true);
  }
  const value = field.value;
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === "string" && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }
  return 0n;
}

export function setDword64Value(field: GFFField, value: bigint): void {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigUint64(0, value, true);
  field.setData(buf);
  field.value = value;
}

export function setInt64Value(field: GFFField, value: bigint): void {
  const buf = new Uint8Array(8);
  new DataView(buf.buffer).setBigInt64(0, value, true);
  field.setData(buf);
  field.value = value;
}

export function parseOptionalBigInt(text: string): bigint | undefined {
  const trimmed = String(text ?? "").trim();
  if (trimmed === "" || trimmed === "-") {
    return undefined;
  }
  if (!/^-?\d+$/.test(trimmed)) {
    return undefined;
  }
  try {
    return BigInt(trimmed);
  } catch {
    return undefined;
  }
}

export function gffTypeName(type: number): string {
  return GFFObject.TypeValueToString(type) || String(type);
}

export function fieldPreview(field: GFFField): string {
  switch (field.getType()) {
    case GFFDataType.BYTE:
    case GFFDataType.WORD:
    case GFFDataType.SHORT:
    case GFFDataType.DWORD:
    case GFFDataType.INT:
    case GFFDataType.FLOAT:
    case GFFDataType.DOUBLE:
    case GFFDataType.RESREF:
    case GFFDataType.CEXOSTRING:
      return String(field.getValue() ?? "");
    case GFFDataType.CHAR: {
      const value = field.getValue();
      if (typeof value === "string") {
        return value;
      }
      return String(value ?? "");
    }
    case GFFDataType.DWORD64:
      return getDword64Value(field).toString();
    case GFFDataType.INT64:
      return getInt64Value(field).toString();
    case GFFDataType.CEXOLOCSTRING: {
      const loc = field.getCExoLocString();
      if (!loc) {
        return "";
      }
      const text = loc.getValue();
      if (text) {
        return text;
      }
      if (loc.getRESREF() > -1) {
        return `StrRef ${loc.getRESREF()}`;
      }
      return "";
    }
    case GFFDataType.LIST:
      return `${field.getChildStructs().length}`;
    case GFFDataType.VECTOR: {
      const v = field.getVector() || { x: 0, y: 0, z: 0 };
      return `${v.x}, ${v.y}, ${v.z}`;
    }
    case GFFDataType.ORIENTATION: {
      const o = field.getOrientation() || { x: 0, y: 0, z: 0, w: 1 };
      return `${o.x}, ${o.y}, ${o.z}, ${o.w}`;
    }
    case GFFDataType.VOID:
      return `${(field.getVoid() || field.data || new Uint8Array(0)).length} bytes`;
    default:
      return "";
  }
}

const STRUCT_TITLE_LABELS = [
  "Tag",
  "TemplateResRef",
  "ResRef",
  "FirstName",
  "LocalizedName",
  "Name",
];

export function structListTitle(struct: { getType(): number; getFieldByLabel(label: string): GFFField | null }, index?: number): string {
  for (let i = 0; i < STRUCT_TITLE_LABELS.length; i++) {
    const field = struct.getFieldByLabel(STRUCT_TITLE_LABELS[i]);
    if (field && typeof field.getType === "function") {
      const preview = fieldPreview(field).trim();
      if (preview) {
        return index === undefined ? preview : `[${index}] ${preview}`;
      }
    }
  }
  const id = struct.getType();
  return index === undefined ? `Struct ID ${id}` : `[${index}] Struct ID ${id}`;
}

export function locStringPreview(loc?: CExoLocString): string {
  if (!loc) {
    return "";
  }
  return loc.getValue() || (loc.getRESREF() > -1 ? `StrRef ${loc.getRESREF()}` : "");
}
