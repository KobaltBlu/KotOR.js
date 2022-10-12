/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuKeyboardMapping as K1_MenuKeyboardMapping, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuKeyboardMapping menu class.
*/

export class MenuKeyboardMapping extends K1_MenuKeyboardMapping {

  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LST_EventList: GUIListBox;
  declare LBL_Title: GUILabel;
  declare BTN_Filter_Move: GUIButton;
  declare BTN_Filter_Game: GUIButton;
  declare BTN_Filter_Mini: GUIButton;
  declare LBL_BAR3: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare BTN_Accept: GUIButton;
  declare BTN_Default: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optkeymapping_p';
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
