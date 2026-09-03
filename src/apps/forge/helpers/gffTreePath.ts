/**
 * Stable GFF tree paths that survive undo snapshots (UUIDs do not).
 *
 * Root is "". A field is "Tag". A list child is "ItemList[2]". Nested:
 * "ItemList[2].Tag".
 *
 * @file gffTreePath.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";

export const GFF_ROOT_PATH = "";

export function isGffField(node: unknown): node is GFFField {
  return !!node
    && typeof (node as GFFField).getLabel === "function"
    && typeof (node as GFFField).getType === "function"
    && typeof (node as GFFField).setLabel === "function"
    && !Array.isArray((node as GFFStruct).fields);
}

export function isGffStruct(node: unknown): node is GFFStruct {
  return !!node
    && typeof (node as GFFStruct).getFields === "function"
    && Array.isArray((node as GFFStruct).fields);
}

export type GffPathKind = "struct" | "field";

export interface GffPathSegment {
  label: string;
  index?: number;
}

const SEGMENT_RE = /([^.\[]+)(?:\[(\d+)\])?/g;

export function splitGffPath(path: string): GffPathSegment[] {
  if (!path) {
    return [];
  }
  const parts: GffPathSegment[] = [];
  SEGMENT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SEGMENT_RE.exec(path)) !== null) {
    parts.push({
      label: match[1],
      index: match[2] !== undefined ? Number(match[2]) : undefined,
    });
  }
  return parts;
}

export function gffFieldPath(parentStructPath: string, label: string): string {
  return parentStructPath ? `${parentStructPath}.${label}` : label;
}

export function gffChildStructPath(parentFieldPath: string, index: number): string {
  return `${parentFieldPath}[${index}]`;
}

export function gffPathKind(path: string): GffPathKind {
  if (!path) {
    return "struct";
  }
  return /\[\d+]$/.test(path) ? "struct" : "field";
}

export function parentGffPath(path: string): string | undefined {
  if (!path) {
    return undefined;
  }
  const indexMatch = path.match(/^(.*)\[(\d+)]$/);
  if (indexMatch) {
    return indexMatch[1];
  }
  const dot = path.lastIndexOf(".");
  if (dot >= 0) {
    return path.slice(0, dot);
  }
  return GFF_ROOT_PATH;
}

export function findGffNode(root: GFFStruct | undefined, path: string): GFFField | GFFStruct | undefined {
  if (!root) {
    return undefined;
  }
  if (!path) {
    return root;
  }
  let struct: GFFStruct = root;
  const parts = splitGffPath(path);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const field = struct.getFieldByLabel(part.label);
    if (!field) {
      return undefined;
    }
    const isLast = i === parts.length - 1;
    if (part.index === undefined) {
      if (isLast) {
        return field;
      }
      const children = field.getChildStructs();
      if (!children.length) {
        return undefined;
      }
      struct = children[0];
    } else {
      const child = field.getChildStructs()[part.index];
      if (!child) {
        return undefined;
      }
      if (isLast) {
        return child;
      }
      struct = child;
    }
  }
  return struct;
}

export function gffAncestorPaths(path: string): string[] {
  if (!path) {
    return [GFF_ROOT_PATH];
  }
  const out: string[] = [GFF_ROOT_PATH];
  const parts = splitGffPath(path);
  let current = "";
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    current = gffFieldPath(current, part.label);
    out.push(current);
    if (part.index !== undefined) {
      current = gffChildStructPath(current, part.index);
      out.push(current);
    }
  }
  return out;
}

export function gffBreadcrumb(path: string): string {
  if (!path) {
    return "Root";
  }
  const parts = splitGffPath(path);
  const labels = ["Root"];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    labels.push(part.index === undefined ? part.label : `${part.label}[${part.index}]`);
  }
  return labels.join(" > ");
}

export function collectGffPaths(root: GFFStruct, prefix = GFF_ROOT_PATH, out: string[] = []): string[] {
  out.push(prefix);
  const fields = root.getFields();
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const fieldPath = gffFieldPath(prefix, field.getLabel());
    out.push(fieldPath);
    const type = field.getType();
    if (type === GFFDataType.LIST || type === GFFDataType.STRUCT) {
      const children = field.getChildStructs();
      for (let j = 0; j < children.length; j++) {
        collectGffPaths(children[j], gffChildStructPath(fieldPath, j), out);
      }
    }
  }
  return out;
}

export function countGffFields(root: GFFStruct | undefined): number {
  if (!root) {
    return 0;
  }
  let count = 0;
  const walk = (struct: GFFStruct) => {
    const fields = struct.getFields();
    count += fields.length;
    for (let i = 0; i < fields.length; i++) {
      const children = fields[i].getChildStructs();
      for (let j = 0; j < children.length; j++) {
        walk(children[j]);
      }
    }
  };
  walk(root);
  return count;
}

export function filterValidGffPaths(root: GFFStruct, paths: Iterable<string>): Set<string> {
  const valid = new Set<string>();
  for (const path of paths) {
    if (path === GFF_ROOT_PATH || findGffNode(root, path)) {
      valid.add(path);
    }
  }
  valid.add(GFF_ROOT_PATH);
  return valid;
}

/**
 * True when `ancestor` is the same node as `descendant`, is root, or is a
 * proper parent path (`ItemList` contains `ItemList[0].Tag`, but `ItemList[1]`
 * does not contain `ItemList[10]`).
 */
export function gffPathContains(ancestor: string, descendant: string): boolean {
  if (ancestor === descendant) {
    return true;
  }
  if (ancestor === GFF_ROOT_PATH) {
    return true;
  }
  return descendant.startsWith(ancestor + ".") || descendant.startsWith(ancestor + "[");
}

export function visibleGffPathsForSearch(root: GFFStruct | undefined, matches: string[]): Set<string> {
  const visible = new Set<string>([GFF_ROOT_PATH]);
  if (!root || !matches.length) {
    return visible;
  }
  for (let i = 0; i < matches.length; i++) {
    const ancestors = gffAncestorPaths(matches[i]);
    for (let j = 0; j < ancestors.length; j++) {
      visible.add(ancestors[j]);
    }
  }
  const all = collectGffPaths(root);
  for (let i = 0; i < all.length; i++) {
    const path = all[i];
    if (visible.has(path)) {
      continue;
    }
    for (let j = 0; j < matches.length; j++) {
      if (gffPathContains(matches[j], path)) {
        visible.add(path);
        break;
      }
    }
  }
  return visible;
}

export function searchGffPaths(
  root: GFFStruct,
  query: string,
  previewOf: (field: GFFField) => string,
): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  const matches: string[] = [];
  const walk = (struct: GFFStruct, prefix: string) => {
    if (`struct id ${struct.getType()}`.includes(needle) || String(struct.getType()).includes(needle)) {
      if (matches.indexOf(prefix) < 0) {
        matches.push(prefix);
      }
    }
    const fields = struct.getFields();
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const fieldPath = gffFieldPath(prefix, field.getLabel());
      const typeName = String(GFFDataType[field.getType()] || "").toLowerCase();
      const haystack = `${field.getLabel()} ${typeName} ${fieldPath} ${previewOf(field)}`.toLowerCase();
      if (haystack.indexOf(needle) >= 0) {
        matches.push(fieldPath);
      }
      const type = field.getType();
      if (type === GFFDataType.LIST || type === GFFDataType.STRUCT) {
        const children = field.getChildStructs();
        for (let j = 0; j < children.length; j++) {
          walk(children[j], gffChildStructPath(fieldPath, j));
        }
      }
    }
  };
  walk(root, GFF_ROOT_PATH);
  return matches;
}
