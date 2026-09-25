import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { CharGenAbilities as K1_CharGenAbilities } from "@/game/kotor/KOTOR";

/**
 * CharGenAbilities class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file CharGenAbilities.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenAbilities extends K1_CharGenAbilities {

  declare LBL_BONUS_CHA: GUILabel;
  declare LBL_BONUS_WIS: GUILabel;
  declare LBL_BONUS_INT: GUILabel;
  declare LBL_BONUS_CON: GUILabel;
  declare LBL_BONUS_DEX: GUILabel;
  declare LBL_BONUS_STR: GUILabel;
  declare COST_LBL: GUILabel;
  declare SELECTIONS_REMAINING_LBL: GUILabel;
  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare DEX_POINTS_BTN: GUIButton;
  declare DEX_LBL: GUILabel;
  declare DEX_MINUS_BTN: GUIButton;
  declare DEX_PLUS_BTN: GUIButton;
  declare CON_POINTS_BTN: GUIButton;
  declare CON_LBL: GUILabel;
  declare CON_MINUS_BTN: GUIButton;
  declare CON_PLUS_BTN: GUIButton;
  declare WIS_POINTS_BTN: GUIButton;
  declare WIS_LBL: GUILabel;
  declare WIS_MINUS_BTN: GUIButton;
  declare WIS_PLUS_BTN: GUIButton;
  declare INT_POINTS_BTN: GUIButton;
  declare INT_LBL: GUILabel;
  declare INT_MINUS_BTN: GUIButton;
  declare INT_PLUS_BTN: GUIButton;
  declare CHA_POINTS_BTN: GUIButton;
  declare CHA_LBL: GUILabel;
  declare CHA_MINUS_BTN: GUIButton;
  declare CHA_PLUS_BTN: GUIButton;
  declare LB_DESC: GUIListBox;
  declare STR_POINTS_BTN: GUIButton;
  declare STR_LBL: GUILabel;
  declare STR_MINUS_BTN: GUIButton;
  declare STR_PLUS_BTN: GUIButton;
  declare REMAINING_SELECTIONS_LBL: GUILabel;
  declare COST_POINTS_LBL: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_ACCEPT: GUIButton;
  declare BTN_RECOMMENDED: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'abchrgen_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      //The K1 initializer is skipped above, so wire the shared handlers here.
      this.wireControls();
      resolve();
    });
  }

}
