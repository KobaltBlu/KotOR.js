/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MenuPowerLevelUp as K1_MenuPowerLevelUp } from "../../kotor/KOTOR";

/* @file
* The MenuPowerLevelUp menu class.
*/

export class MenuPowerLevelUp extends K1_MenuPowerLevelUp {

  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare SELECTIONS_REMAINING_LBL: GUILabel;
  declare LB_DESC: GUIListBox;
  declare LBL_POWER: GUILabel;
  declare SELECT_BTN: GUIButton;
  declare REMAINING_SELECTIONS_LBL: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare BACK_BTN: GUIButton;
  declare ACCEPT_BTN: GUIButton;
  declare RECOMMENDED_BTN: GUIButton;
  declare LB_POWERS: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'pwrlvlup_p';
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
