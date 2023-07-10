/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import type { GUIButton, GUIListBox, GUILabel } from "../../../gui";
import { MenuResolutions as K1_MenuResolutions } from "../../kotor/KOTOR";

/* @file
* The MenuResolutions menu class.
*/

export class MenuResolutions extends K1_MenuResolutions {

  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare LB_RESOLUTIONS: GUIListBox;
  declare LBL_RESOLUTION: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'optresolution_p';
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
