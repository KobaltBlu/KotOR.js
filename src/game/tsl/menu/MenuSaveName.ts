/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuSaveName as K1_MenuSaveName, GUIButton, GUILabel } from "../../../gui";

/* @file
* The MenuSaveName menu class.
*/

export class MenuSaveName extends K1_MenuSaveName {

  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare EDITBOX: GUILabel;
  declare LBL_TITLE: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'savename_p';
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