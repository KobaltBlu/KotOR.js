/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUICheckBox, GUIButton, GUILabel, GUIListBox } from "../../../gui";

/* @file
* The MenuGameplay menu class.
*/

export class MenuGameplay extends GameMenu {

  CB_INVERTCAM: GUICheckBox;
  CB_LEVELUP: GUICheckBox;
  BTN_DIFFICULTY: GUIButton;
  BTN_DIFFLEFT: GUIButton;
  BTN_DIFFRIGHT: GUIButton;
  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  CB_AUTOSAVE: GUICheckBox;
  CB_REVERSE: GUICheckBox;
  CB_DISABLEMOVE: GUICheckBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  BTN_KEYMAP: GUIButton;
  BTN_MOUSE: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgameplay';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
    });
}
  
}
