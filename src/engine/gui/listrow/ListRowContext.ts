import type { GameMenu } from "@engine/gui/GameMenu";
import type { GUIListBox } from "@engine/gui/GUIListBox";
import type { ProtoTemplateSnapshot } from "@engine/gui/listrow/ProtoTemplateSnapshot";

export interface ListRowContext {
  list: GUIListBox;
  menu: GameMenu;
  template: ProtoTemplateSnapshot;
}
