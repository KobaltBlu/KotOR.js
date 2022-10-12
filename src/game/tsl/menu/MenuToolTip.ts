/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuToolTip as K1_MenuToolTip, GUILabel } from "../../../gui";

/* @file
* The MenuToolTip menu class.
*/

export class MenuToolTip extends K1_MenuToolTip {

  declare tooltip: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'tooltip8x6_p';
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
