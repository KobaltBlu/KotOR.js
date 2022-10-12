/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, GUIListBox } from "../../../gui";

/* @file
* The CharGenAbilities menu class.
*/

export class CharGenAbilities extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  DEX_POINTS_BTN: GUIButton;
  DEX_LBL: GUILabel;
  DEX_MINUS_BTN: GUIButton;
  DEX_PLUS_BTN: GUIButton;
  CON_POINTS_BTN: GUIButton;
  CON_PLUS_BTN: GUIButton;
  CON_MINUS_BTN: GUIButton;
  CON_LBL: GUILabel;
  WIS_POINTS_BTN: GUIButton;
  WIS_LBL: GUILabel;
  WIS_MINUS_BTN: GUIButton;
  WIS_PLUS_BTN: GUIButton;
  INT_POINTS_BTN: GUIButton;
  INT_PLUS_BTN: GUIButton;
  INT_MINUS_BTN: GUIButton;
  INT_LBL: GUILabel;
  CHA_POINTS_BTN: GUIButton;
  CHA_PLUS_BTN: GUIButton;
  CHA_MINUS_BTN: GUIButton;
  CHA_LBL: GUILabel;
  DESC_LBL: GUILabel;
  COST_LBL: GUILabel;
  COST_POINTS_LBL: GUILabel;
  LBL_MODIFIER: GUILabel;
  LBL_ABILITY_MOD: GUILabel;
  LB_DESC: GUIListBox;
  STR_POINTS_BTN: GUIButton;
  STR_LBL: GUILabel;
  STR_MINUS_BTN: GUIButton;
  STR_PLUS_BTN: GUIButton;
  BTN_RECOMMENDED: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'abchrgen';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise((resolve, reject) => {
    });
}
  
}
