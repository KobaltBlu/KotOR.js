/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import type { GUILabel, GUIListBox } from "../../../gui";
import { MenuDebug as K1_MenuDebug } from "../../kotor/KOTOR";

/* @file
* The MenuDebug menu class.
*/

export class MenuDebug extends K1_MenuDebug {

  declare LBL_BUILD: GUILabel;
  declare LB_OPTIONS: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'debug_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
