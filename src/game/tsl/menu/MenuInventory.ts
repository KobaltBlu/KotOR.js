import type { GUILabel, GUIButton, GUIListBox } from "../../../gui";
import type { ModuleItem } from "../../../module/ModuleItem";
import { MenuInventory as K1_MenuInventory } from "../../kotor/KOTOR";

/**
 * MenuInventory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuInventory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuInventory extends K1_MenuInventory {

  declare LBL_BAR6: GUILabel;
  declare LBL_FILTER: GUILabel;
  declare LBL_INV: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare BTN_USEITEM: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare BTN_ALL: GUIButton;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_CREDITS_VALUE: GUILabel;
  declare BTN_DATAPADS: GUIButton;
  declare BTN_WEAPONS: GUIButton;
  declare BTN_ARMOR: GUIButton;
  declare BTN_USEABLE: GUIButton;
  declare BTN_MISC: GUIButton;
  declare BTN_QUESTS: GUIButton;
  declare BTN_EXIT: GUIButton;
  declare LB_ITEMS: GUIListBox;
  declare LB_DESCRIPTION: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'inventory_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;

      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        this.selected = item;
        this.UpdateSelected();
      }

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;
      resolve();
    });
  }

  show() {
    super.show();
  }
  
}
