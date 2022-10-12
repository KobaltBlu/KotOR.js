/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuMessages menu class.
*/

export class MenuMessages extends GameMenu {

  LB_MESSAGES: GUIListBox;
  LBL_MESSAGES: GUILabel;
  BTN_EXIT: GUIButton;
  LB_DIALOG: GUIListBox;
  BTN_SHOW: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'messages';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  super.Show();
  GameState.MenuTop.LBLH_MSG.onHoverIn();
  GameState.MenuActive = true;
}

triggerControllerBumperLPress() {
  GameState.MenuTop.BTN_ABI.click();
}

triggerControllerBumperRPress() {
  GameState.MenuTop.BTN_JOU.click();
}
  
}
