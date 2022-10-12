/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuJournal as K1_MenuJournal, GUIListBox, GUILabel, GUIButton, MenuManager } from "../../../gui";

/* @file
* The MenuJournal menu class.
*/

export class MenuJournal extends K1_MenuJournal {

  declare LB_ITEMS: GUIListBox;
  declare LBL_TITLE: GUILabel;
  declare LBL_ITEM_DESCRIPTION: GUIListBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare BTN_SWAPTEXT: GUIButton;
  declare BTN_FILTER_TIME: GUIButton;
  declare BTN_FILTER_NAME: GUIButton;
  declare BTN_FILTER_PRIORITY: GUIButton;
  declare BTN_FILTER_PLANET: GUIButton;
  declare BTN_MESSAGES: GUIButton;
  declare BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'journal_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {

      this.BTN_MESSAGES = this.getControlByName('BTN_MESSAGES');

      this.BTN_MESSAGES.addEventListener('click', (e) => {
        e.stopPropagation();
        this.Close()
        MenuManager.MenuMessages.Open();
      });
      resolve();
    });
  }

  Show() {
    super.Show();
    GameState.MenuActive = true;
  }
  
}
