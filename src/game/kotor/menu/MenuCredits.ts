/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, MenuManager } from "../../../gui";

/* @file
* The MenuCredits menu class.
*/

export class MenuCredits extends GameMenu {

  LB_CREDITS: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'credits';
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
