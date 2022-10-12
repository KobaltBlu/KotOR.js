/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton } from "../../../gui";

/* @file
* The InGamePause menu class.
*/

export class InGamePause extends GameMenu {

  LBL_PAUSEREASON: GUILabel;
  LBL_PRESS: GUILabel;
  BTN_UNPAUSE: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pause';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  super.Show();
  this.tGuiPanel.pulsing = true;
  this.LBL_PAUSEREASON.pulsing = true;
  this.LBL_PRESS.pulsing = true;
}

Update(delta) {
  super.Update(delta);
  this.tGuiPanel.widget.position.x = window.innerWidth / 2 - GameState.InGamePause.width / 2 - 20;
  this.tGuiPanel.widget.position.y = window.innerHeight / 2 - GameState.InGamePause.height / 2 - 55;
}
  
}
