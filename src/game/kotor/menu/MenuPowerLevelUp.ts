/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuPowerLevelUp menu class.
*/

export class MenuPowerLevelUp extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  DESC_LBL: GUILabel;
  LB_POWERS: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_POWER: GUILabel;
  RECOMMENDED_BTN: GUIButton;
  SELECT_BTN: GUIButton;
  ACCEPT_BTN: GUIButton;
  BACK_BTN: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pwrlvlup';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
    });
}
  
}
