/**
 * Retail-correct GUI control GFF authoring helpers.
 * Shared by the engine (`GUIControl.buildDefaultControl`) and Forge GUI editor.
 *
 * @file guiControlSchema.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GameEngineType } from "@/enums/engine/GameEngineType";
import { GUIControlAlignment } from "@/enums/gui/GUIControlAlignment";
import { GUIControlType } from "@/enums/gui/GUIControlType";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { GFFStruct } from "@/resource/GFFStruct";

export const GUI_STRREF_NONE = 0xffffffff;
export const GUI_MOVETO_NONE_ID = -1;

export const GUI_DEFAULT_ALIGNMENT =
  GUIControlAlignment.HorizontalCenter | GUIControlAlignment.VerticalCenter;

export interface GuiBorderSchemaOptions {
  color?: { x: number; y: number; z: number };
  includeInnerOffsetY?: boolean;
}

export interface GuiTextSchemaOptions {
  color?: { x: number; y: number; z: number };
  strref?: number;
  text?: string;
  font?: string;
  alignment?: number;
}

export interface GuiControlSchemaOptions {
  type?: number;
  tag?: string;
  id?: number;
  parentTag?: string;
  parentId?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  padding?: number;
  locked?: number;
  includeInnerOffsetY?: boolean;
  borderColor?: { x: number; y: number; z: number };
  highlightColor?: { x: number; y: number; z: number };
  textColor?: { x: number; y: number; z: number };
  /** When true, attach type-specific nests (CheckBox, Progress, etc.). Default true. */
  includeTypeNests?: boolean;
}

function addStructField(parent: GFFStruct, label: string, child: GFFStruct): void {
  const field = new GFFField(GFFDataType.STRUCT, label);
  field.addChildStruct(child);
  parent.addField(field);
}

export function isTslGuiGame(gameKey?: GameEngineType | string): boolean {
  return gameKey === GameEngineType.TSL || gameKey === "TSL";
}

/** Border-like nest: BORDER, HILIGHT, SELECTED, HILIGHTSELECTED, PROGRESS. */
export function createGuiBorderStruct(options: GuiBorderSchemaOptions = {}): GFFStruct {
  const border = new GFFStruct();
  const color = options.color ?? { x: 1, y: 1, z: 1 };
  border.addField(new GFFField(GFFDataType.VECTOR, "COLOR", color));
  border.addField(new GFFField(GFFDataType.INT, "DIMENSION", 0));
  border.addField(new GFFField(GFFDataType.RESREF, "CORNER", ""));
  border.addField(new GFFField(GFFDataType.RESREF, "EDGE", ""));
  border.addField(new GFFField(GFFDataType.RESREF, "FILL", ""));
  border.addField(new GFFField(GFFDataType.INT, "FILLSTYLE", 0));
  border.addField(new GFFField(GFFDataType.INT, "INNEROFFSET", 0));
  if (options.includeInnerOffsetY) {
    border.addField(new GFFField(GFFDataType.INT, "INNEROFFSETY", 0));
  }
  border.addField(new GFFField(GFFDataType.BYTE, "PULSING", 0));
  return border;
}

export function createGuiTextStruct(options: GuiTextSchemaOptions = {}): GFFStruct {
  const text = new GFFStruct();
  text.addField(new GFFField(GFFDataType.RESREF, "FONT", options.font ?? ""));
  text.addField(new GFFField(GFFDataType.DWORD, "STRREF", options.strref ?? GUI_STRREF_NONE));
  text.addField(new GFFField(GFFDataType.CEXOSTRING, "TEXT", options.text ?? ""));
  text.addField(new GFFField(GFFDataType.INT, "ALIGNMENT", options.alignment ?? GUI_DEFAULT_ALIGNMENT));
  text.addField(new GFFField(GFFDataType.BYTE, "PULSING", 0));
  text.addField(new GFFField(GFFDataType.VECTOR, "COLOR", options.color ?? { x: 1, y: 1, z: 1 }));
  return text;
}

export function createGuiExtentStruct(options: {
  left?: number;
  top?: number;
  width?: number;
  height?: number;
} = {}): GFFStruct {
  const extent = new GFFStruct();
  extent.addField(new GFFField(GFFDataType.INT, "TOP", options.top ?? 0));
  extent.addField(new GFFField(GFFDataType.INT, "LEFT", options.left ?? 0));
  extent.addField(new GFFField(GFFDataType.INT, "WIDTH", options.width ?? 100));
  extent.addField(new GFFField(GFFDataType.INT, "HEIGHT", options.height ?? 25));
  return extent;
}

export function createGuiMoveToStruct(): GFFStruct {
  const moveTo = new GFFStruct();
  moveTo.addField(new GFFField(GFFDataType.INT, "DOWN", GUI_MOVETO_NONE_ID));
  moveTo.addField(new GFFField(GFFDataType.INT, "LEFT", GUI_MOVETO_NONE_ID));
  moveTo.addField(new GFFField(GFFDataType.INT, "RIGHT", GUI_MOVETO_NONE_ID));
  moveTo.addField(new GFFField(GFFDataType.INT, "UP", GUI_MOVETO_NONE_ID));
  return moveTo;
}

export function createGuiImageNestStruct(image = ""): GFFStruct {
  const nest = new GFFStruct();
  nest.addField(new GFFField(GFFDataType.RESREF, "IMAGE", image));
  return nest;
}

/**
 * Ensure a border-like nested STRUCT exists on `parent` under `label`.
 * Fills missing leaf fields without wiping existing retail data.
 */
export function ensureGuiBorderNest(
  parent: GFFStruct,
  label: string,
  options: GuiBorderSchemaOptions = {},
): GFFStruct {
  let nest: GFFStruct | undefined;
  if (parent.hasField(label)) {
    nest = parent.getFieldByLabel(label)?.getChildStructs()?.[0];
  }
  if (!nest) {
    nest = createGuiBorderStruct(options);
    addStructField(parent, label, nest);
    return nest;
  }
  ensureScalar(nest, "DIMENSION", GFFDataType.INT, 0);
  ensureResRef(nest, "CORNER", "");
  ensureResRef(nest, "EDGE", "");
  ensureResRef(nest, "FILL", "");
  ensureScalar(nest, "FILLSTYLE", GFFDataType.INT, 0);
  ensureScalar(nest, "INNEROFFSET", GFFDataType.INT, 0);
  if (options.includeInnerOffsetY) {
    ensureScalar(nest, "INNEROFFSETY", GFFDataType.INT, 0);
  }
  ensureScalar(nest, "PULSING", GFFDataType.BYTE, 0);
  if (!nest.hasField("COLOR")) {
    nest.addField(new GFFField(GFFDataType.VECTOR, "COLOR", options.color ?? { x: 1, y: 1, z: 1 }));
  }
  return nest;
}

function ensureScalar(struct: GFFStruct, label: string, type: GFFDataType, value: number | string): void {
  if (struct.hasField(label)) {
    return;
  }
  struct.addField(new GFFField(type, label, value));
}

function ensureResRef(struct: GFFStruct, label: string, value: string): void {
  if (struct.hasField(label)) {
    return;
  }
  struct.addField(new GFFField(GFFDataType.RESREF, label, value));
}

/** Attach engine-read type-specific nests for the given CONTROLTYPE. */
export function ensureGuiTypeNests(
  control: GFFStruct,
  type: number,
  options: { includeInnerOffsetY?: boolean } = {},
): void {
  const y = !!options.includeInnerOffsetY;
  switch (type) {
    case GUIControlType.CheckBox:
      ensureGuiBorderNest(control, "SELECTED", { includeInnerOffsetY: y });
      ensureGuiBorderNest(control, "HILIGHTSELECTED", { includeInnerOffsetY: y });
      break;
    case GUIControlType.Progress:
      ensureScalar(control, "STARTFROMLEFT", GFFDataType.BYTE, 1);
      ensureScalar(control, "CURVALUE", GFFDataType.INT, 0);
      ensureScalar(control, "MAXVALUE", GFFDataType.INT, 100);
      ensureGuiBorderNest(control, "PROGRESS", { includeInnerOffsetY: y });
      break;
    case GUIControlType.Slider:
      if (!control.hasField("THUMB")) {
        addStructField(control, "THUMB", createGuiImageNestStruct());
      } else {
        const thumb = control.getFieldByLabel("THUMB")?.getChildStructs()?.[0];
        if (thumb) {
          ensureResRef(thumb, "IMAGE", "");
        }
      }
      break;
    case GUIControlType.ScrollBar:
      if (!control.hasField("DIR")) {
        addStructField(control, "DIR", createGuiImageNestStruct());
      } else {
        const dir = control.getFieldByLabel("DIR")?.getChildStructs()?.[0];
        if (dir) {
          ensureResRef(dir, "IMAGE", "");
        }
      }
      if (!control.hasField("THUMB")) {
        addStructField(control, "THUMB", createGuiImageNestStruct());
      } else {
        const thumb = control.getFieldByLabel("THUMB")?.getChildStructs()?.[0];
        if (thumb) {
          ensureResRef(thumb, "IMAGE", "");
        }
      }
      break;
    case GUIControlType.Listbox:
      ensureScalar(control, "LEFTSCROLLBAR", GFFDataType.BYTE, 0);
      if (!control.hasField("PROTOITEM")) {
        const proto = createGuiControlStruct({
          type: GUIControlType.ProtoItem,
          tag: "PROTOITEM",
          parentTag: "",
          width: 100,
          height: 25,
          includeInnerOffsetY: y,
          includeTypeNests: false,
        });
        // Nested PROTOITEM is not a CONTROLS child; strip Obj_Parent linkage noise is fine.
        addStructField(control, "PROTOITEM", proto);
      }
      if (!control.hasField("SCROLLBAR")) {
        const bar = createGuiControlStruct({
          type: GUIControlType.ScrollBar,
          tag: "SCROLLBAR",
          parentTag: "",
          width: 16,
          height: 100,
          includeInnerOffsetY: y,
          includeTypeNests: true,
        });
        addStructField(control, "SCROLLBAR", bar);
      }
      break;
    default:
      break;
  }
}

/**
 * Create a retail-shaped GUI control GFFStruct (common nests + optional type nests).
 */
export function createGuiControlStruct(options: GuiControlSchemaOptions = {}): GFFStruct {
  const includeY = !!options.includeInnerOffsetY;
  const type = options.type ?? GUIControlType.Button;
  const control = new GFFStruct();

  addStructField(
    control,
    "EXTENT",
    createGuiExtentStruct({
      left: options.left,
      top: options.top,
      width: options.width,
      height: options.height,
    }),
  );
  addStructField(
    control,
    "BORDER",
    createGuiBorderStruct({ color: options.borderColor, includeInnerOffsetY: includeY }),
  );
  addStructField(
    control,
    "TEXT",
    createGuiTextStruct({ color: options.textColor }),
  );
  addStructField(
    control,
    "HILIGHT",
    createGuiBorderStruct({
      color: options.highlightColor ?? { x: 1, y: 1, z: 0 },
      includeInnerOffsetY: includeY,
    }),
  );
  addStructField(control, "MOVETO", createGuiMoveToStruct());

  control.addField(new GFFField(GFFDataType.INT, "CONTROLTYPE", type));
  control.addField(new GFFField(GFFDataType.CEXOSTRING, "TAG", options.tag ?? ""));
  control.addField(new GFFField(GFFDataType.INT, "ID", options.id ?? 0));
  control.addField(new GFFField(GFFDataType.BYTE, "Obj_Locked", options.locked ?? 0));
  control.addField(new GFFField(GFFDataType.CEXOSTRING, "Obj_Parent", options.parentTag ?? ""));
  control.addField(new GFFField(GFFDataType.INT, "Obj_ParentID", options.parentId ?? -1));
  control.addField(new GFFField(GFFDataType.INT, "PADDING", options.padding ?? 0));

  if (options.includeTypeNests !== false) {
    ensureGuiTypeNests(control, type, { includeInnerOffsetY: includeY });
  }

  return control;
}
