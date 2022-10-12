/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { InGameAreaTransition as K1_InGameAreaTransition, GUILabel } from "../../../gui";

/* @file
* The InGameAreaTransition menu class.
*/

export class InGameAreaTransition extends K1_InGameAreaTransition {

  declare LBL_ICON: GUILabel;
  declare LBL_TEXTBG: GUILabel;
  declare LBL_DESCRIPTION: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'areatrans_p';
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
