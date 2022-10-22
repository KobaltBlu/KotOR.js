/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton, GUIListBox } from "../../../gui";
import { CharGenAbilities as K1_CharGenAbilities } from "../../kotor/KOTOR";

/* @file
* The CharGenAbilities menu class.
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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
