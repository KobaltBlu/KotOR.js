/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MenuFeedback as K1_MenuFeedback } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";

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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  Show() {
    super.Show();
  }
  
}
