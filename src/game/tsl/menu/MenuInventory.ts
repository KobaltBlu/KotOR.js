import { GameState } from "../../../GameState";
import { ModuleCreatureArmorSlot } from "../../../enums";
import type { GUILabel, GUIButton, GUIListBox } from "../../../gui";
import { TextureLoader } from "../../../loaders/TextureLoader";
import type { ModuleItem } from "../../../module/ModuleItem";
import { MenuInventory as K1_MenuInventory } from "../../kotor/KOTOR";
import { GUIInventoryItem } from "../gui/GUIInventoryItem";

enum InventoryFilter {
  DATAPADS = 1,
  WEAPONS = 2,
  ARMOR = 4,
  USEABLE = 8,
  QUESTS = 16,
  MISC = 32,
  ALL = -1
};

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

  filter: InventoryFilter = InventoryFilter.ALL;

  constructor(){
    super();
    this.gui_resref = 'inventory_p';
    this.background = 'blackfill';
    this.voidFill = true;
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
        this.filter = InventoryFilter.ALL;
        this.filterInventory();
        this.updateFilterButton();
      });

      this.BTN_DATAPADS.addEventListener('click', (e) => {
        this.filter = InventoryFilter.DATAPADS;
        this.filterInventory();
        this.updateFilterButton();
      });

      this.BTN_WEAPONS.addEventListener('click', (e) => {
        this.filter = InventoryFilter.WEAPONS;
        this.filterInventory();
        this.updateFilterButton();
      });

      this.BTN_ARMOR.addEventListener('click', (e) => {
        this.filter = InventoryFilter.ARMOR;
        this.filterInventory();
        this.updateFilterButton();
      });

      this.BTN_USEABLE.addEventListener('click', (e) => {
        this.filter = InventoryFilter.USEABLE;
        this.filterInventory();
        this.updateFilterButton();
      });

      this.BTN_QUESTS.addEventListener('click', (e) => {
        this.filter = InventoryFilter.QUESTS;
        this.filterInventory();
        this.updateFilterButton();
      });

      this.BTN_MISC.addEventListener('click', (e) => {
        this.filter = InventoryFilter.MISC;
        this.filterInventory();
        this.updateFilterButton();
      });

      this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        this.selected = item;
        this.UpdateSelected();
      }

      this.LB_ITEMS.padding = 5;
      this.LB_ITEMS.offset.x = 0;
      resolve();
    });
  }

  updateFilterButton() {
    this.BTN_ALL.pulsing = this.filter == InventoryFilter.ALL;
    this.BTN_DATAPADS.pulsing = this.filter == InventoryFilter.DATAPADS;
    this.BTN_WEAPONS.pulsing = this.filter == InventoryFilter.WEAPONS;
    this.BTN_ARMOR.pulsing = this.filter == InventoryFilter.ARMOR;
    this.BTN_USEABLE.pulsing = this.filter == InventoryFilter.USEABLE;
    this.BTN_QUESTS.pulsing = this.filter == InventoryFilter.QUESTS;
    this.BTN_MISC.pulsing = this.filter == InventoryFilter.MISC;
  }

  filterInventory(){
    this.LB_ITEMS.clearItems();
    let inventory = GameState.InventoryManager.inventory.slice().filter( (item) => {
      switch(this.filter){
        case InventoryFilter.DATAPADS:
          return item.plot || item.baseItem.itemClass.toLocaleLowerCase() == 'i_datapad';
        case InventoryFilter.WEAPONS:
          return (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.LEFTHAND) == ModuleCreatureArmorSlot.LEFTHAND || 
            (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.RIGHTHAND) == ModuleCreatureArmorSlot.RIGHTHAND;
        case InventoryFilter.ARMOR:
          return (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.ARMOR) == ModuleCreatureArmorSlot.ARMOR || 
            (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.HEAD) == ModuleCreatureArmorSlot.HEAD || 
            (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.ARMS) == ModuleCreatureArmorSlot.ARMS || 
            (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.BELT) == ModuleCreatureArmorSlot.BELT || 
            (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.IMPLANT) == ModuleCreatureArmorSlot.IMPLANT;
        case InventoryFilter.USEABLE:
          return item.baseItem.itemClass.toLocaleLowerCase() == 'i_medeqpmnt' ||
            item.baseItem.itemClass.toLocaleLowerCase() == 'i_drdrepeqp';
        case InventoryFilter.QUESTS:
          return item.plot || item.baseItem.itemClass.toLocaleLowerCase() == 'p_pltuseitm';
        case InventoryFilter.MISC:
          return item.baseItem.itemClass.toLocaleLowerCase() == 'i_adrnaline' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'i_cmbtshot' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'i_collarlgt' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'i_Progspike' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'i_secspike' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'i_torch' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'i_upgrade' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'w_adhsvgren' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'w_cryobgren' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'w_firegren' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'w_flashgren' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'w_fraggren' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'w_poisngren' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'w_sonicgren' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'w_stungren' || 
            item.baseItem.itemClass.toLocaleLowerCase() == 'i_glowrod';
      }
      return true;
    });
    for (let i = 0; i < inventory.length; i++) {
      this.LB_ITEMS.addItem(inventory[i]);
    }
    TextureLoader.LoadQueue();
  }

  show() {
    super.show();
    this.filter = InventoryFilter.ALL;
    this.updateFilterButton();
  }
  
}
