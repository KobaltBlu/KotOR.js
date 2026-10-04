import type { GUIListBox, GUILabel, GUIButton } from "@engine/gui";
import { MenuAbilities as K1_MenuAbilities } from "@engine/games/kotor/menu/MenuAbilities";

/**
 * MenuAbilities class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuAbilities.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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
  declare BTN_CHANGE1: GUIButton;
  declare BTN_CHANGE2: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'abilities_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    // Reuse K1 Skills/Powers/Feats handlers — abilities_p shares control names.
    await super.menuControlInitializer(skipInit);
  }

  show() {
    super.show();
  }
  
}
