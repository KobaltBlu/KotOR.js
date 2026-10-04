import { GameState } from "@engine/runtime/GameState";
import { GUIProtoItem } from "@engine/gui";
import type { GameMenu, GUIControl } from "@engine/gui";
import { GFFStruct } from "@core/resource/GFFStruct";

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

  declare node: { strrefname: number; filename: string };

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
  }

  createControl(){
    try{
      super.createControl();
      const name = GameState.TLKManager.GetStringById(this.node.strrefname).Value || this.node.filename || '';
      this.setText(name);
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
