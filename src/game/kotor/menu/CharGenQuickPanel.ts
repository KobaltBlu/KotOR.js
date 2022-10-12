/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, GUIButton, GUIControl } from "../../../gui";

/* @file
* The CharGenQuickPanel menu class.
*/

export class CharGenQuickPanel extends GameMenu {

  LBL_DECORATION: GUILabel;
  BTN_BACK: GUIButton;
  BTN_CANCEL: GUIButton;
  LBL_3: GUIControl;
  LBL_2: GUIControl;
  LBL_1: GUIControl;
  BTN_STEPNAME1: GUIButton;
  LBL_NUM1: GUILabel;
  BTN_STEPNAME2: GUIButton;
  LBL_NUM2: GUILabel;
  BTN_STEPNAME3: GUIButton;
  LBL_NUM3: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'quickpnl';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer() {
  await super.MenuControlInitializer();
  return new Promise((resolve, reject) => {
  });
}

Show() {
  super.Show();
  this.BTN_STEPNAME2.hide();
  this.LBL_2.hide();
  this.LBL_NUM2.hide();
  this.BTN_STEPNAME3.hide();
  this.LBL_3.hide();
  this.LBL_NUM3.hide();
  if (this.step1) {
    this.BTN_STEPNAME2.show();
    this.LBL_2.show();
    this.LBL_NUM2.show();
  }
  if (this.step2) {
    this.BTN_STEPNAME3.show();
    this.LBL_3.show();
    this.LBL_NUM3.show();
  }
}
  
}
