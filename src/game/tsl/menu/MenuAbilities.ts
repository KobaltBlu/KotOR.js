/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { MenuAbilities as K1_MenuAbilities } from "../../kotor/KOTOR";

/* @file
* The MenuAbilities menu class.
*/

export class MenuAbilities extends K1_MenuAbilities {

  declare LB_DESC_FEATS: GUIListBox;
  declare LBL_BAR6: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_INFOBG: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LB_DESC: GUIListBox;
  declare LBL_NAME: GUILabel;
  declare LBL_SKILLRANK: GUILabel;
  declare LBL_RANKVAL: GUILabel;
  declare LBL_BONUS: GUILabel;
  declare LBL_BONUSVAL: GUILabel;
  declare LBL_TOTAL: GUILabel;
  declare LBL_TOTALVAL: GUILabel;
  declare BTN_POWERS: GUIButton;
  declare BTN_SKILLS: GUIButton;
  declare BTN_FEATS: GUIButton;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_FILTER: GUILabel;
  declare LBL_ABILITIES: GUILabel;
  declare BTN_EXIT: GUIButton;
  declare LB_ABILITY: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'abilities_p';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  show() {
    super.show();
  }
  
}
