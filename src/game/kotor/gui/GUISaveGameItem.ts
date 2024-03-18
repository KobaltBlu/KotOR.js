import type { SaveGame } from "../../../SaveGame";
import { GUIProtoItem } from "../../../gui";
import type { GameMenu, GUIControl } from "../../../gui";
import { GFFStruct } from "../../../resource/GFFStruct";

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
