/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuSkillInfo as K1_MenuSkillInfo, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuSkillInfo menu class.
*/

export class MenuSkillInfo extends K1_MenuSkillInfo {

  declare LBL_MESSAGE: GUILabel;
  declare LB_SKILLS: GUIListBox;
  declare BTN_OK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'skillinfo_p';
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
