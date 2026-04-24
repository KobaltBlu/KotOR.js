import type { GameMenu } from "@/gui/GameMenu";
import type { GUIListBox } from "@/gui/GUIListBox";
import type { ProtoTemplateSnapshot } from "@/gui/listrow/ProtoTemplateSnapshot";

export interface ListRowContext {
  list: GUIListBox;
  menu: GameMenu;
  template: ProtoTemplateSnapshot;
}
