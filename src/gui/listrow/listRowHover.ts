import type { GUIControl } from "@/gui/GUIControl";
import type { GUIProtoItem } from "@/gui/GUIProtoItem";
import type { GUIListBox } from "@/gui/GUIListBox";
import { BitWise } from "@/utility/BitWise";
import { GUIControlTypeMask } from "@/enums/gui/GUIControlTypeMask";
import { GUIControlType } from "@/enums/gui/GUIControlType";

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
