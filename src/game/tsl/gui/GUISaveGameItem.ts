import { GUIProtoItem } from "../../../gui";
import type { GameMenu, GUIControl } from "../../../gui";
import { GFFStruct } from "../../../resource/GFFStruct";

const toPaddedDigit = (num: number, len = 2) => {
  return new String(num).padStart(len, '0');
}

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

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
  }

  createControl(){
    try{
      super.createControl();
      this.setText(
        this.node.getFullName() + "\n" + 
        `${toPaddedDigit(this.node.TIMESTAMP.getHours())}:${toPaddedDigit(this.node.TIMESTAMP.getMinutes())}:${toPaddedDigit(this.node.TIMESTAMP.getSeconds())} - ${toPaddedDigit(this.node.TIMESTAMP.getDate())}, ${toPaddedDigit(this.node.TIMESTAMP.getMonth() + 1)}, ${toPaddedDigit(this.node.TIMESTAMP.getFullYear(), 4)}`
      );
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
