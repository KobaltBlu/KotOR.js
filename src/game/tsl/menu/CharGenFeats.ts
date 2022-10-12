/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { CharGenFeats as K1_CharGenFeats, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The CharGenFeats menu class.
*/

export class CharGenFeats extends K1_CharGenFeats {

  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare STD_SELECTIONS_REMAINING_LBL: GUILabel;
  declare STD_REMAINING_SELECTIONS_LBL: GUILabel;
  declare LB_DESC: GUIListBox;
  declare LBL_NAME: GUILabel;
  declare BTN_SELECT: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_ACCEPT: GUIButton;
  declare BTN_RECOMMENDED: GUIButton;
  declare LB_FEATS: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'ftchrgen_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}