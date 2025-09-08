import * as THREE from "three";
import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIButton, GUILabel } from "../../../gui";

type ItemType = 'RANGED' | 'MELEE' | 'LIGHTSABER' | 'ARMOR' | 'NONE';

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

  selected: ItemType = 'NONE';
  btnNormalColor: THREE.Color;
  btnSelectedColor: THREE.Color;

  constructor(){
    super();
    this.gui_resref = 'upgradesel';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
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
        GameState.MenuManager.MenuUpgradeItems.itemType = this.selected;
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

  select(type: ItemType) {
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
  }

  show() {
    super.show();
    this.selected = 'NONE';
  }
  
}
