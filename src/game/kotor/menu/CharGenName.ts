/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton } from "../../../gui";

/* @file
* The CharGenName menu class.
*/

export class CharGenName extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  NAME_BOX_EDIT: GUILabel;
  END_BTN: GUIButton;
  BTN_RANDOM: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'name';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  super.Show();
  this.NAME_BOX_EDIT.setText(GameState.player.firstName);
}
  
}
