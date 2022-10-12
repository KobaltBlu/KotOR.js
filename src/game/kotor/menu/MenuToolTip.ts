/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel } from "../../../gui";

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

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise((resolve, reject) => {
    });
}
  
}
