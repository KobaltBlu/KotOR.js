import type { GUIButton, GUILabel, GUIListBox } from "../../../gui";
import { MenuUpgradeSelect as K1_MenuUpgradeSelect } from "../../kotor/KOTOR";

/**
 * MenuUpgradeSelect class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuUpgradeSelect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgradeSelect extends K1_MenuUpgradeSelect {

  declare BTN_RANGED: GUIButton;
  declare BTN_LIGHTSABER: GUIButton;
  declare BTN_MELEE: GUIButton;
  declare BTN_ARMOR: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare BTN_UPGRADEITEMS: GUIButton;
  declare BTN_BACK: GUIButton;
  declare BTN_CREATEITEMS: GUIButton;
  declare LB_DESCRIPTION: GUIListBox;
  declare LB_UPGRADELIST: GUIListBox;
  declare BTN_ALL: GUIButton;
  declare LBL_TITLE2: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'upgradesel_p';
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
