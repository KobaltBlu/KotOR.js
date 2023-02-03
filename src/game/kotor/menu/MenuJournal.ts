/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton, MenuManager } from "../../../gui";
import { JournalEntry, JournalManager } from "../../../managers/JournalManager";

/* @file
* The MenuJournal menu class.
*/

enum JournalSortMode {
  BY_NAME = 0,
  BY_RECIEVED = 1,
}

export class MenuJournal extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_TITLE: GUILabel;
  LBL_ITEM_DESCRIPTION: GUIListBox;
  BTN_QUESTITEMS: GUIButton;
  BTN_SWAPTEXT: GUIButton;
  BTN_SORT: GUIButton;
  BTN_EXIT: GUIButton;

  selected: JournalEntry;
  mode: number = 0;

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
      this.LB_ITEMS.onSelected = (item: JournalEntry) => {
        this.selected = item;
        this.UpdateSelected();
      }
      resolve();
    });
  }

  UpdateSelected(){
    this.LBL_ITEM_DESCRIPTION.clearItems();
    if(this.selected)
      this.LBL_ITEM_DESCRIPTION.addItem(this.selected.getEntryText());
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_JOU.onHoverIn();

    this.LB_ITEMS.clearItems();
    this.LBL_ITEM_DESCRIPTION.clearItems();
    const entries = JournalManager.Entries;
    for(let i = 0; i < entries.length; i++){
      this.LB_ITEMS.addItem(entries[i]);
    }

    GameState.MenuActive = true;
  }

  triggerControllerBumperLPress() {
    MenuManager.MenuTop.BTN_MSG.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_MAP.click();
  }
  
}
