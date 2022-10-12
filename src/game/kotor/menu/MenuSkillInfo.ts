/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuSkillInfo menu class.
*/

export class MenuSkillInfo extends GameMenu {

  LBL_MESSAGE: GUILabel;
  LB_SKILLS: GUIListBox;
  BTN_OK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'skillinfo';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise((resolve, reject) => {
    });
}
  
}
