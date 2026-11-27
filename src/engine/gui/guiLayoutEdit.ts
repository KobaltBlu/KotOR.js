/**
 * Helpers for editing a parsed .gui GFF before its controls are built, so a
 * menu can derive a code-only layout from a stock one.
 *
 * @file guiLayoutEdit.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { GFFField } from "@core/resource/GFFField";
import { GFFObject } from "@core/resource/GFFObject";
import type { GFFStruct } from "@core/resource/GFFStruct";
import { GUI_MOVETO_NONE_ID } from "@engine/gui/guiControlSchema";

/** The panel's CONTROLS list field, if present. */
export function getGuiControlsField(gff: GFFObject): GFFField | undefined {
  return gff?.RootNode?.getFieldByLabel('CONTROLS');
}

export function getGuiControlTag(control: GFFStruct): string {
  return control.getFieldByLabel('TAG')?.getValue() ?? '';
}

export function findGuiControl(gff: GFFObject, tag: string): GFFStruct | undefined {
  return getGuiControlsField(gff)?.getChildStructs().find((c) => getGuiControlTag(c) === tag);
}

/** Drop every top-level control whose tag fails `keep`. */
export function filterGuiControls(gff: GFFObject, keep: (tag: string) => boolean): void {
  const field = getGuiControlsField(gff);
  if(!field) return;
  const structs = field.getChildStructs().slice();
  for(const control of structs){
    if(!keep(getGuiControlTag(control))){
      field.removeChildStruct(control);
    }
  }
}

/** Deep copy of a control struct (round-trips through the GFF writer). */
export function cloneGuiControl(control: GFFStruct): GFFStruct {
  const copy = new GFFObject(GFFObject.FromStruct(control, control.type).getExportBuffer()).RootNode;
  copy.type = control.type;
  return copy;
}

/** Largest control ID in the panel (-1 when empty). */
export function getMaxGuiControlId(gff: GFFObject): number {
  let max = -1;
  for(const control of getGuiControlsField(gff)?.getChildStructs() ?? []){
    const id = control.getFieldByLabel('ID')?.getValue();
    if(typeof id === 'number' && id > max) max = id;
  }
  return max;
}

export function setGuiControlTag(control: GFFStruct, tag: string): void {
  control.getFieldByLabel('TAG')?.setValue(tag);
}

export function setGuiControlId(control: GFFStruct, id: number): void {
  control.getFieldByLabel('ID')?.setValue(id);
}

export function getGuiControlExtent(control: GFFStruct): { left: number; top: number; width: number; height: number } {
  const extent = control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
  return {
    left: extent?.getFieldByLabel('LEFT')?.getValue() ?? 0,
    top: extent?.getFieldByLabel('TOP')?.getValue() ?? 0,
    width: extent?.getFieldByLabel('WIDTH')?.getValue() ?? 0,
    height: extent?.getFieldByLabel('HEIGHT')?.getValue() ?? 0,
  };
}

export function setGuiControlExtent(
  control: GFFStruct,
  extent: Partial<{ left: number; top: number; width: number; height: number }>,
): void {
  const struct = control.getFieldByLabel('EXTENT')?.getChildStructs()[0];
  if(!struct) return;
  if(extent.left !== undefined) struct.getFieldByLabel('LEFT')?.setValue(extent.left);
  if(extent.top !== undefined) struct.getFieldByLabel('TOP')?.setValue(extent.top);
  if(extent.width !== undefined) struct.getFieldByLabel('WIDTH')?.setValue(extent.width);
  if(extent.height !== undefined) struct.getFieldByLabel('HEIGHT')?.setValue(extent.height);
}

/** Replace the control's label text with a literal string (no TLK lookup). */
export function setGuiControlText(control: GFFStruct, text: string): void {
  const struct = control.getFieldByLabel('TEXT')?.getChildStructs()[0];
  if(!struct) return;
  struct.getFieldByLabel('STRREF')?.setValue(0xffffffff);
  const field = struct.getFieldByLabel('TEXT');
  if(field){
    field.setValue(text);
  }else{
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'TEXT', text));
  }
}

export type GuiMoveToDir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export function getGuiMoveTo(control: GFFStruct, dir: GuiMoveToDir): number {
  const value = control.getFieldByLabel('MOVETO')?.getChildStructs()[0]?.getFieldByLabel(dir)?.getValue();
  return typeof value === 'number' ? value : GUI_MOVETO_NONE_ID;
}

export function setGuiMoveTo(control: GFFStruct, dir: GuiMoveToDir, id: number): void {
  control.getFieldByLabel('MOVETO')?.getChildStructs()[0]?.getFieldByLabel(dir)?.setValue(id);
}

/**
 * Insert `control` directly above `below` in the pad MOVETO chain: whatever
 * moved DOWN into `below` now lands on `control`, and `control` moves DOWN to `below`.
 */
export function insertGuiMoveToAbove(gff: GFFObject, control: GFFStruct, below: GFFStruct): void {
  const controlId = control.getFieldByLabel('ID')?.getValue();
  const belowId = below.getFieldByLabel('ID')?.getValue();
  if(typeof controlId !== 'number' || typeof belowId !== 'number') return;

  for(const other of getGuiControlsField(gff)?.getChildStructs() ?? []){
    if(other === control) continue;
    if(getGuiMoveTo(other, 'DOWN') === belowId) setGuiMoveTo(other, 'DOWN', controlId);
  }
  setGuiMoveTo(control, 'UP', getGuiMoveTo(below, 'UP'));
  setGuiMoveTo(control, 'DOWN', belowId);
  setGuiMoveTo(below, 'UP', controlId);
}
