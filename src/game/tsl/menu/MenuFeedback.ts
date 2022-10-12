/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuFeedback as K1_MenuFeedback, GUILabel, GUIListBox, GUIButton } from "../../../gui";

/* @file
* The MenuFeedback menu class.
*/

export class MenuFeedback extends K1_MenuFeedback {

  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare LB_OPTIONS: GUIListBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optfeedback_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  Show() {
    super.Show();
    GameState.MenuActive = true;
  }
  
}
