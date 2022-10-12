/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuKeyboardEntry as K1_MenuKeyboardEntry, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuKeyboardEntry menu class.
*/

export class MenuKeyboardEntry extends K1_MenuKeyboardEntry {

  declare LBL_Title: GUILabel;
  declare LBL_EventName: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare EDT_NewKey: GUILabel;
  declare LBL_NewKey: GUILabel;
  declare LBL_Desc: GUILabel;
  declare LBL_Instructions: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'optkeyentry_p';
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
