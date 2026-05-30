import type { GUIControl } from "@/gui/GUIControl";
import type { GUIListBox } from "@/gui/GUIListBox";
import { BitWise } from "@/utility/BitWise";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";

/**
 * Single dispatch point for list row body height.
 * Returns the raw drawn height of the row widget only — no list padding included.
 * Padding is the caller's responsibility and should be added as part of the slot pitch
 * (e.g. `body + list.padding` per row in `updateList`, `getContentHeight`, and `getScrollStep`).
 */
export function measureListRowHeight(list: GUIListBox, node: GUIControl): number {
  if (BitWise.InstanceOfObject(node, GUIControlTypeMask.GUIProtoItem)) {
    return (node as GUIControl & { getItemHeight(): number }).getItemHeight();
  }
  return list.getNodeHeight(node);
}
