/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIListBox, GUIButton, MenuManager } from "../../../gui";

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
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this._button_b = this.BTN_BACK;

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      resolve();
    });
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_MSG.onHoverIn();
    GameState.MenuActive = true;
  }
  
}
