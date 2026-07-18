import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { MenuUpgradeItems as K1_MenuUpgradeItems } from "@/game/kotor/KOTOR";
import { GameState } from "@/GameState";
import {
  getUpgradableType,
  type UpgradeItemSource,
} from "@/game/item-upgrade-utils";

/**
 * MenuUpgradeItems class — TSL upgradeitems_p.
 *
 * In TSL the combined selector usually jumps straight into MenuUpgrade.
 * This panel remains available for forced-item / legacy paths and simply
 * forwards the selected source into the assembly panel.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuUpgradeItems.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuUpgradeItems extends K1_MenuUpgradeItems {

  declare LB_ITEMS: GUIListBox;
  declare LB_DESCRIPTION: GUIListBox;
  declare LBL_TITLE: GUILabel;
  declare BTN_UPGRADEITEM: GUIButton;
  declare BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'upgradeitems_p';
    this.background = '1600x1200back';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(false);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      resolve();
    });
  }

  openUpgradePanel() {
    if(!this.selected) return;
    const source: UpgradeItemSource = this.selectedSource || { item: this.selected, equipped: false };
    const category = getUpgradableType(this.selected);
    GameState.MenuManager.MenuUpgrade.openWithItem(source, category);
  }

}
