import * as THREE from "three";
import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIButton, GUILabel } from "@/gui";
import type { ModuleItem } from "@/module/ModuleItem";
import {
  UpgradeCategory,
  categoryToKey,
  getCategoryAvailability,
  getFirstAvailableCategory,
  getUpgradableType,
  type UpgradeCategoryKey,
} from "@/game/item-upgrade-utils";

/**
 * MenuUpgradeSelect class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuUpgradeSelect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgradeSelect extends GameMenu {

  BTN_RANGED: GUIButton;
  LBL_RANGED: GUILabel;
  BTN_LIGHTSABER: GUIButton;
  LBL_LSABER: GUILabel;
  BTN_MELEE: GUIButton;
  LBL_MELEE: GUILabel;
  BTN_ARMOR: GUIButton;
  LBL_ARMOR: GUILabel;
  LBL_TITLE: GUILabel;
  BTN_UPGRADEITEMS: GUIButton;
  BTN_BACK: GUIButton;

  selected: UpgradeCategoryKey = 'NONE';
  btnNormalColor: THREE.Color;
  btnSelectedColor: THREE.Color;
  forcedItem: ModuleItem;
  disableItemCreation: boolean = false;
  disableUpgrade: boolean = false;
  createItemString: string = '';
  skillCharacter: any;

  constructor(){
    super();
    this.gui_resref = 'upgradesel';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.btnSelectedColor = this.BTN_LIGHTSABER.border.color.clone();
      this.btnNormalColor = this.BTN_MELEE.border.color.clone();
      this.BTN_RANGED.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select('RANGED');
      });
      this.BTN_LIGHTSABER.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select('LIGHTSABER');
      });
      this.BTN_MELEE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select('MELEE');
      });
      this.BTN_ARMOR.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select('ARMOR');
      });
      this.BTN_UPGRADEITEMS.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.selected === 'NONE') return;
        GameState.MenuManager.MenuUpgradeItems.itemType = this.selected;
        GameState.MenuManager.MenuUpgradeItems.forcedItem = undefined;
        GameState.MenuManager.MenuUpgradeItems.open();
      });
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
      this._button_b = this.BTN_BACK;
      resolve();
    });
  }

  select(type: UpgradeCategoryKey) {
    const btn = this.buttonForCategory(type);
    if(btn?.disableSelection) return;

    this.selected = type;
    this.BTN_RANGED.selected = this.selected == 'RANGED';
    this.BTN_LIGHTSABER.selected = this.selected == 'LIGHTSABER';
    this.BTN_MELEE.selected = this.selected == 'MELEE';
    this.BTN_ARMOR.selected = this.selected == 'ARMOR';
    this.BTN_RANGED.hover = (this.BTN_RANGED.selected);
    this.BTN_MELEE.hover = (this.BTN_MELEE.selected);
    this.BTN_LIGHTSABER.hover = (this.BTN_LIGHTSABER.selected);
    this.BTN_ARMOR.hover = (this.BTN_ARMOR.selected);
    this.BTN_LIGHTSABER.border.color.copy( this.selected == 'LIGHTSABER' ? this.btnSelectedColor : this.btnNormalColor);
    this.BTN_MELEE.border.color.copy( this.selected == 'MELEE' ? this.btnSelectedColor : this.btnNormalColor);
    this.BTN_RANGED.border.color.copy( this.selected == 'RANGED' ? this.btnSelectedColor : this.btnNormalColor);
    this.BTN_ARMOR.border.color.copy( this.selected == 'ARMOR' ? this.btnSelectedColor : this.btnNormalColor);

    this.BTN_UPGRADEITEMS.disableSelection = this.selected === 'NONE';
  }

  buttonForCategory(type: UpgradeCategoryKey): GUIButton {
    switch(type){
      case 'RANGED': return this.BTN_RANGED;
      case 'LIGHTSABER': return this.BTN_LIGHTSABER;
      case 'MELEE': return this.BTN_MELEE;
      case 'ARMOR': return this.BTN_ARMOR;
      default: return undefined;
    }
  }

  openForcedItem(item: ModuleItem) {
    this.forcedItem = item;
    const category = getUpgradableType(item);
    if(category === UpgradeCategory.NONE){
      this.open();
      return;
    }
    GameState.MenuManager.MenuUpgradeItems.itemType = categoryToKey(category);
    GameState.MenuManager.MenuUpgradeItems.forcedItem = item;
    this.manager.Add(this);
    this.show();
    GameState.MenuManager.MenuUpgradeItems.open();
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

    if(this.forcedItem && !this.disableUpgrade){
      this.openForcedItem(this.forcedItem);
      return;
    }

    super.open();
  }

  show() {
    super.show();
    const availability = getCategoryAvailability();
    this.setCategoryEnabled('LIGHTSABER', availability[UpgradeCategory.LIGHTSABER]);
    this.setCategoryEnabled('RANGED', availability[UpgradeCategory.RANGED]);
    this.setCategoryEnabled('MELEE', availability[UpgradeCategory.MELEE]);
    this.setCategoryEnabled('ARMOR', availability[UpgradeCategory.ARMOR]);

    const first = getFirstAvailableCategory(availability);
    if(first !== UpgradeCategory.NONE){
      this.select(categoryToKey(first));
    }else{
      this.selected = 'NONE';
      this.BTN_UPGRADEITEMS.disableSelection = true;
    }
  }

  setCategoryEnabled(type: UpgradeCategoryKey, enabled: boolean) {
    const btn = this.buttonForCategory(type);
    if(!btn) return;
    btn.disableSelection = !enabled;
  }

  close() {
    this.forcedItem = undefined;
    super.close();
  }

}
