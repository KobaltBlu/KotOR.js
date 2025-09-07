import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIButton, GUILabel } from "../../../gui";

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

  selected: string = 'NONE';

  constructor(){
    super();
    this.gui_resref = 'upgradesel';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
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

  select(type: string) {
    this.selected = type;
    this.BTN_RANGED.selected = this.selected == 'RANGED';
    this.BTN_LIGHTSABER.selected = this.selected == 'LIGHTSABER';
    this.BTN_MELEE.selected = this.selected == 'MELEE';
    this.BTN_ARMOR.selected = this.selected == 'ARMOR';
  }

  show() {
    super.show();
    this.selected = 'NONE';
  }
  
}
