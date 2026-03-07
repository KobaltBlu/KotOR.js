import { BaseItemType } from "../../../enums";
import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { GUIInventoryItem } from "../../../gui/protoitem/GUIInventoryItem";
import type { ModuleItem } from "../../../module/ModuleItem";

const MELEE_ITEMS = [BaseItemType.QUARTER_STAFF, BaseItemType.STUN_BATON, BaseItemType.LONG_SWORD, BaseItemType.VIBRO_SWORD, BaseItemType.SHORT_SWORD, BaseItemType.VIBRO_BLADE, BaseItemType.DOUBLE_BLADED_SWORD, BaseItemType.VIBRO_DOUBLE_BLADE, BaseItemType.WOKIE_WARBLADE];
const RANGED_ITEMS = [BaseItemType.BLASTER_PISTOL, BaseItemType.HEAVY_BLASTER, BaseItemType.HOLD_OUT_BLASTER, BaseItemType.ION_BLASTER, BaseItemType.DISRUPTER_PISTOL, BaseItemType.SONIC_PISTOL, BaseItemType.ION_RIFLE, BaseItemType.BOWCASTER, BaseItemType.BLASTER_CARBINE, BaseItemType.DISRUPTER_RIFLE, BaseItemType.SONIC_RIFLE, BaseItemType.REPEATING_BLASTER, BaseItemType.HEAVY_REPEATING_BLASTER];
const LIGHTSABER_ITEMS = [BaseItemType.LIGHTSABER, BaseItemType.DOUBLE_BLADED_LIGHTSABER, BaseItemType.SHORT_LIGHTSABER];
const ARMOR_ITEMS = [BaseItemType.JEDI_ROBE, BaseItemType.JEDI_KNIGHT_ROBE, BaseItemType.JEDI_MASTER_ROBE, BaseItemType.ARMOR_CLASS_4, BaseItemType.ARMOR_CLASS_5, BaseItemType.ARMOR_CLASS_6, BaseItemType.ARMOR_CLASS_7, BaseItemType.ARMOR_CLASS_8, BaseItemType.ARMOR_CLASS_9];

type ItemType = 'RANGED' | 'MELEE' | 'LIGHTSABER' | 'ARMOR' | 'NONE';

/**
 * MenuUpgradeItems class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuUpgradeItems.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgradeItems extends GameMenu {

  LB_ITEMS: GUIListBox;
  LB_DESCRIPTION: GUIListBox;
  LBL_TITLE: GUILabel;
  BTN_UPGRADEITEM: GUIButton;
  BTN_BACK: GUIButton;

  itemType: ItemType = 'LIGHTSABER';
  selected: ModuleItem;

  constructor(){
    super();
    this.gui_resref = 'upgradeitems';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LB_ITEMS.GUIProtoItemClass = GUIInventoryItem;
      this.LB_ITEMS.onSelected = (item: ModuleItem) => {
        this.setSelected(item);
      }
      this.BTN_UPGRADEITEM.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.MenuManager.MenuUpgrade.open();
      });
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;
      resolve();
    });
  }

  checkItem(item: ModuleItem) {
    if(!item.isUpgradable()){
      return false;
    }
    switch(this.itemType){
      case 'RANGED':
        return RANGED_ITEMS.includes(item.baseItemId);
      case 'MELEE':
        return MELEE_ITEMS.includes(item.baseItemId);
      case 'LIGHTSABER':
        return LIGHTSABER_ITEMS.includes(item.baseItemId);
      case 'ARMOR':
        return ARMOR_ITEMS.includes(item.baseItemId);
    }
    return false;
  }

  setSelected(item: ModuleItem) {
    this.selected = item;
    this.LB_DESCRIPTION.clearItems();
    if(item){
      this.LB_DESCRIPTION.addItem(item.getDescription());
    }
  }

  open() {
    super.open();
    this.LB_ITEMS.clearItems();
    this.LB_DESCRIPTION.clearItems();
    this.selected = undefined;

    const inventory = GameState.InventoryManager.getInventory();
    for(let i = 0, len = inventory.length; i < len; i++){
      const item = inventory[i];

      if(!this.checkItem(item)){
        continue;
      }
      this.LB_ITEMS.addItem(item);
    }
  }
  
}
