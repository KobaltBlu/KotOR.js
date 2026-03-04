import { JournalEntry } from "@/engine/JournalEntry";
import { GUIProtoItem } from "@/gui";
import type { GameMenu, GUIControl } from "@/gui";
import { GFFStruct } from "@/resource/GFFStruct";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

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
    this.extent.height = 44;
  }

  createControl(){
    try{
      this.setText(this.node.category.name.getTLKValue());
      super.createControl();
    }catch(e){
      log.error(e);
    }
    return this.widget;
  }

}
