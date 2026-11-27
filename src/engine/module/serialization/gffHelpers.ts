import { GFFDataType } from '@core/enums/resource/GFFDataType';
import { GFFField } from '@core/resource/GFFField';
import { CExoLocString } from '@core/resource/CExoLocString';
import type { GffRoot } from '@engine/module/serialization/types';

export function readByte(root: GffRoot, label: string, fallback = 0): number {
  if (!root.hasField(label)) return fallback;
  return root.getFieldByLabel(label).getValue() | 0;
}

export function readInt(root: GffRoot, label: string, fallback = 0): number {
  if (!root.hasField(label)) return fallback;
  return root.getFieldByLabel(label).getValue() | 0;
}

export function readDword(root: GffRoot, label: string, fallback = 0): number {
  if (!root.hasField(label)) return fallback;
  return root.getFieldByLabel(label).getValue() >>> 0;
}

export function readWord(root: GffRoot, label: string, fallback = 0): number {
  if (!root.hasField(label)) return fallback;
  return root.getFieldByLabel(label).getValue() | 0;
}

export function readShort(root: GffRoot, label: string, fallback = 0): number {
  if (!root.hasField(label)) return fallback;
  return root.getFieldByLabel(label).getValue() | 0;
}

export function readFloat(root: GffRoot, label: string, fallback = 0): number {
  if (!root.hasField(label)) return fallback;
  return Number(root.getFieldByLabel(label).getValue()) || fallback;
}

export function readString(root: GffRoot, label: string, fallback = ''): string {
  if (!root.hasField(label)) return fallback;
  return String(root.getFieldByLabel(label).getValue() ?? fallback);
}

export function readResRef(root: GffRoot, label: string, fallback = ''): string {
  return readString(root, label, fallback);
}

export function readLocString(root: GffRoot, label: string): CExoLocString | undefined {
  if (!root.hasField(label)) return undefined;
  const field = root.getFieldByLabel(label);
  if (typeof field.getCExoLocString === 'function') {
    return field.getCExoLocString();
  }
  return undefined;
}

export function readBoolByte(root: GffRoot, label: string, fallback = false): boolean {
  if (!root.hasField(label)) return fallback;
  return !!root.getFieldByLabel(label).getValue();
}

export function addByte(parent: { addField: (f: GFFField) => GFFField }, label: string, value: number | boolean) {
  // BYTE fields store 0..255; only booleans are coerced to 0/1.
  const n = typeof value === 'boolean' ? (value ? 1 : 0) : ((value as number) | 0);
  return parent.addField(new GFFField(GFFDataType.BYTE, label)).setValue(n & 0xff);
}

export function addInt(parent: { addField: (f: GFFField) => GFFField }, label: string, value: number) {
  return parent.addField(new GFFField(GFFDataType.INT, label)).setValue(value | 0);
}

export function addDword(parent: { addField: (f: GFFField) => GFFField }, label: string, value: number) {
  return parent.addField(new GFFField(GFFDataType.DWORD, label)).setValue(value >>> 0);
}

export function addWord(parent: { addField: (f: GFFField) => GFFField }, label: string, value: number) {
  return parent.addField(new GFFField(GFFDataType.WORD, label)).setValue(value | 0);
}

export function addFloat(parent: { addField: (f: GFFField) => GFFField }, label: string, value: number) {
  return parent.addField(new GFFField(GFFDataType.FLOAT, label)).setValue(Number(value) || 0);
}

export function addShort(parent: { addField: (f: GFFField) => GFFField }, label: string, value: number) {
  return parent.addField(new GFFField(GFFDataType.SHORT, label)).setValue(value | 0);
}

export function addChar(parent: { addField: (f: GFFField) => GFFField }, label: string, value: number) {
  return parent.addField(new GFFField(GFFDataType.CHAR, label)).setValue(value | 0);
}

export function addVector(
  parent: { addField: (f: GFFField) => GFFField },
  label: string,
  value: { x: number; y: number; z: number },
) {
  return parent.addField(new GFFField(GFFDataType.VECTOR, label)).setValue({
    x: value.x,
    y: value.y,
    z: value.z,
  });
}

export function addOrientation(
  parent: { addField: (f: GFFField) => GFFField },
  label: string,
  value: { x: number; y: number; z: number; w: number },
) {
  return parent.addField(new GFFField(GFFDataType.ORIENTATION, label)).setValue({
    x: value.x,
    y: value.y,
    z: value.z,
    w: value.w,
  });
}

export function readObjectId(root: GffRoot): number | undefined {
  if (root.hasField('ObjectId')) return readDword(root, 'ObjectId');
  if (root.hasField('ID')) return readDword(root, 'ID');
  return undefined;
}

export function readVector(
  root: GffRoot,
  label: string,
): { x: number; y: number; z: number } | undefined {
  if (!root.hasField(label)) return undefined;
  const field = root.getFieldByLabel(label);
  if (typeof field.getVector === 'function') return field.getVector();
  return undefined;
}

export function readOrientation(
  root: GffRoot,
  label: string,
): { x: number; y: number; z: number; w: number } | undefined {
  if (!root.hasField(label)) return undefined;
  const field = root.getFieldByLabel(label);
  if (typeof field.getOrientation === 'function') return field.getOrientation();
  return undefined;
}

export function addString(parent: { addField: (f: GFFField) => GFFField }, label: string, value: string) {
  return parent.addField(new GFFField(GFFDataType.CEXOSTRING, label)).setValue(value || '');
}

export function addResRef(parent: { addField: (f: GFFField) => GFFField }, label: string, value: string) {
  return parent.addField(new GFFField(GFFDataType.RESREF, label)).setValue(value || '');
}

export function addLocString(
  parent: { addField: (f: GFFField) => GFFField },
  label: string,
  value: CExoLocString | undefined,
) {
  return parent.addField(new GFFField(GFFDataType.CEXOLOCSTRING, label)).setValue(
    value instanceof CExoLocString ? value : new CExoLocString(),
  );
}
