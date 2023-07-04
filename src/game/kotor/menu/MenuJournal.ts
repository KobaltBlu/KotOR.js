/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { JournalEntry, MenuManager, TLKManager, JournalManager } from "../../../managers";

/* @file
* The MenuJournal menu class.
*/

enum JournalSort {
  RECIEVED = 0,
  NAME = 1,
  PRIORITY = 2,
  PLANET = 3,
}

enum JournalQuestMode {
  ACTIVE = 0,
  COMPLETED = 1,
}

const STRREF_TITLE = 32178;

const STRREF_BY_RECIEVED  = 32173;
const STRREF_BY_NAME      = 32174;
const STRREF_BY_PRIORITY  = 32175;
const STRREF_BY_PLANET    = 32176;

const STRREF_MODE_ACTIVE    = 32177;
const STRREF_MODE_COMPLETED = 32178;

export class MenuJournal extends GameMenu {

  LB_ITEMS: GUIListBox;
  LBL_TITLE: GUILabel;
  LBL_ITEM_DESCRIPTION: GUIListBox;
  BTN_QUESTITEMS: GUIButton;
  BTN_SWAPTEXT: GUIButton;
  BTN_SORT: GUIButton;
  BTN_EXIT: GUIButton;

  selected: JournalEntry;
  sort: JournalSort = JournalSort.RECIEVED;
  mode: JournalQuestMode = JournalQuestMode.ACTIVE;

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

      this.BTN_SORT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        switch(this.sort){
          case JournalSort.RECIEVED:
            this.sort = JournalSort.NAME;
          break;
          case JournalSort.NAME:
            this.sort = JournalSort.PRIORITY;
          break;
          case JournalSort.PRIORITY:
            this.sort = JournalSort.PLANET;
          break;
          case JournalSort.PLANET:
            this.sort = JournalSort.RECIEVED;
          break;
        }
        this.UpdateLabels();
      });

      this.BTN_SWAPTEXT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        switch(this.mode){
          case JournalQuestMode.ACTIVE:
            this.mode = JournalQuestMode.COMPLETED;
          break;
          case JournalQuestMode.COMPLETED:
            this.mode = JournalQuestMode.ACTIVE;
          break;
        }
        this.UpdateLabels();
      });

      resolve();
    });
  }

  UpdateSelected(){
    this.LBL_ITEM_DESCRIPTION.clearItems();
    if(this.selected)
      this.LBL_ITEM_DESCRIPTION.addItem(this.selected.getEntryText());
  }

  GetQuestModeBTNLabel(): string {
    switch(this.mode){
      case JournalQuestMode.ACTIVE:
        return TLKManager.GetStringById(STRREF_MODE_COMPLETED).Value;
      case JournalQuestMode.COMPLETED:
        return TLKManager.GetStringById(STRREF_MODE_ACTIVE).Value;
    }
  }

  GetSortModeBTNLabel(): string {
    switch(this.sort){
      case JournalSort.RECIEVED:
        return TLKManager.GetStringById(STRREF_BY_NAME).Value;
      case JournalSort.NAME:
        return TLKManager.GetStringById(STRREF_BY_PRIORITY).Value;
      case JournalSort.PRIORITY:
        return TLKManager.GetStringById(STRREF_BY_PLANET).Value;
      case JournalSort.PLANET:
        return TLKManager.GetStringById(STRREF_BY_RECIEVED).Value;
      break;
    }
  }

  GetMenuTitle(): string {
    let questModeLabel = (
      this.mode == JournalQuestMode.ACTIVE ? TLKManager.GetStringById(STRREF_MODE_ACTIVE).Value :
      this.mode == JournalQuestMode.COMPLETED ? TLKManager.GetStringById(STRREF_MODE_COMPLETED).Value : ''
    );
    let sortModeLabel = (
      this.sort == JournalSort.RECIEVED ? TLKManager.GetStringById(STRREF_BY_RECIEVED).Value :
      this.sort == JournalSort.NAME ? TLKManager.GetStringById(STRREF_BY_NAME).Value :
      this.sort == JournalSort.PRIORITY ? TLKManager.GetStringById(STRREF_BY_PRIORITY).Value :
      this.sort == JournalSort.PLANET ? TLKManager.GetStringById(STRREF_BY_PLANET).Value : ''
    );

    return `${questModeLabel} - ${sortModeLabel}`;
  }

  UpdateLabels(){
    this.BTN_SORT.setText(this.GetSortModeBTNLabel());
    this.BTN_SWAPTEXT.setText(this.GetQuestModeBTNLabel());
    this.LBL_TITLE.setText(this.GetMenuTitle());
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

    this.UpdateLabels();
  }

  triggerControllerBumperLPress() {
    MenuManager.MenuTop.BTN_MSG.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_MAP.click();
  }
  
}
