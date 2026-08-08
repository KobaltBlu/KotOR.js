import type { GUILabel, GUIListBox, GUIButton } from "@/gui";
import { MenuStore as K1_MenuStore, StoreFilter } from "@/game/kotor/KOTOR";

/**
 * MenuStore class — TSL store_p; buy/sell handlers inherited from K1.
 * Wires retail CSWGuiStore filter buttons and LBL_ONHAND_VALUE.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuStore.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuStore extends K1_MenuStore {

  declare LBL_BAR5: GUILabel;
  declare LB_INVITEMS: GUIListBox;
  declare LB_DESCRIPTION: GUIListBox;
  declare LB_SHOPITEMS: GUIListBox;
  declare LBL_BUYSELL: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare LBL_COST: GUILabel;
  declare LBL_STOCK: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_FILTER: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare BTN_Accept: GUIButton;
  declare BTN_Examine: GUIButton;
  declare LBL_COST_VALUE: GUILabel;
  declare LBL_CREDITS_VALUE: GUILabel;
  declare LBL_STOCK_VALUE: GUILabel;
  declare LBL_ONHAND: GUILabel;
  declare LBL_ONHAND_VALUE: GUILabel;
  declare BTN_ALL: GUIButton;
  declare BTN_WEAPONS: GUIButton;
  declare BTN_ARMOR: GUIButton;
  declare BTN_MISC: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'store_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(skipInit);
    if(skipInit) return;

    this.BTN_ALL?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setStoreFilter(StoreFilter.ALL);
    });
    this.BTN_WEAPONS?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setStoreFilter(StoreFilter.WEAPONS);
    });
    this.BTN_ARMOR?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setStoreFilter(StoreFilter.ARMOR);
    });
    this.BTN_MISC?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setStoreFilter(StoreFilter.MISC);
    });
  }

  setStoreFilter(filter: StoreFilter){
    this.filter = filter;
    this.updateFilterButtons();
    this.show();
  }

  updateFilterButtons(){
    if(this.BTN_ALL) this.BTN_ALL.pulsing = this.filter === StoreFilter.ALL;
    if(this.BTN_WEAPONS) this.BTN_WEAPONS.pulsing = this.filter === StoreFilter.WEAPONS;
    if(this.BTN_ARMOR) this.BTN_ARMOR.pulsing = this.filter === StoreFilter.ARMOR;
    if(this.BTN_MISC) this.BTN_MISC.pulsing = this.filter === StoreFilter.MISC;
  }

  setOnHandValue(value: string){
    this.LBL_ONHAND_VALUE?.setText(value);
  }

  show(){
    this.updateFilterButtons();
    super.show();
  }
}
