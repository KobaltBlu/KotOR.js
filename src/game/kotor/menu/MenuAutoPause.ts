/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUICheckBox, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuAutoPause menu class.
*/

export class MenuAutoPause extends GameMenu {

  LBL_TITLE: GUILabel;
  CB_ENEMYSIGHTED: GUICheckBox;
  CB_PARTYKILLED: GUICheckBox;
  CB_ACTIONMENU: GUICheckBox;
  LB_DETAILS: GUIListBox;
  CB_ENDROUND: GUICheckBox;
  CB_TRIGGERS: GUICheckBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  CB_MINESIGHTED: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optautopause';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise((resolve, reject) => {
    });
}
  
}