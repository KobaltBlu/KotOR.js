import type { SaveGame } from "@/engine/SaveGame";
import { GUIProtoItem } from "@/gui";
import type { GameMenu, GUIControl } from "@/gui";
import type { GUIListBox } from "@/gui/GUIListBox";
import type { RetailRowExtent } from "@/gui/GUIProtoItem";
import { GFFStruct } from "@/resource/GFFStruct";

/**
 * GUISaveGameItem class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GUISaveGameItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUISaveGameItem extends GUIProtoItem {

  declare node: SaveGame;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    // Fixed-pitch row: do not grow the extent to wrapped text.
    this.listRowAlignExtentToWrappedText = false;
  }

  /**
   * Retail base row extent — K1 PopulateGameList pushes a stack extent
   * {left 0, top 0, width 0, height 0x2a} and passes it into Initialize
   *. Row height is 42; width 0 is resolved to viewport-2*padding in
   * OrganizeControls. The PROTOITEM GFF height (50) is never used for the row.
   */
  getRetailBaseExtent(_list: GUIListBox): RetailRowExtent {
    return { left: 0, top: 0, width: 0, height: 42 };
  }

  createControl(){
    try{
      super.createControl();
      this.setText(this.node.getFullName());
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
