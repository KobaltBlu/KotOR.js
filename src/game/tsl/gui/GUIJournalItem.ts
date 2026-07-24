import { JournalEntry } from "@/engine/JournalEntry";
import { GUIProtoItem } from "@/gui";
import type { GameMenu, GUIControl } from "@/gui";
import { GFFStruct } from "@/resource/GFFStruct";

/**
 * GUIJournalItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GUIJournalItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GUIJournalItem extends GUIProtoItem {

  declare node: JournalEntry;

  constructor(menu: GameMenu, control: GFFStruct, parent: GUIControl, scale: boolean = false){
    super(menu, control, parent, scale);
    this.setExtentHeight(44);
  }

  createControl(){
    try{
      const name = this.node?.getName?.() || this.node?.category?.name?.getTLKValue?.() || '';
      const date = this.node?.getReceivedDateLabel?.() || '';
      this.setText(date ? `${name}  (${date})` : name);
      super.createControl();
    }catch(e){
      console.error(e);
    }
    return this.widget;
  }

}
