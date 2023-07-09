/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel } from "../../../gui";

/* @file
* The MenuDebug menu class.
*/

export class MenuDebug extends GameMenu {

  LB_OPTIONS: GUIListBox;
  LBL_BUILD: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'debug';
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
