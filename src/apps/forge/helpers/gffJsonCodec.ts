/**
 * JSON-safe GFF document and clipboard codec for the generic GFF editor.
 *
 * @file gffJsonCodec.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFDataType } from "@/enums/resource/GFFDataType";
import { CExoLocString } from "@/resource/CExoLocString";
import { CExoLocSubString } from "@/resource/CExoLocSubString";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";
import {
  bytesToHex,
  clampGffLabel,
  getDword64Value,
  getInt64Value,
  hexToBytes,
  setDword64Value,
  setInt64Value,
} from "@/apps/forge/helpers/gffFieldValue";

export interface GffSerializedLocString {
  resref: number;
  strings: Array<{ language: number; gender: number; str: string }>;
}

export interface GffSerializedField {
  label: string;
  type: number;
  value?: unknown;
  structs?: GffSerializedStruct[];
}

export interface GffSerializedStruct {
  type: number;
  fields: GffSerializedField[];
}

export interface GffDocumentJson {
  fileType: string;
  fileVersion: string;
  root: GffSerializedStruct;
}

export type GffClipboardPayload =
  | { kind: "field"; field: GffSerializedField }
  | { kind: "struct"; struct: GffSerializedStruct };

export const GFF_CLIPBOARD_MIME = "application/x-kotor-gff-node";

let memoryClipboard: GffClipboardPayload | null = null;

export function setGffMemoryClipboard(payload: GffClipboardPayload | null): void {
  memoryClipboard = payload;
}

export function getGffMemoryClipboard(): GffClipboardPayload | null {
  return memoryClipboard;
}

export function serializeLocString(loc: CExoLocString | undefined): GffSerializedLocString {
  const strings = loc?.getStrings() || [];
  return {
    resref: loc?.getRESREF() ?? -1,
    strings: strings.map((sub) => ({
      language: sub.language,
      gender: sub.gender,
      str: sub.str,
    })),
  };
}

export function locStringFromSerialized(data: GffSerializedLocString | undefined): CExoLocString {
  const loc = new CExoLocString(data?.resref ?? -1);
  const strings = data?.strings || [];
  for (let i = 0; i < strings.length; i++) {
    const sub = strings[i];
    const stringId = (Number(sub.language) || 0) * 2 + (Number(sub.gender) || 0);
    loc.addSubString(new CExoLocSubString(stringId, String(sub.str || "")), i);
  }
  return loc;
}

function serializeFieldValue(field: GFFField): unknown {
  switch (field.getType()) {
    case GFFDataType.VOID:
      return bytesToHex(field.getVoid() || field.data || new Uint8Array(0));
    case GFFDataType.DWORD64:
      return getDword64Value(field).toString();
    case GFFDataType.INT64:
      return getInt64Value(field).toString();
    case GFFDataType.CEXOLOCSTRING:
      return serializeLocString(field.getCExoLocString());
    case GFFDataType.VECTOR:
      return { ...(field.getVector() || { x: 0, y: 0, z: 0 }) };
    case GFFDataType.ORIENTATION:
      return { ...(field.getOrientation() || { x: 0, y: 0, z: 0, w: 1 }) };
    case GFFDataType.LIST:
    case GFFDataType.STRUCT:
      return null;
    default:
      return field.getValue();
  }
}

export function serializeGffField(field: GFFField): GffSerializedField {
  const children = field.getChildStructs();
  const serialized: GffSerializedField = {
    label: field.getLabel(),
    type: field.getType(),
    value: serializeFieldValue(field),
  };
  if (children.length) {
    serialized.structs = children.map((child) => serializeGffStruct(child));
  }
  return serialized;
}

export function serializeGffStruct(struct: GFFStruct): GffSerializedStruct {
  return {
    type: struct.getType(),
    fields: struct.getFields().map((field) => serializeGffField(field)),
  };
}

export function gffToDocumentJson(gff: GFFObject): GffDocumentJson {
  return {
    fileType: gff.FileType || "GFF ",
    fileVersion: gff.FileVersion || "V3.2",
    root: serializeGffStruct(gff.RootNode),
  };
}

export function createDefaultField(type: number, label = "NewField"): GFFField {
  const field = new GFFField(type, clampGffLabel(label));
  switch (type) {
    case GFFDataType.BYTE:
    case GFFDataType.WORD:
    case GFFDataType.SHORT:
    case GFFDataType.DWORD:
    case GFFDataType.INT:
    case GFFDataType.FLOAT:
    case GFFDataType.DOUBLE:
      field.setValue(0);
      break;
    case GFFDataType.CHAR:
      field.setValue("\0");
      break;
    case GFFDataType.RESREF:
    case GFFDataType.CEXOSTRING:
      field.setValue("");
      break;
    case GFFDataType.DWORD64:
      setDword64Value(field, 0n);
      break;
    case GFFDataType.INT64:
      setInt64Value(field, 0n);
      break;
    case GFFDataType.VOID:
      field.setData(new Uint8Array(0));
      break;
    case GFFDataType.VECTOR:
      field.setVector({ x: 0, y: 0, z: 0 });
      break;
    case GFFDataType.ORIENTATION:
      field.setOrientation({ x: 0, y: 0, z: 0, w: 1 });
      break;
    case GFFDataType.CEXOLOCSTRING:
      field.setCExoLocString(new CExoLocString(-1));
      break;
    default:
      break;
  }
  return field;
}

function applySerializedValue(field: GFFField, value: unknown): void {
  switch (field.getType()) {
    case GFFDataType.VOID: {
      const bytes = hexToBytes(typeof value === "string" ? value : "");
      field.setData(bytes || new Uint8Array(0));
      break;
    }
    case GFFDataType.DWORD64:
      setDword64Value(field, typeof value === "string" || typeof value === "bigint" ? BigInt(value as string | bigint) : 0n);
      break;
    case GFFDataType.INT64:
      setInt64Value(field, typeof value === "string" || typeof value === "bigint" ? BigInt(value as string | bigint) : 0n);
      break;
    case GFFDataType.CEXOLOCSTRING:
      field.setCExoLocString(locStringFromSerialized(value as GffSerializedLocString));
      break;
    case GFFDataType.VECTOR: {
      const v = (value || {}) as { x?: number; y?: number; z?: number };
      field.setVector({ x: Number(v.x) || 0, y: Number(v.y) || 0, z: Number(v.z) || 0 });
      break;
    }
    case GFFDataType.ORIENTATION: {
      const o = (value || {}) as { x?: number; y?: number; z?: number; w?: number };
      field.setOrientation({
        x: Number(o.x) || 0,
        y: Number(o.y) || 0,
        z: Number(o.z) || 0,
        w: o.w === undefined ? 1 : Number(o.w) || 0,
      });
      break;
    }
    case GFFDataType.LIST:
    case GFFDataType.STRUCT:
      break;
    default:
      if (value !== undefined && value !== null) {
        field.setValue(value);
      }
      break;
  }
}

export function fieldFromSerialized(data: GffSerializedField): GFFField {
  const field = createDefaultField(Number(data.type), data.label);
  applySerializedValue(field, data.value);
  const structs = data.structs || [];
  if (field.getType() === GFFDataType.LIST) {
    field.setChildStructs(structs.map((child) => structFromSerialized(child)));
  } else if (field.getType() === GFFDataType.STRUCT) {
    field.setChildStructs(structs.length ? [structFromSerialized(structs[0])] : [new GFFStruct()]);
  }
  return field;
}

export function structFromSerialized(data: GffSerializedStruct): GFFStruct {
  const struct = new GFFStruct(Number(data.type) || 0);
  const fields = data.fields || [];
  for (let i = 0; i < fields.length; i++) {
    struct.addField(fieldFromSerialized(fields[i]));
  }
  return struct;
}

export function gffFromDocumentJson(doc: GffDocumentJson): GFFObject {
  const gff = new GFFObject();
  gff.FileType = String(doc.fileType || "GFF ").slice(0, 4).padEnd(4, " ");
  gff.FileVersion = String(doc.fileVersion || "V3.2").slice(0, 4);
  gff.RootNode = structFromSerialized(doc.root || { type: -1, fields: [] });
  return gff;
}

export function parseGffDocumentJson(text: string): GffDocumentJson {
  const parsed = JSON.parse(text) as GffDocumentJson;
  if (!parsed || typeof parsed !== "object" || !parsed.root) {
    throw new Error("Not a GFF JSON document");
  }
  return parsed;
}

export function parseGffClipboardPayload(text: string): GffClipboardPayload | undefined {
  try {
    const parsed = JSON.parse(text) as GffClipboardPayload & { mime?: string };
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    if (parsed.kind === "field" && parsed.field && typeof parsed.field.type === "number") {
      return { kind: "field", field: parsed.field };
    }
    if (parsed.kind === "struct" && parsed.struct && typeof parsed.struct.type === "number") {
      return { kind: "struct", struct: parsed.struct };
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function clipboardToJson(payload: GffClipboardPayload): string {
  return JSON.stringify({ mime: GFF_CLIPBOARD_MIME, ...payload }, null, 2);
}

const GFF_FIELD_TYPES: Array<{ label: string; type: GFFDataType }> = [
  { label: "BYTE", type: GFFDataType.BYTE },
  { label: "CHAR", type: GFFDataType.CHAR },
  { label: "WORD", type: GFFDataType.WORD },
  { label: "SHORT", type: GFFDataType.SHORT },
  { label: "DWORD", type: GFFDataType.DWORD },
  { label: "INT", type: GFFDataType.INT },
  { label: "DWORD64", type: GFFDataType.DWORD64 },
  { label: "INT64", type: GFFDataType.INT64 },
  { label: "FLOAT", type: GFFDataType.FLOAT },
  { label: "DOUBLE", type: GFFDataType.DOUBLE },
  { label: "CExoString", type: GFFDataType.CEXOSTRING },
  { label: "ResRef", type: GFFDataType.RESREF },
  { label: "CExoLocString", type: GFFDataType.CEXOLOCSTRING },
  { label: "VOID", type: GFFDataType.VOID },
  { label: "Struct", type: GFFDataType.STRUCT },
  { label: "List", type: GFFDataType.LIST },
  { label: "Orientation", type: GFFDataType.ORIENTATION },
  { label: "Vector", type: GFFDataType.VECTOR },
];

export function gffFieldTypeOptions(): Array<{ label: string; type: GFFDataType }> {
  return GFF_FIELD_TYPES.slice();
}

export function insertFieldAfter(parent: GFFStruct, field: GFFField, after?: GFFField): void {
  if (!after) {
    parent.addField(field);
    return;
  }
  const index = parent.getFields().indexOf(after);
  if (index < 0) {
    parent.addField(field);
    return;
  }
  parent.getFields().splice(index + 1, 0, field);
}

export function insertChildStructAfter(listField: GFFField, struct: GFFStruct, after?: GFFStruct): void {
  const children = listField.getChildStructs();
  if (!after) {
    listField.addChildStruct(struct);
    return;
  }
  const index = children.indexOf(after);
  if (index < 0) {
    listField.addChildStruct(struct);
    return;
  }
  children.splice(index + 1, 0, struct);
}

export function replaceFieldKeepingLabel(parent: GFFStruct, oldField: GFFField, type: number): GFFField {
  const next = createDefaultField(type, oldField.getLabel());
  const fields = parent.getFields();
  const index = fields.indexOf(oldField);
  if (index < 0) {
    parent.addField(next);
  } else {
    fields[index] = next;
  }
  return next;
}

export function uniqueCopyLabel(label: string): string {
  const base = clampGffLabel(label || "NewField");
  const suffix = "2";
  if (base.length + suffix.length <= 16) {
    return base + suffix;
  }
  return clampGffLabel(base.slice(0, 16 - suffix.length) + suffix);
}

export function uniqueFieldLabel(parent: GFFStruct, base = "NewField"): string {
  const start = clampGffLabel(base || "NewField");
  if (!parent.hasField(start)) {
    return start;
  }
  for (let n = 2; n < 1000; n++) {
    const suffix = String(n);
    const label = clampGffLabel(start.slice(0, Math.max(1, 16 - suffix.length)) + suffix);
    if (!parent.hasField(label)) {
      return label;
    }
  }
  return clampGffLabel(start);
}
