/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUILabel } from "../../../gui";

/* @file
* The MenuToolTip menu class.
*/

export class MenuToolTip extends GameMenu {

  tooltip: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'tooltip8x6';
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
