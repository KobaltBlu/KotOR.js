import { GameState } from "@engine/runtime/GameState";
import { GameMenu } from "@engine/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import { GUIInventoryItem } from "@engine/gui/protoitem/GUIInventoryItem";
import type { Creature } from "@engine/module/Creature";
import type { Item } from "@engine/module/Item";
import {
  UpgradeCategory,
  collectUpgradableItems,
  keyToCategory,
  type UpgradeCategoryKey,
  type UpgradeItemSource,
} from "@engine/games/item-upgrade-utils";

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

  itemType: UpgradeCategoryKey = 'NONE';
  selected: Item;
  selectedSource: UpgradeItemSource;
  forcedItem: Item;
  sources: UpgradeItemSource[] = [];

  constructor(){
    super();
    this.gui_resref = 'upgradeitems';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LB_ITEMS.setProtoBuilder(GUIInventoryItem);
      this.LB_ITEMS.onSelected = (item: Item) => {
        this.setSelected(item);
      }
      this.BTN_UPGRADEITEM.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openUpgradePanel();
      });
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;
      resolve();
    });
  }

  setSelected(item: Item) {
    this.selected = item;
    this.selectedSource = this.sources.find(s => s.item === item);
    this.LB_DESCRIPTION.setItem(item ? item.getPropertyDescription() : null);
    this.BTN_UPGRADEITEM.disableSelection = !item;
  }

  openUpgradePanel() {
    if(!this.selected) return;
    const source = this.selectedSource || { item: this.selected, equipped: false };
    GameState.MenuManager.MenuUpgrade.openWithItem(source, keyToCategory(this.itemType));
  }

  open() {
    super.open();
    this.LB_DESCRIPTION.setItem(null);
    this.selected = undefined;
    this.selectedSource = undefined;
    this.BTN_UPGRADEITEM.disableSelection = true;

    if(this.forcedItem){
      this.sources = [{
        item: this.forcedItem,
        equipped: this.isItemEquipped(this.forcedItem),
        creature: this.findEquippedCreature(this.forcedItem)?.creature,
        equipSlot: this.findEquippedCreature(this.forcedItem)?.equipSlot,
      }];
      this.LB_ITEMS.setItems(this.sources.map(s => s.item));
      // forced-item path opens the upgrade panel immediately.
      this.setSelected(this.forcedItem);
      this.openUpgradePanel();
      return;
    }

    const category = keyToCategory(this.itemType);
    this.sources = collectUpgradableItems(category === UpgradeCategory.NONE ? UpgradeCategory.NONE : category);
    this.LB_ITEMS.setItems(this.sources.map(s => s.item));
    if(this.sources.length){
      this.setSelected(this.sources[0].item);
    }
  }

  isItemEquipped(item: Item): boolean {
    return !!this.findEquippedCreature(item);
  }

  findEquippedCreature(item: Item): { creature: Creature; equipSlot: number } | undefined {
    const party = GameState.PartyManager?.party || [];
    for(let p = 0; p < party.length; p++){
      const creature = party[p];
      if(!creature) continue;
      for(let slotBit = 0; slotBit < 20; slotBit++){
        const slot = 1 << slotBit;
        const equipped = creature.GetItemInSlot?.(slot) || creature.getItemInSlot?.(slot);
        if(equipped === item){
          return { creature, equipSlot: slot };
        }
      }
    }
    return undefined;
  }

  close() {
    this.forcedItem = undefined;
    super.close();
  }

}
