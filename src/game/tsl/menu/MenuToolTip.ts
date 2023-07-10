/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import type { GUILabel } from "../../../gui";
import { MenuToolTip as K1_MenuToolTip } from "../../kotor/KOTOR";

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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
