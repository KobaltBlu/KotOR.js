/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { MenuUpgradeItems as K1_MenuUpgradeItems } from "../../kotor/KOTOR";

/* @file
* The MenuUpgradeItems menu class.
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

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
