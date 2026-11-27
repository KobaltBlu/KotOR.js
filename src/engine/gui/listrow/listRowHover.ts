import type { GUIControl } from "@engine/gui/GUIControl";
import type { GUIProtoItem } from "@engine/gui/GUIProtoItem";
import type { GUIListBox } from "@engine/gui/GUIListBox";
import { BitWise } from "@core/utility/BitWise";
import { GUIControlTypeMask } from "@core/enums/gui/GUIControlTypeMask";
import { GUIControlType } from "@core/enums/gui/GUIControlType";

export function shouldSuppressGameMenuHoverForListRow(control: GUIControl): boolean {
  if (!BitWise.InstanceOfObject(control, GUIControlTypeMask.GUIProtoItem)) {
    return false;
  }
  const list = (control as GUIProtoItem).list as GUIListBox | undefined;
  if (!list || typeof list.GUIProtoItemClass === "undefined") {
    return false;
  }
  const explicit = control.listRowSuppressGameMenuHover;
  if (explicit === true) {
    return true;
  }
  if (explicit === false) {
    return false;
  }
  return control.type !== GUIControlType.Label && control.type !== GUIControlType.ProtoItem;
}
