/**
 * Convert retail-style typed GFF JSON dumps ({ type, value } wrappers) into GFFStruct/GFFObject.
 * Research/test helper only — not part of module authoring import/export (binary IFO/ARE/GIT).
 * Do not use this for Forge Project save/load/new module; those paths stay binary GFF.
 * Distinct from gffJsonCodec (editor clipboard document shape).
 *
 * @file exportTypedGffJson.ts
 */

import { GFFDataType } from "@/enums/resource/GFFDataType";
import { CExoLocString } from "@/resource/CExoLocString";
import { CExoLocSubString } from "@/resource/CExoLocSubString";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";

type TypedNode = { type: string; value: unknown };

const TYPE_MAP: Record<string, GFFDataType> = {
  byte: GFFDataType.BYTE,
  char: GFFDataType.CHAR,
  word: GFFDataType.WORD,
  short: GFFDataType.SHORT,
  dword: GFFDataType.DWORD,
  int: GFFDataType.INT,
  dword64: GFFDataType.DWORD64,
  int64: GFFDataType.INT64,
  float: GFFDataType.FLOAT,
  double: GFFDataType.DOUBLE,
  cexostring: GFFDataType.CEXOSTRING,
  resref: GFFDataType.RESREF,
  cexolocstring: GFFDataType.CEXOLOCSTRING,
  void: GFFDataType.VOID,
  struct: GFFDataType.STRUCT,
  list: GFFDataType.LIST,
  orientation: GFFDataType.ORIENTATION,
  vector: GFFDataType.VECTOR,
};

function isTypedNode(v: unknown): v is TypedNode {
  return !!v && typeof v === "object" && "type" in (v as object) && "value" in (v as object);
}

function locFromExportValue(value: unknown): CExoLocString {
  const loc = new CExoLocString(-1);
  if(!value || typeof value !== "object"){
    return loc;
  }
  const obj = value as { id?: number; strings?: Array<{ language?: number; gender?: number; str?: string }> };
  if(typeof obj.id === "number"){
    loc.RESREF = obj.id;
  }
  const strings = obj.strings || [];
  for(let i = 0; i < strings.length; i++){
    const s = strings[i];
    loc.addSubString(new CExoLocSubString(s.language ?? 0, s.str ?? ""), i);
  }
  return loc;
}

function addFieldFromTyped(struct: GFFStruct, label: string, node: TypedNode): void {
  const typeKey = String(node.type || "").toLowerCase();
  const gffType = TYPE_MAP[typeKey];
  if(gffType === undefined){
    return;
  }

  if(gffType === GFFDataType.LIST){
    const field = struct.addField(new GFFField(GFFDataType.LIST, label))!;
    const items = Array.isArray(node.value) ? node.value : [];
    for(let i = 0; i < items.length; i++){
      field.addChildStruct(structFromExportObject(items[i] as Record<string, unknown>));
    }
    return;
  }

  if(gffType === GFFDataType.STRUCT){
    const field = struct.addField(new GFFField(GFFDataType.STRUCT, label))!;
    field.addChildStruct(structFromExportObject(node.value as Record<string, unknown>));
    return;
  }

  if(gffType === GFFDataType.CEXOLOCSTRING){
    const field = struct.addField(new GFFField(GFFDataType.CEXOLOCSTRING, label))!;
    field.setCExoLocString(locFromExportValue(node.value));
    return;
  }

  if(gffType === GFFDataType.VECTOR){
    const v = (node.value || { x: 0, y: 0, z: 0 }) as { x: number; y: number; z: number };
    const field = struct.addField(new GFFField(GFFDataType.VECTOR, label))!;
    field.setVector({ x: v.x || 0, y: v.y || 0, z: v.z || 0 });
    return;
  }

  if(gffType === GFFDataType.ORIENTATION){
    const v = (node.value || { x: 0, y: 0, z: 0, w: 1 }) as { x: number; y: number; z: number; w: number };
    const field = struct.addField(new GFFField(GFFDataType.ORIENTATION, label))!;
    field.setOrientation({ x: v.x || 0, y: v.y || 0, z: v.z || 0, w: v.w ?? 1 });
    return;
  }

  struct.addField(new GFFField(gffType, label, node.value as never));
}

/** Build a GFFStruct from one object in a retail typed JSON dump. */
export function structFromExportObject(obj: Record<string, unknown>): GFFStruct {
  const typeId = typeof obj.__struct_id === "number" ? obj.__struct_id : 0;
  const struct = new GFFStruct(typeId);
  for(const [key, value] of Object.entries(obj)){
    if(key.startsWith("__")){
      continue;
    }
    if(isTypedNode(value)){
      addFieldFromTyped(struct, key, value);
    }
  }
  return struct;
}

/** Build a GFFObject whose RootNode is the typed JSON root document. */
export function gffObjectFromExportJson(root: Record<string, unknown>, fileType = "GFF "): GFFObject {
  const gff = new GFFObject();
  gff.FileType = fileType;
  gff.RootNode = structFromExportObject(root);
  return gff;
}

/** Unwrap `{ type, value }` to a plain JS value (lists/structs stay nested objects). */
export function unwrapExportValue(node: unknown): unknown {
  if(!isTypedNode(node)){
    return node;
  }
  if(node.type === "list" && Array.isArray(node.value)){
    return node.value.map((item) => unwrapExportStruct(item as Record<string, unknown>));
  }
  if(node.type === "struct" && node.value && typeof node.value === "object"){
    return unwrapExportStruct(node.value as Record<string, unknown>);
  }
  return node.value;
}

export function unwrapExportStruct(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for(const [key, value] of Object.entries(obj)){
    if(key.startsWith("__")){
      continue;
    }
    out[key] = unwrapExportValue(value);
  }
  return out;
}
