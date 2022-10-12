/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuJournal menu class.
*/

export class MenuJournal extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_TITLE: GUILabel;
  LBL_ITEM_DESCRIPTION: GUIListBox;
  BTN_QUESTITEMS: GUIButton;
  BTN_SWAPTEXT: GUIButton;
  BTN_SORT: GUIButton;
  BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'journal';
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
  GameState.MenuTop.LBLH_JOU.onHoverIn();
  GameState.MenuActive = true;
}

triggerControllerBumperLPress() {
  GameState.MenuTop.BTN_MSG.click();
}

triggerControllerBumperRPress() {
  GameState.MenuTop.BTN_MAP.click();
}
  
}
