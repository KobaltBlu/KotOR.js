import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { MenuUpgradeItems as K1_MenuUpgradeItems } from "../../kotor/KOTOR";

/**
 * MenuUpgradeItems class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuUpgradeItems.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgradeItems extends K1_MenuUpgradeItems {

  declare LB_ITEMS: GUIListBox;
  declare LB_DESCRIPTION: GUIListBox;
  declare LBL_TITLE: GUILabel;
  declare BTN_UPGRADEITEM: GUIButton;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'upgradeitems_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
