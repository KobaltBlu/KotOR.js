/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIButton, GUIListBox, GUILabel } from "../../../gui";

/* @file
* The MenuResolutions menu class.
*/

export class MenuResolutions extends GameMenu {

  BTN_OK: GUIButton;
  BTN_CANCEL: GUIButton;
  LB_RESOLUTIONS: GUIListBox;
  LBL_RESOLUTION: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'optresolution';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}
  
}
