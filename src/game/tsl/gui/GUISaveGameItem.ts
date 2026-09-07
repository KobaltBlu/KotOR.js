import type { SaveGame } from "@/engine/SaveGame";
import { GameState } from "@/GameState";
import { GUIProtoItem } from "@/gui";
import type { GameMenu, GUIControl } from "@/gui";
import type { GUIListBox } from "@/gui/GUIListBox";
import type { ProtoRowExtent } from "@/gui/GUIProtoItem";
import { GFFStruct } from "@/resource/GFFStruct";

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
    // Fixed-pitch row: do not grow the extent to wrapped text.
    this.listRowAlignExtentToWrappedText = false;
  }

  /**
   * base row extent — TSL GUI ctor builds
   * {left 0, top 0, width 0, height 0x24} then scales height by GetResolutionTextScalar
   * (1.0 below 2048px) before Initialize. Row height
   * is 36 at base resolution; the PROTOITEM GFF height is never used for the row.
   */
  getProtoBaseExtent(_list: GUIListBox): ProtoRowExtent {
    return { left: 0, top: 0, width: 0, height: 36 };
  }

  getNodeName(){
    const saveTimeString = `${toPaddedDigit(this.node.TIMESTAMP.getHours())}:${toPaddedDigit(this.node.TIMESTAMP.getMinutes())}:${toPaddedDigit(this.node.TIMESTAMP.getSeconds())} - ${toPaddedDigit(this.node.TIMESTAMP.getDate())}, ${toPaddedDigit(this.node.TIMESTAMP.getMonth() + 1)}, ${toPaddedDigit(this.node.TIMESTAMP.getFullYear(), 4)}`;
    if(this.node.isNewSave){
      return this.node.getFullName();
    }else if(this.node.getIsAutoSave()){
      return GameState.TLKManager.GetStringById(1593).Value + "\n" + saveTimeString;
    }else if(this.node.getIsQuickSave()){
      return GameState.TLKManager.GetStringById(47991).Value + "\n" + saveTimeString;
    }else{
      return this.node.getSaveNumber() + " : " + this.node.getSaveName() + "\n" + saveTimeString;
    }
  }

  createControl(){
    try{
      super.createControl();
      this.setText(this.getNodeName());
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
