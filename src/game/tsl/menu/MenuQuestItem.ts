import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { MenuQuestItem as K1_MenuQuestItem } from "../../kotor/KOTOR";

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
      resolve();
    });
  }
  
}
