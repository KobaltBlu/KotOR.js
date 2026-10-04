import { ModuleCreatureArmorSlot } from "@/enums";
import type { GUILabel, GUIListBox, GUIButton } from "@/gui";
import { ModuleItem } from "@/module";
import { MenuStore as K1_MenuStore } from "@/game/kotor/KOTOR";

enum StoreFilter {
  ALL = -1,
  WEAPONS = 1,
  ARMOR = 2,
  MISC = 3,
}

/**
 * MenuStore class.
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
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

  filter: StoreFilter = StoreFilter.ALL;

  constructor(){
    super();
    this.gui_resref = 'store_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(skipInit);
    if(skipInit) return;
    const filterButtons: [GUIButton, StoreFilter][] = [
      [this.BTN_ALL, StoreFilter.ALL],
      [this.BTN_WEAPONS, StoreFilter.WEAPONS],
      [this.BTN_ARMOR, StoreFilter.ARMOR],
      [this.BTN_MISC, StoreFilter.MISC],
    ];
    for(const [button, filter] of filterButtons){
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.filter = filter;
        this.refreshView();
      });
    }
  }

  protected isWeaponItem(item?: ModuleItem): boolean {
    if(!(item instanceof ModuleItem) || !item.baseItem) return false;
    return (
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.LEFTHAND) == ModuleCreatureArmorSlot.LEFTHAND ||
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.RIGHTHAND) == ModuleCreatureArmorSlot.RIGHTHAND
    );
  }

  protected isArmorItem(item?: ModuleItem): boolean {
    if(!(item instanceof ModuleItem) || !item.baseItem) return false;
    return (
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.ARMOR) == ModuleCreatureArmorSlot.ARMOR ||
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.HEAD) == ModuleCreatureArmorSlot.HEAD ||
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.ARMS) == ModuleCreatureArmorSlot.ARMS ||
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.BELT) == ModuleCreatureArmorSlot.BELT ||
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.IMPLANT) == ModuleCreatureArmorSlot.IMPLANT ||
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.LEFTARMBAND) == ModuleCreatureArmorSlot.LEFTARMBAND ||
      (item.baseItem.equipableSlots & ModuleCreatureArmorSlot.RIGHTARMBAND) == ModuleCreatureArmorSlot.RIGHTARMBAND
    );
  }

  protected matchesFilter(item?: ModuleItem): boolean {
    if(!item || this.filter == StoreFilter.ALL) return true;
    switch(this.filter){
      case StoreFilter.WEAPONS: return this.isWeaponItem(item);
      case StoreFilter.ARMOR: return this.isArmorItem(item);
      case StoreFilter.MISC: return !this.isWeaponItem(item) && !this.isArmorItem(item);
      default: return true;
    }
  }

  protected isStoreItemVisible(item: ModuleItem): boolean {
    return super.isStoreItemVisible(item) && this.matchesFilter(item);
  }

  protected isCustomerItemVisible(item: ModuleItem): boolean {
    return super.isCustomerItemVisible(item) && this.matchesFilter(item);
  }

  protected updateSelectedItemDetails(item?: ModuleItem){
    super.updateSelectedItemDetails(item);
    this.LBL_ONHAND_VALUE.setText(item instanceof ModuleItem ? this.getCustomerItemCount(item).toString() : '');
  }

  protected updateFilterButtons(){
    this.BTN_ALL.pulsing = this.filter == StoreFilter.ALL;
    this.BTN_WEAPONS.pulsing = this.filter == StoreFilter.WEAPONS;
    this.BTN_ARMOR.pulsing = this.filter == StoreFilter.ARMOR;
    this.BTN_MISC.pulsing = this.filter == StoreFilter.MISC;
  }

  show() {
    this.filter = StoreFilter.ALL;
    super.show();
    this.updateFilterButtons();
  }
}
