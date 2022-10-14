/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, GUIControl } from "../../../gui";

/* @file
* The MenuLevelUp menu class.
*/

export class MenuLevelUp extends GameMenu {

  LBL_BG: GUILabel;
  BTN_BACK: GUIButton;
  LBL_5: GUIControl;
  LBL_4: GUIControl;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  LBL_NUM1: GUILabel;
  LBL_NUM2: GUILabel;
  LBL_NUM3: GUILabel;
  LBL_NUM4: GUILabel;
  LBL_NUM5: GUILabel;
  BTN_STEPNAME4: GUIButton;
  BTN_STEPNAME1: GUIButton;
  BTN_STEPNAME2: GUIButton;
  BTN_STEPNAME3: GUIButton;
  BTN_STEPNAME5: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'leveluppnl';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
