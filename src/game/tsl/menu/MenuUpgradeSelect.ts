import { GameMenu } from "@/gui";
import type { GUIButton, GUILabel, GUIListBox } from "@/gui";
import { GUIInventoryItem } from "@/gui/protoitem/GUIInventoryItem";
import { GameState } from "@/GameState";
import type { ModuleItem } from "@/module/ModuleItem";
import { MenuUpgradeSelect as K1_MenuUpgradeSelect } from "@/game/kotor/KOTOR";
import {
  UpgradeCategory,
  categoryToKey,
  collectUpgradableItems,
  getCategoryAvailability,
  getFirstAvailableCategory,
  getUpgradableType,
  keyToCategory,
  type UpgradeCategoryKey,
  type UpgradeItemSource,
} from "@/game/item-upgrade-utils";

/**
 * MenuUpgradeSelect class — TSL upgradesel_p combined filter/item selector.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuUpgradeSelect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgradeSelect extends K1_MenuUpgradeSelect {

  declare BTN_RANGED: GUIButton;
  declare BTN_LIGHTSABER: GUIButton;
  declare BTN_MELEE: GUIButton;
  declare BTN_ARMOR: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare BTN_UPGRADEITEMS: GUIButton;
  declare BTN_BACK: GUIButton;
  declare BTN_CREATEITEMS: GUIButton;
  declare LB_DESCRIPTION: GUIListBox;
  declare LB_UPGRADELIST: GUIListBox;
  declare BTN_ALL: GUIButton;
  declare LBL_TITLE2: GUILabel;

  filterCategory: UpgradeCategoryKey | 'ALL' = 'ALL';
  sources: UpgradeItemSource[] = [];
  selectedItem: ModuleItem;

  constructor(){
    super();
    this.gui_resref = 'upgradesel_p';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.LB_UPGRADELIST?.setProtoBuilder?.(GUIInventoryItem);
      if(this.LB_UPGRADELIST){
        this.LB_UPGRADELIST.onSelected = (item: ModuleItem) => {
          this.onItemSelected(item);
        };
      }

      this.BTN_ALL?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onFilterPicked('ALL');
      });
      this.BTN_RANGED?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onFilterPicked('RANGED');
      });
      this.BTN_LIGHTSABER?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onFilterPicked('LIGHTSABER');
      });
      this.BTN_MELEE?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onFilterPicked('MELEE');
      });
      this.BTN_ARMOR?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.onFilterPicked('ARMOR');
      });

      this.BTN_UPGRADEITEMS?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openSelectedItem();
      });

      this.BTN_CREATEITEMS?.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.MenuManager.MenuComponent?.open({
          character: this.skillCharacter,
          createItemString: this.createItemString,
        });
      });

      this.BTN_BACK?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;
      resolve();
    });
  }

  onFilterPicked(filter: UpgradeCategoryKey | 'ALL') {
    this.filterCategory = filter;
    this.updateFilterButtons();
    this.populateItemList();
  }

  updateFilterButtons() {
    const availability = getCategoryAvailability();
    this.setFilterEnabled(this.BTN_LIGHTSABER, availability[UpgradeCategory.LIGHTSABER]);
    this.setFilterEnabled(this.BTN_RANGED, availability[UpgradeCategory.RANGED]);
    this.setFilterEnabled(this.BTN_MELEE, availability[UpgradeCategory.MELEE]);
    this.setFilterEnabled(this.BTN_ARMOR, availability[UpgradeCategory.ARMOR]);
    if(this.BTN_ALL){
      this.BTN_ALL.disableSelection = false;
      this.BTN_ALL.selected = this.filterCategory === 'ALL';
      this.BTN_ALL.hover = this.filterCategory === 'ALL';
    }
    this.BTN_LIGHTSABER.selected = this.filterCategory === 'LIGHTSABER';
    this.BTN_RANGED.selected = this.filterCategory === 'RANGED';
    this.BTN_MELEE.selected = this.filterCategory === 'MELEE';
    this.BTN_ARMOR.selected = this.filterCategory === 'ARMOR';
  }

  setFilterEnabled(btn: GUIButton, enabled: boolean) {
    if(!btn) return;
    btn.disableSelection = !enabled;
  }

  populateItemList() {
    const category = this.filterCategory === 'ALL'
      ? UpgradeCategory.NONE
      : keyToCategory(this.filterCategory);
    this.sources = collectUpgradableItems(category);
    this.LB_UPGRADELIST?.setItems?.(this.sources.map(s => s.item));
    this.selectedItem = undefined;
    this.LB_DESCRIPTION?.setItem?.(null);
    this.BTN_UPGRADEITEMS.disableSelection = true;

    if(this.sources.length){
      this.onItemSelected(this.sources[0].item);
    }
  }

  onItemSelected(item: ModuleItem) {
    this.selectedItem = item;
    this.LB_DESCRIPTION?.setItem?.(item ? item.getPropertyDescription() : null);
    this.BTN_UPGRADEITEMS.disableSelection = !item;
  }

  openSelectedItem() {
    if(!this.selectedItem) return;
    const source = this.sources.find(s => s.item === this.selectedItem) || {
      item: this.selectedItem,
      equipped: false,
    };
    const category = getUpgradableType(this.selectedItem);
    GameState.MenuManager.MenuUpgrade.openWithItem(source, category);
  }

  open(args?: {
    forcedItem?: ModuleItem;
    skillCharacter?: any;
    disableItemCreation?: boolean;
    disableUpgrade?: boolean;
    createItemString?: string;
  }) {
    this.forcedItem = args?.forcedItem;
    this.skillCharacter = args?.skillCharacter;
    this.disableItemCreation = !!args?.disableItemCreation;
    this.disableUpgrade = !!args?.disableUpgrade;
    this.createItemString = args?.createItemString || '';

    if(this.disableUpgrade && this.disableItemCreation){
      return;
    }

    if(this.disableUpgrade){
      // Creation-only workshop — opens create panel; MenuComponent (itemcreate).
      GameState.MenuManager.MenuComponent?.open({
        character: this.skillCharacter,
        createItemString: this.createItemString,
      });
      return;
    }

    if(this.forcedItem){
      const category = getUpgradableType(this.forcedItem);
      if(category === UpgradeCategory.NONE){
        super.open();
        return;
      }
      this.manager.Add(this);
      this.show();
      const source = {
        item: this.forcedItem,
        equipped: false,
      };
      GameState.MenuManager.MenuUpgrade.openWithItem(source, category);
      return;
    }

    super.open();
  }

  show() {
    // Use GameMenu.show directly; skip K1 category-button defaults.
    GameMenu.prototype.show.call(this);

    if(this.BTN_CREATEITEMS){
      this.BTN_CREATEITEMS.disableSelection = this.disableItemCreation;
      if(this.disableItemCreation){
        this.BTN_CREATEITEMS.hide?.();
      }else{
        this.BTN_CREATEITEMS.show?.();
      }
    }

    const availability = getCategoryAvailability();
    const first = getFirstAvailableCategory(availability);
    this.filterCategory = first !== UpgradeCategory.NONE ? categoryToKey(first) : 'ALL';
    this.updateFilterButtons();
    this.populateItemList();
  }

}
