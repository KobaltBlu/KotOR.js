/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUIButton, GUILabel } from "../../../gui";

/* @file
* The MenuUpgradeSelect menu class.
*/

export class MenuUpgradeSelect extends GameMenu {

  BTN_RANGED: GUIButton;
  LBL_RANGED: GUILabel;
  BTN_LIGHTSABER: GUIButton;
  LBL_LSABER: GUILabel;
  BTN_MELEE: GUIButton;
  LBL_MELEE: GUILabel;
  BTN_ARMOR: GUIButton;
  LBL_ARMOR: GUILabel;
  LBL_TITLE: GUILabel;
  BTN_UPGRADEITEMS: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'upgradesel';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
