import { MenuQuestItem as K1_MenuQuestItem } from "@/game/kotor/KOTOR";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import type { ModuleItem } from "@/module";
import { GUIInventoryItem } from "@/game/tsl/gui/GUIInventoryItem";

/**
 * MenuQuestItem class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuQuestItem.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuQuestItem extends K1_MenuQuestItem {

  declare LB_ITEM_DESCRIPTION: GUIListBox;
  declare LB_ITEMS: GUIListBox;
  declare LBL_TITLE: GUILabel;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'questitem_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this._button_b = this.BTN_BACK;

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        this.selected = item;
        this.UpdateSelected();
      };

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;
      resolve();
    });
  }
  
}
