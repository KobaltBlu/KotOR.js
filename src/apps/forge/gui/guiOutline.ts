/**
 * GUI (.gui) control outline helpers for the Forge GUI editor.
 *
 * @file guiOutline.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { createGuiControlStruct } from "@/gui/guiControlSchema";
import { GFFField } from "@/resource/GFFField";
import { GFFObject } from "@/resource/GFFObject";
import { GFFStruct } from "@/resource/GFFStruct";

/** Stable path for the root panel (GFF RootNode). */
export const GUI_ROOT_PATH = "root";

export interface GuiOutlineNode {
  path: string;
  tag: string;
  type: number;
  struct: GFFStruct;
  isRoot: boolean;
  children: GuiOutlineNode[];
}

const CONTROL_TYPE_LABELS: Record<number, string> = {
  [GUIControlType.Panel]: "Panel",
  [GUIControlType.Label]: "Label",
  [GUIControlType.ProtoItem]: "ProtoItem",
  [GUIControlType.Button]: "Button",
  [GUIControlType.CheckBox]: "CheckBox",
  [GUIControlType.Slider]: "Slider",
  [GUIControlType.ScrollBar]: "ScrollBar",
  [GUIControlType.Progress]: "Progress",
  [GUIControlType.Listbox]: "ListBox",
};

export function guiControlTypeLabel(type: number): string {
  return CONTROL_TYPE_LABELS[type] ?? (type >= 0 ? `Type ${type}` : "Unknown");
}

export function guiControlTypeOptions(): Array<{ value: number; label: string }> {
  return [
    GUIControlType.Panel,
    GUIControlType.Label,
    GUIControlType.ProtoItem,
    GUIControlType.Button,
    GUIControlType.CheckBox,
    GUIControlType.Slider,
    GUIControlType.ScrollBar,
    GUIControlType.Progress,
    GUIControlType.Listbox,
  ].map((value) => ({
    value,
    label: `${value} · ${guiControlTypeLabel(value)}`,
  }));
}

/** Control types that can be inserted from the GUI editor Add menu (not ListBox-only nests). */
export function guiAddableControlTypes(): number[] {
  return [
    GUIControlType.Panel,
    GUIControlType.Label,
    GUIControlType.Button,
    GUIControlType.CheckBox,
    GUIControlType.Slider,
    GUIControlType.Progress,
    GUIControlType.Listbox,
  ];
}

export function readGuiTag(struct: GFFStruct | undefined): string {
  if (!struct?.hasField("TAG")) {
    return "";
  }
  const raw = struct.getFieldByLabel("TAG")?.getValue();
  return typeof raw === "string" ? raw : String(raw ?? "");
}

export function readGuiControlType(struct: GFFStruct | undefined): number {
  if (!struct?.hasField("CONTROLTYPE")) {
    return GUIControlType.Invalid;
  }
  const raw = struct.getFieldByLabel("CONTROLTYPE")?.getValue();
  return typeof raw === "number" && Number.isFinite(raw) ? raw : GUIControlType.Invalid;
}

export function readGuiParentTag(struct: GFFStruct | undefined): string {
  if (!struct?.hasField("Obj_Parent")) {
    return "";
  }
  const raw = struct.getFieldByLabel("Obj_Parent")?.getValue();
  return typeof raw === "string" ? raw : String(raw ?? "");
}

export function getGuiControlsList(root: GFFStruct): GFFStruct[] {
  if (!root.hasField("CONTROLS")) {
    return [];
  }
  return root.getFieldByLabel("CONTROLS")?.getChildStructs() ?? [];
}

export function ensureGuiControlsList(root: GFFStruct): GFFField {
  if (root.hasField("CONTROLS")) {
    return root.getFieldByLabel("CONTROLS")!;
  }
  const list = new GFFField(GFFDataType.LIST, "CONTROLS");
  root.addField(list);
  return list;
}

export function getNestedStruct(parent: GFFStruct | undefined, label: string): GFFStruct | undefined {
  if (!parent?.hasField(label)) {
    return undefined;
  }
  return parent.getFieldByLabel(label)?.getChildStructs()?.[0];
}

export function ensureNestedStruct(parent: GFFStruct, label: string): GFFStruct {
  const existing = getNestedStruct(parent, label);
  if (existing) {
    return existing;
  }
  const field = new GFFField(GFFDataType.STRUCT, label);
  const child = new GFFStruct();
  field.addChildStruct(child);
  parent.addField(field);
  return child;
}

export function getScalarFieldValue(struct: GFFStruct | undefined, label: string, fallback: number | string = 0): number | string {
  if (!struct?.hasField(label)) {
    return fallback;
  }
  const value = struct.getFieldByLabel(label)?.getValue();
  if (typeof fallback === "number") {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }
  return typeof value === "string" ? value : String(value ?? fallback);
}

export function setScalarField(
  struct: GFFStruct,
  label: string,
  type: GFFDataType,
  value: number | string,
): void {
  if (struct.hasField(label)) {
    struct.getFieldByLabel(label)?.setValue(value);
    return;
  }
  struct.addField(new GFFField(type, label, value));
}

export function getVectorFieldRgb(struct: GFFStruct | undefined, label: string): { r: number; g: number; b: number } {
  if (!struct?.hasField(label)) {
    return { r: 1, g: 1, b: 1 };
  }
  const vec = struct.getFieldByLabel(label)?.getVector();
  if (!vec) {
    return { r: 1, g: 1, b: 1 };
  }
  return {
    r: Number.isFinite(vec.x) ? vec.x : 1,
    g: Number.isFinite(vec.y) ? vec.y : 1,
    b: Number.isFinite(vec.z) ? vec.z : 1,
  };
}

export function setVectorFieldRgb(
  struct: GFFStruct,
  label: string,
  rgb: { r: number; g: number; b: number },
): void {
  const vec = { x: rgb.r, y: rgb.g, z: rgb.b };
  if (struct.hasField(label)) {
    struct.getFieldByLabel(label)?.setVector(vec);
    return;
  }
  struct.addField(new GFFField(GFFDataType.VECTOR, label, vec));
}

function controlPathForIndex(index: number): string {
  return `controls/${index}`;
}

/**
 * Build a parent/child tree from the flat CONTROLS list using Obj_Parent tags.
 */
export function buildGuiOutline(gff: GFFObject | undefined): GuiOutlineNode | undefined {
  if (!gff?.RootNode) {
    return undefined;
  }
  const rootStruct = gff.RootNode;
  const rootTag = readGuiTag(rootStruct) || "ROOT";
  const root: GuiOutlineNode = {
    path: GUI_ROOT_PATH,
    tag: rootTag,
    type: readGuiControlType(rootStruct),
    struct: rootStruct,
    isRoot: true,
    children: [] as GuiOutlineNode[],
  };

  const controls = getGuiControlsList(rootStruct);
  const nodes: GuiOutlineNode[] = controls.map((struct, index) => ({
    path: controlPathForIndex(index),
    tag: readGuiTag(struct) || `control_${index}`,
    type: readGuiControlType(struct),
    struct,
    isRoot: false,
    children: [] as GuiOutlineNode[],
  }));

  const byTag = new Map<string, GuiOutlineNode>();
  byTag.set(rootTag.toLowerCase(), root);
  for (const node of nodes) {
    if (node.tag) {
      byTag.set(node.tag.toLowerCase(), node);
    }
  }

  for (const node of nodes) {
    const parentTag = readGuiParentTag(node.struct);
    const parent =
      (parentTag ? byTag.get(parentTag.toLowerCase()) : undefined) ?? root;
    if (parent === node) {
      root.children.push(node);
    } else {
      parent.children.push(node);
    }
  }

  return root;
}

export function findGuiOutlineNode(
  root: GuiOutlineNode | undefined,
  path: string | undefined,
): GuiOutlineNode | undefined {
  if (!root || path == null || path === "") {
    return undefined;
  }
  if (root.path === path) {
    return root;
  }
  const stack = [...root.children];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.path === path) {
      return node;
    }
    for (let i = 0; i < node.children.length; i++) {
      stack.push(node.children[i]);
    }
  }
  return undefined;
}

export function findGuiOutlinePathByStruct(
  root: GuiOutlineNode | undefined,
  struct: GFFStruct | undefined,
): string | undefined {
  if (!root || !struct) {
    return undefined;
  }
  if (root.struct === struct) {
    return root.path;
  }
  const stack = [...root.children];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.struct === struct) {
      return node.path;
    }
    for (let i = 0; i < node.children.length; i++) {
      stack.push(node.children[i]);
    }
  }
  return undefined;
}

/** Canvas buffer coords → orthographic GUI space (origin at center, Y up). */
export function canvasToGuiUiPoint(
  mouseX: number,
  mouseY: number,
  canvasWidth: number,
  canvasHeight: number,
): { x: number; y: number } {
  return {
    x: mouseX - canvasWidth / 2,
    y: -(mouseY - canvasHeight / 2) || 0,
  };
}

export function collectExpandedGuiPaths(root: GuiOutlineNode | undefined, selectedPath?: string): Set<string> {
  const expanded = new Set<string>([GUI_ROOT_PATH]);
  if (!root || !selectedPath || selectedPath === GUI_ROOT_PATH) {
    return expanded;
  }
  const walk = (node: GuiOutlineNode, trail: string[]): boolean => {
    if (node.path === selectedPath) {
      for (const p of trail) {
        expanded.add(p);
      }
      return true;
    }
    for (const child of node.children) {
      if (walk(child, trail.concat(node.path))) {
        return true;
      }
    }
    return false;
  };
  walk(root, []);
  return expanded;
}

/**
 * Create a new control struct with the common GUI field set (extent/border/text/hilight/moveto)
 * plus type-specific nests when required by the engine.
 */
export function createDefaultGuiControlStruct(options: {
  type: number;
  tag: string;
  parentTag: string;
  parentId?: number;
  id?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  /** When omitted, INNEROFFSETY is not authored (caller should pass true for TSL). */
  includeInnerOffsetY?: boolean;
}): GFFStruct {
  return createGuiControlStruct({
    type: options.type,
    tag: options.tag,
    parentTag: options.parentTag,
    parentId: options.parentId,
    id: options.id,
    left: options.left,
    top: options.top,
    width: options.width,
    height: options.height,
    includeInnerOffsetY: !!options.includeInnerOffsetY,
    includeTypeNests: true,
  });
}

export function nextUniqueGuiTag(gff: GFFObject, base: string): string {
  const used = new Set<string>();
  const rootTag = readGuiTag(gff.RootNode);
  if (rootTag) {
    used.add(rootTag.toLowerCase());
  }
  for (const struct of getGuiControlsList(gff.RootNode)) {
    const tag = readGuiTag(struct);
    if (tag) {
      used.add(tag.toLowerCase());
    }
  }
  const cleaned = (base || "CTRL").replace(/[^A-Za-z0-9_]/g, "").slice(0, 12) || "CTRL";
  if (!used.has(cleaned.toLowerCase())) {
    return cleaned;
  }
  for (let i = 1; i < 10000; i++) {
    const candidate = `${cleaned}${i}`;
    if (!used.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return `${cleaned}${Date.now() % 100000}`;
}

export function nextGuiControlId(gff: GFFObject): number {
  let max = -1;
  if (gff.RootNode.hasField("ID")) {
    const rootId = gff.RootNode.getFieldByLabel("ID")?.getValue();
    if (typeof rootId === "number" && rootId > max) {
      max = rootId;
    }
  }
  for (const struct of getGuiControlsList(gff.RootNode)) {
    if (!struct.hasField("ID")) {
      continue;
    }
    const id = struct.getFieldByLabel("ID")?.getValue();
    if (typeof id === "number" && id > max) {
      max = id;
    }
  }
  return max + 1;
}

/** Retail / KotOR.js sentinel: no d-pad navigation target in this direction. */
export const GUI_MOVETO_NONE = -1;

export interface GuiMoveToTargetOption {
  id: number;
  tag: string;
  label: string;
}

export function readGuiControlId(struct: GFFStruct | undefined): number {
  if (!struct?.hasField("ID")) {
    return GUI_MOVETO_NONE;
  }
  const raw = struct.getFieldByLabel("ID")?.getValue();
  return typeof raw === "number" && Number.isFinite(raw) ? raw : GUI_MOVETO_NONE;
}

/**
 * Control ID choices for MOVETO UP/DOWN/LEFT/RIGHT (gamepad d-pad focus).
 * Includes a None (-1) entry; `extraIds` keeps orphan values selectable.
 */
export function listGuiMoveToTargets(
  gff: GFFObject | undefined,
  extraIds: number | number[] = [],
): GuiMoveToTargetOption[] {
  const options: GuiMoveToTargetOption[] = [
    { id: GUI_MOVETO_NONE, tag: "", label: "-1 · None" },
  ];
  const seen = new Set<number>([GUI_MOVETO_NONE]);

  const push = (id: number, tag: string, missing = false) => {
    if (!Number.isFinite(id) || seen.has(id)) {
      return;
    }
    seen.add(id);
    const name = missing ? "(missing)" : tag || "(untitled)";
    options.push({ id, tag, label: `${id} · ${name}` });
  };

  if (gff?.RootNode) {
    push(readGuiControlId(gff.RootNode), readGuiTag(gff.RootNode));
    for (const struct of getGuiControlsList(gff.RootNode)) {
      push(readGuiControlId(struct), readGuiTag(struct));
    }
  }

  const extras = Array.isArray(extraIds) ? extraIds : [extraIds];
  for (const extraId of extras) {
    push(extraId, "", true);
  }

  options.sort((a, b) => {
    if (a.id === GUI_MOVETO_NONE) return -1;
    if (b.id === GUI_MOVETO_NONE) return 1;
    return a.id - b.id;
  });
  return options;
}

export const GUI_MOVETO_DIRS = ["UP", "DOWN", "LEFT", "RIGHT"] as const;
export type GuiMoveToDir = (typeof GUI_MOVETO_DIRS)[number];
