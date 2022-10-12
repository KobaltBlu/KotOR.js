/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIButton, GUILabel } from "../../../gui";

/* @file
* The MenuSaveName menu class.
*/

export class MenuSaveName extends GameMenu {

  BTN_OK: GUIButton;
  BTN_CANCEL: GUIButton;
  EDITBOX: GUILabel;
  LBL_TITLE: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'savename';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  this.tGuiPanel.widget.position.z = 10;
  this.EDITBOX.setText('');
  super.Show();
  GameState.activeGUIElement = this.EDITBOX;
}
  
}
