/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuFeedback menu class.
*/

export class MenuFeedback extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  LB_OPTIONS: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'optfeedback';
    this.background = 'blackfill';
    this.voidFill = true;
    this.childMenu = this.manager.MenuTop;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this._button_b = this.BTN_BACK;

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });
      resolve();
    });
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_MSG.onHoverIn();
  }
  
}
