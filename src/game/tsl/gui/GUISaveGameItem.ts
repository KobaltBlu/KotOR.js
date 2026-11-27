import type { SaveGame } from "@/engine/SaveGame";
import { GameState } from "@/GameState";
import { GUIProtoItem } from "@/gui";
import type { GameMenu, GUIControl } from "@/gui";
import { GFFStruct } from "@/resource/GFFStruct";

const toPaddedDigit = (num: number, len = 2) => String(num).padStart(len, '0');

/**
 * TSL save-game row, including new slots and saves without a valid timestamp.
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUISaveGameItem extends GUIProtoItem {
  declare node: SaveGame;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
  }

  getNodeName(){
    if(this.node.isNewSave){
      return this.node.getFullName();
    }

    const timestamp = this.node.TIMESTAMP;
    const hasValidTimestamp = timestamp instanceof Date && !isNaN(timestamp.getTime());
    const saveTimeString = hasValidTimestamp
      ? `${toPaddedDigit(timestamp.getHours())}:${toPaddedDigit(timestamp.getMinutes())}:${toPaddedDigit(timestamp.getSeconds())} - ${toPaddedDigit(timestamp.getDate())}, ${toPaddedDigit(timestamp.getMonth() + 1)}, ${toPaddedDigit(timestamp.getFullYear(), 4)}`
      : '';
    const name = this.node.getIsAutoSave()
      ? GameState.TLKManager.GetStringById(1593).Value
      : this.node.getIsQuickSave()
        ? GameState.TLKManager.GetStringById(47991).Value
        : this.node.getFullName();
    return saveTimeString ? `${name}\n${saveTimeString}` : name;
  }

  createControl(){
    try{
      this.extent.height = 46;
      super.createControl();
      this.setText(this.getNodeName());
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }
}
