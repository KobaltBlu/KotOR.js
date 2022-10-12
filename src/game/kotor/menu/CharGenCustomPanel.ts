/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIControl, GUIButton } from "../../../gui";

/* @file
* The CharGenCustomPanel menu class.
*/

export class CharGenCustomPanel extends GameMenu {

  LBL_BG: GUILabel;
  LBL_6: GUIControl;
  LBL_5: GUIControl;
  LBL_4: GUIControl;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  BTN_STEPNAME1: GUIButton;
  LBL_NUM1: GUILabel;
  BTN_STEPNAME2: GUIButton;
  LBL_NUM2: GUILabel;
  BTN_STEPNAME3: GUIButton;
  LBL_NUM3: GUILabel;
  BTN_STEPNAME4: GUIButton;
  LBL_NUM4: GUILabel;
  BTN_STEPNAME5: GUIButton;
  LBL_NUM5: GUILabel;
  BTN_STEPNAME6: GUIButton;
  LBL_NUM6: GUILabel;
  BTN_BACK: GUIButton;
  BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'custpnl';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}
  
}
