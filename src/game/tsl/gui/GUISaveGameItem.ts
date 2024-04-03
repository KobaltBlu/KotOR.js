import type { SaveGame } from "../../../SaveGame";
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

  declare node: SaveGame;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.extent.height = 39.5;
  }

  createControl(){
    try{
      const saveTimeString = `${toPaddedDigit(this.node.TIMESTAMP.getHours())}:${toPaddedDigit(this.node.TIMESTAMP.getMinutes())}:${toPaddedDigit(this.node.TIMESTAMP.getSeconds())} - ${toPaddedDigit(this.node.TIMESTAMP.getDate())}, ${toPaddedDigit(this.node.TIMESTAMP.getMonth() + 1)}, ${toPaddedDigit(this.node.TIMESTAMP.getFullYear(), 4)}`;
      if(this.node.isNewSave){
        this.setText(this.node.getFullName());
      }else if(this.node.getIsAutoSave()){
        this.setText("AUTOSAVE" + "\n" + saveTimeString);
      }else if(this.node.getIsQuickSave()){
        this.setText("QUICKSAVE" + "\n" + saveTimeString);
      }else{
        this.setText(this.node.getSaveNumber() + " : " + this.node.getSaveName() + "\n" + saveTimeString);
      }
      super.createControl();
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
