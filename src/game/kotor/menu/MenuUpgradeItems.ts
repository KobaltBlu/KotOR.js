import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

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

  constructor(){
    super();
    this.gui_resref = 'upgradeitems';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
