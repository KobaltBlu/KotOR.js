import { GameState } from "@/GameState";
import { JournalEntry } from "@/engine/JournalEntry";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";

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

/**
 * MenuJournal class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuJournal.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    this.childMenu = this.manager.MenuTop;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;

      this.LB_ITEMS.onSelected = (item: JournalEntry) => {
        this.selected = item;
        this.UpdateSelected();
      }

      this.BTN_SORT.addEventListener('click', (e) => {
        e.stopPropagation();
        switch(this.sort){
          case JournalSort.RECIEVED:
            this.sort = JournalSort.NAME;
            this.updateList();
          break;
          case JournalSort.NAME:
            this.sort = JournalSort.PRIORITY;
            this.updateList();
          break;
          case JournalSort.PRIORITY:
            this.sort = JournalSort.PLANET;
            this.updateList();
          break;
          case JournalSort.PLANET:
            this.sort = JournalSort.RECIEVED;
            this.updateList();
          break;
        }
        this.UpdateLabels();
      });

      this.BTN_SWAPTEXT.addEventListener('click', (e) => {
        e.stopPropagation();
        // Retail HandleInputEvent 0x2a — toggle active/done then PopulateItemListBox.
        switch(this.mode){
          case JournalQuestMode.ACTIVE:
            this.mode = JournalQuestMode.COMPLETED;
          break;
          case JournalQuestMode.COMPLETED:
            this.mode = JournalQuestMode.ACTIVE;
          break;
        }
        this.updateList();
        this.UpdateLabels();
      });

      // retail HandleInputEvent 0x29 → AddPanel + PushModalPanel (flags=3).
      this.BTN_QUESTITEMS?.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.guiAudioEmitter?.playSoundFireAndForget?.('gui_click');
        this.manager.MenuQuestItem?.open?.();
      });
      this._button_x = this.BTN_QUESTITEMS;

      resolve();
    });
  }

  /** Pop quest-item modal when journal leaves the screen (retail panel ownership). */
  hide(){
    if(this.manager?.MenuQuestItem?.isVisible?.()){
      this.manager.MenuQuestItem.close();
    }
    super.hide();
  }

  UpdateSelected(){
    this.LBL_ITEM_DESCRIPTION.setItem(this.selected ? this.selected.getEntryText() : null);
  }

  GetQuestModeBTNLabel(): string {
    switch(this.mode){
      case JournalQuestMode.ACTIVE:
        return GameState.TLKManager.GetStringById(STRREF_MODE_COMPLETED).Value;
      case JournalQuestMode.COMPLETED:
        return GameState.TLKManager.GetStringById(STRREF_MODE_ACTIVE).Value;
    }
  }

  GetSortModeBTNLabel(): string {
    switch(this.sort){
      case JournalSort.RECIEVED:
        return GameState.TLKManager.GetStringById(STRREF_BY_NAME).Value;
      case JournalSort.NAME:
        return GameState.TLKManager.GetStringById(STRREF_BY_PRIORITY).Value;
      case JournalSort.PRIORITY:
        return GameState.TLKManager.GetStringById(STRREF_BY_PLANET).Value;
      case JournalSort.PLANET:
        return GameState.TLKManager.GetStringById(STRREF_BY_RECIEVED).Value;
      break;
    }
  }

  GetMenuTitle(): string {
    let questModeLabel = (
      this.mode == JournalQuestMode.ACTIVE ? GameState.TLKManager.GetStringById(STRREF_MODE_ACTIVE).Value :
      this.mode == JournalQuestMode.COMPLETED ? GameState.TLKManager.GetStringById(STRREF_MODE_COMPLETED).Value : ''
    );
    let sortModeLabel = (
      this.sort == JournalSort.RECIEVED ? GameState.TLKManager.GetStringById(STRREF_BY_RECIEVED).Value :
      this.sort == JournalSort.NAME ? GameState.TLKManager.GetStringById(STRREF_BY_NAME).Value :
      this.sort == JournalSort.PRIORITY ? GameState.TLKManager.GetStringById(STRREF_BY_PRIORITY).Value :
      this.sort == JournalSort.PLANET ? GameState.TLKManager.GetStringById(STRREF_BY_PLANET).Value : ''
    );

    return `${questModeLabel} - ${sortModeLabel}`;
  }

  UpdateLabels(){
    this.BTN_SORT.setText(this.GetSortModeBTNLabel());
    this.BTN_SWAPTEXT.setText(this.GetQuestModeBTNLabel());
    this.LBL_TITLE.setText(this.GetMenuTitle());
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_JOU.onHoverIn();

    this.updateList();
    this.UpdateLabels();
  }

  updateList(){
    const entries = this.getFilteredEntries();
    this.selected = undefined;
    this.LB_ITEMS.setItems(entries, {
      selectIndex: entries.length ? 0 : -1,
    });
    if(entries.length){
      this.selected = entries[0];
      this.UpdateSelected();
    }else{
      this.LBL_ITEM_DESCRIPTION.setItem(null);
    }
  }

  getFilteredEntries(){
    // Retail PopulateItemListBox walks active or done lists (End bit on category entry).
    const entries = GameState.JournalManager.Entries.slice().filter((entry) => {
      const complete = entry.isComplete();
      return this.mode === JournalQuestMode.COMPLETED ? complete : !complete;
    });

    return entries.sort( (a, b) => {
      if(this.sort == JournalSort.NAME){
        let nameA = a.category?.name?.getTLKValue?.()?.toLocaleLowerCase?.() ?? '';
        let nameB = b.category?.name?.getTLKValue?.()?.toLocaleLowerCase?.() ?? '';
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        
        return 0;
      }else if(this.sort == JournalSort.RECIEVED){
        return GameState.JournalManager.compareReceived(a, b);
      }else if(this.sort == JournalSort.PRIORITY){
        if ((a.category?.priority ?? 0) < (b.category?.priority ?? 0)) {
          return -1;
        }
        if ((a.category?.priority ?? 0) > (b.category?.priority ?? 0)) {
          return 1;
        }
        
        return 0;
      }else if(this.sort == JournalSort.PLANET){
        if ((a.category?.planet_id ?? 0) < (b.category?.planet_id ?? 0)) {
          return -1;
        }
        if ((a.category?.planet_id ?? 0) > (b.category?.planet_id ?? 0)) {
          return 1;
        }
        
        return 0;
      }

      return 0;
    });
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_MSG.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_MAP.click();
  }
  
}
