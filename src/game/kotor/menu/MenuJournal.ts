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
      
      this.LB_ITEMS.protoItem.extent.height = 41;
      this.LB_ITEMS.onSelected = (item: JournalEntry) => {
        this.selected = item;
        this.UpdateSelected();
      }

      this.BTN_SORT.addEventListener('click', (e) => {
        e.stopPropagation();
        switch(this.sort){
          case JournalSort.RECIEVED:
            this.setSortMode(JournalSort.NAME);
          break;
          case JournalSort.NAME:
            this.setSortMode(JournalSort.PRIORITY);
          break;
          case JournalSort.PRIORITY:
            this.setSortMode(JournalSort.PLANET);
          break;
          case JournalSort.PLANET:
            this.setSortMode(JournalSort.RECIEVED);
          break;
        }
      });

      this.BTN_SWAPTEXT.addEventListener('click', (e) => {
        e.stopPropagation();
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

      this.BTN_QUESTITEMS?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuQuestItem.open();
      });

      resolve();
    });
  }

  protected loadPersistedSortMode(){
    const sortOrder = Number(GameState.JournalManager.SortOrder);
    if(sortOrder >= JournalSort.RECIEVED && sortOrder <= JournalSort.PLANET){
      this.sort = sortOrder;
    }else{
      this.sort = JournalSort.RECIEVED;
    }
  }

  protected persistSortMode(){
    GameState.JournalManager.SortOrder = this.sort;
  }

  protected setSortMode(sort: JournalSort){
    this.sort = sort;
    this.persistSortMode();
    this.updateList();
    this.UpdateLabels();
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
    this.BTN_SORT?.setText(this.GetSortModeBTNLabel());
    this.BTN_SWAPTEXT?.setText(this.GetQuestModeBTNLabel());
    this.LBL_TITLE?.setText(this.GetMenuTitle());
  }

  show() {
    super.show();
    this.manager.MenuTop.LBLH_JOU.onHoverIn();

    this.loadPersistedSortMode();
    this.LB_ITEMS.scroll = 0;

    this.updateList();
    this.UpdateLabels();
  }

  updateList(){
    const selectedPlotId = this.selected?.plot_id?.toLocaleLowerCase?.();

    this.LB_ITEMS.selectedItem = undefined;
    this.LBL_ITEM_DESCRIPTION.setItem(null);

    const entries = this.getFilteredEntries();
    this.LB_ITEMS.setItems(entries);

    const nextSelected = entries.find((entry) => {
      return entry?.plot_id?.toLocaleLowerCase?.() == selectedPlotId;
    }) || entries[0];

    if(nextSelected){
      this.selected = nextSelected;
      this.LB_ITEMS.selectItem(nextSelected);
    }else{
      this.selected = undefined;
      this.UpdateSelected();
    }
  }

  getFilteredEntries(){
    const entries = GameState.JournalManager.Entries.slice().filter((entry) => {
      if(this.mode == JournalQuestMode.COMPLETED){
        return entry.isCompleted();
      }

      return !entry.isCompleted();
    });

    return entries.sort( (a, b) => {
      if(this.sort == JournalSort.NAME){
        let nameA = a.getName().toLocaleLowerCase();
        let nameB = b.getName().toLocaleLowerCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        
        return 0;
      }else if(this.sort == JournalSort.RECIEVED){
        if (a.getReceivedSortValue() < b.getReceivedSortValue()) {
          return -1;
        }
        if (a.getReceivedSortValue() > b.getReceivedSortValue()) {
          return 1;
        }
        
        return 0;
      }else if(this.sort == JournalSort.PRIORITY){
        if (a.getPriority() < b.getPriority()) {
          return -1;
        }
        if (a.getPriority() > b.getPriority()) {
          return 1;
        }
        
        return 0;
      }else if(this.sort == JournalSort.PLANET){
        if (a.getPlanetId() < b.getPlanetId()) {
          return -1;
        }
        if (a.getPlanetId() > b.getPlanetId()) {
          return 1;
        }
        
        return 0;
      }

      return 0;
    });
  }

  triggerControllerDUpPress() {
    this.LB_ITEMS.directionalNavigate('up');
  }

  triggerControllerDDownPress() {
    this.LB_ITEMS.directionalNavigate('down');
  }

  triggerControllerBumperLPress() {
    this.manager.MenuTop.BTN_MSG.click();
  }

  triggerControllerBumperRPress() {
    this.manager.MenuTop.BTN_MAP.click();
  }
  
}
