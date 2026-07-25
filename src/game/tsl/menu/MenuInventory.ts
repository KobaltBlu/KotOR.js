import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUILabel, GUIButton, GUIListBox } from "@/gui";
import { MenuInventory as K1_MenuInventory } from "@/game/kotor/KOTOR";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import {
  InventoryFilter,
  getCurrentInventoryFilter,
  setCurrentInventoryFilter,
  type InventoryListNode,
} from "@/game/inventory-menu-utils";

/** Retail COLOR_YELLOW for active K2 filter buttons. */
const FILTER_COLOR_YELLOW = { r: 1, g: 1, b: 0 };
/** Disabled / inactive filter button text. */
const FILTER_COLOR_DISABLED = { r: 0.5, g: 0.5, b: 0.5 };

/**
 * MenuInventory class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuInventory.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuInventory extends K1_MenuInventory {

  declare LBL_BAR6: GUILabel;
  declare LBL_FILTER: GUILabel;
  declare LBL_INV: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare BTN_USEITEM: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare BTN_ALL: GUIButton;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_CREDITS_VALUE: GUILabel;
  declare BTN_DATAPADS: GUIButton;
  declare BTN_WEAPONS: GUIButton;
  declare BTN_ARMOR: GUIButton;
  declare BTN_USEABLE: GUIButton;
  declare BTN_MISC: GUIButton;
  declare BTN_QUESTS: GUIButton;
  declare BTN_EXIT: GUIButton;
  declare LB_ITEMS: GUIListBox;
  declare LB_DESCRIPTION: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'inventory_p';
    this.background = 'blackfill';
    this.voidFill = true;
    this.isK2Inventory = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_EXIT;

      this.BTN_ALL.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilter(InventoryFilter.ALL);
      });

      this.BTN_DATAPADS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilter(InventoryFilter.DATAPADS);
      });

      this.BTN_WEAPONS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilter(InventoryFilter.WEAPONS);
      });

      this.BTN_ARMOR.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilter(InventoryFilter.ARMOR);
      });

      this.BTN_USEABLE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilter(InventoryFilter.USEABLE_K2);
      });

      this.BTN_QUESTS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilter(InventoryFilter.QUESTS_K2);
      });

      this.BTN_MISC.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setFilter(InventoryFilter.MISC_K2);
      });

      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      this.LB_ITEMS.onSelected = (item: InventoryListNode) => {
        this.selected = item;
        this.UpdateSelected();
      }

      this.BTN_USEITEM?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.useSelectedItem();
      });

      // Retail leaves GFF PADDING (inventory_p.gui LB_ITEMS); do not force 5.
      this.LB_ITEMS.offset.x = 0;
      resolve();
    });
  }

  /** Retail SetNextFilter(int) — set category and highlight active button yellow. */
  setFilter(filter: InventoryFilter){
    setCurrentInventoryFilter(filter);
    this.updateFilterButton();
    this.populateItemListBox();
  }

  updateFilterButton() {
    const filter = getCurrentInventoryFilter();
    const buttons: [GUIButton, InventoryFilter][] = [
      [this.BTN_ALL, InventoryFilter.ALL],
      [this.BTN_DATAPADS, InventoryFilter.DATAPADS],
      [this.BTN_WEAPONS, InventoryFilter.WEAPONS],
      [this.BTN_ARMOR, InventoryFilter.ARMOR],
      [this.BTN_USEABLE, InventoryFilter.USEABLE_K2],
      [this.BTN_QUESTS, InventoryFilter.QUESTS_K2],
      [this.BTN_MISC, InventoryFilter.MISC_K2],
    ];

    for(const [btn, btnFilter] of buttons){
      if(!btn) continue;
      const active = filter === btnFilter;
      btn.pulsing = active;
      const c = active ? FILTER_COLOR_YELLOW : FILTER_COLOR_DISABLED;
      btn.setTextColor?.(c.r, c.g, c.b);
      if(btn.defaultColor){
        btn.defaultColor.setRGB(c.r, c.g, c.b);
      }
    }
  }

  filterInventory(){
    this.populateItemListBox();
  }

  show() {
    // Skip K1 portrait / party-change / filter-cycle labels (inventory_p).
    // Retail OnPanelAdded keeps global filter and only PopulateItemListBox.
    GameMenu.prototype.show.call(this);
    this.manager.MenuTop.LBLH_INV.onHoverIn();
    this.selectedControl = this.LB_ITEMS;
    this.updateFilterButton();
    this.populateItemListBox();
    this.LBL_CREDITS_VALUE?.setText(String(GameState.PartyManager.Gold));
  }
  
}
