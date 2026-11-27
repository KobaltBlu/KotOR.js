import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { MenuJournal as K1_MenuJournal } from "@/game/kotor/KOTOR";
import { GUIJournalItem } from "@/game/tsl/gui/GUIJournalItem";

enum JournalSort {
  RECIEVED = 0,
  NAME = 1,
  PRIORITY = 2,
  PLANET = 3,
}

/**
 * MenuJournal class.
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;

    this.BTN_MESSAGES = this.getControlByName('BTN_MESSAGES');
    this._button_b = this.BTN_EXIT;
    this.BTN_EXIT.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    this.BTN_MESSAGES?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
      this.manager.MenuMessages.open();
    });
    this.BTN_SWAPTEXT?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.mode = this.mode == 0 ? 1 : 0;
      this.updateList();
      this.UpdateLabels();
    });

    this.LB_ITEMS.setProtoBuilder(GUIJournalItem);
    this.LB_ITEMS.onSelected = (entry: any) => {
      this.selected = entry;
      this.UpdateSelected();
    };
    this.LB_ITEMS.padding = 4;

    this.BTN_FILTER_TIME?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setSortMode(JournalSort.RECIEVED);
    });
    this.BTN_FILTER_NAME?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setSortMode(JournalSort.NAME);
    });
    this.BTN_FILTER_PRIORITY?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setSortMode(JournalSort.PRIORITY);
    });
    this.BTN_FILTER_PLANET?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setSortMode(JournalSort.PLANET);
    });
  }

  updateFilterButtons(){
    this.BTN_FILTER_TIME && (this.BTN_FILTER_TIME.pulsing = this.sort == JournalSort.RECIEVED);
    this.BTN_FILTER_NAME && (this.BTN_FILTER_NAME.pulsing = this.sort == JournalSort.NAME);
    this.BTN_FILTER_PRIORITY && (this.BTN_FILTER_PRIORITY.pulsing = this.sort == JournalSort.PRIORITY);
    this.BTN_FILTER_PLANET && (this.BTN_FILTER_PLANET.pulsing = this.sort == JournalSort.PLANET);
  }

  UpdateLabels(){
    super.UpdateLabels();
    this.updateFilterButtons();
  }
}
