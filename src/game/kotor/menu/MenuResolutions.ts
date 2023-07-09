/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuResolutions menu class.
*/

export class MenuResolutions extends GameMenu {

  BTN_OK: GUIButton;
  BTN_CANCEL: GUIButton;
  LB_RESOLUTIONS: GUIListBox;
  LBL_RESOLUTION: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'optresolution';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_CANCEL.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_CANCEL;

      this.BTN_OK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });
      resolve();
    });
  }
  
}
