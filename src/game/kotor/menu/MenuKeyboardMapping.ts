/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUIButton, GUILabel } from "../../../gui";

/* @file
* The MenuKeyboardMapping menu class.
*/

export class MenuKeyboardMapping extends GameMenu {

  LST_EventList: GUIListBox;
  BTN_Default: GUIButton;
  BTN_Accept: GUIButton;
  BTN_Cancel: GUIButton;
  LBL_Title: GUILabel;
  BTN_Filter_Move: GUIButton;
  BTN_Filter_Game: GUIButton;
  BTN_Filter_Mini: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optkeymapping';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
