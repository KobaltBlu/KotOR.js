/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuCredits as K1_MenuCredits, GUIListBox } from "../../../gui";

/* @file
* The MenuCredits menu class.
*/

export class MenuCredits extends K1_MenuCredits {

  declare LB_CREDITS: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'credits_p';
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
