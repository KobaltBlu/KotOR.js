/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton, MenuManager } from "../../../gui";

/* @file
* The MenuJournal menu class.
*/

export class MenuJournal extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_TITLE: GUILabel;
  LBL_ITEM_DESCRIPTION: GUIListBox;
  BTN_QUESTITEMS: GUIButton;
  BTN_SWAPTEXT: GUIButton;
  BTN_SORT: GUIButton;
  BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'journal';
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
    MenuManager.MenuTop.LBLH_JOU.onHoverIn();
    GameState.MenuActive = true;
  }

  triggerControllerBumperLPress() {
    MenuManager.MenuTop.BTN_MSG.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_MAP.click();
  }
  
}
