/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton, MenuManager } from "../../../gui";

/* @file
* The MenuMessages menu class.
*/

export class MenuMessages extends GameMenu {

  LB_MESSAGES: GUIListBox;
  LBL_MESSAGES: GUILabel;
  BTN_EXIT: GUIButton;
  LB_DIALOG: GUIListBox;
  BTN_SHOW: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'messages';
    this.background = '1600x1200back';
    this.voidFill = true;
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      this._button_b = this.BTN_EXIT;
      resolve();
    });
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_MSG.onHoverIn();
    GameState.MenuActive = true;
  }

  triggerControllerBumperLPress() {
    MenuManager.MenuTop.BTN_ABI.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_JOU.click();
  }
  
}
