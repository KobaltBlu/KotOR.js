import type { GUIControl } from "@engine/gui/GUIControl";
import type { GUIListBox } from "@engine/gui/GUIListBox";
import { BitWise } from "@core/utility/BitWise";
import { GUIControlTypeMask } from "@core/enums/gui/GUIControlTypeMask";

/**
 * Single dispatch point for list row body height.
 * Returns the raw drawn height of the row widget only — no list padding included.
 * Padding is the caller's responsibility and should be added as part of the slot pitch
 * (e.g. OrganizeControls uses `padding + itemHeight` as pitch).
 */
export function measureListRowHeight(list: GUIListBox, node: GUIControl): number {
  if (BitWise.InstanceOfObject(node, GUIControlTypeMask.GUIProtoItem)) {
    return (node as GUIControl & { getItemHeight(): number }).getItemHeight();
  }
  return list.getNodeHeight(node);
}
