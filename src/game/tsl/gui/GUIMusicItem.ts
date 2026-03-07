import { GameState } from "../../../GameState";
import { GUIProtoItem } from "../../../gui";
import type { GameMenu, GUIControl } from "../../../gui";
import { GFFStruct } from "../../../resource/GFFStruct";

/**
 * GUIMusicItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIMusicItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIMusicItem extends GUIProtoItem {

  declare node: any;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.extent.height = 39.5;
  }

  createControl(){
    try{
      super.createControl();
      this.setText(GameState.TLKManager.GetStringById(this.node.strrefname).Value);
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
