/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUIListBox } from "../../../gui";

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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
