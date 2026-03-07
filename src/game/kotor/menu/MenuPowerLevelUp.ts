import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/**
 * MenuPowerLevelUp class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuPowerLevelUp.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuPowerLevelUp extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  DESC_LBL: GUILabel;
  LB_POWERS: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_POWER: GUILabel;
  RECOMMENDED_BTN: GUIButton;
  SELECT_BTN: GUIButton;
  ACCEPT_BTN: GUIButton;
  BACK_BTN: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pwrlvlup';
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
