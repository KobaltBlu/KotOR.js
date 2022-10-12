/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { CharGenCustomPanel as K1_CharGenCustomPanel, GUIControl, GUIButton, GUILabel } from "../../../gui";

/* @file
* The CharGenCustomPanel menu class.
*/

export class CharGenCustomPanel extends K1_CharGenCustomPanel {

  declare LBL_6: GUIControl;
  declare LBL_5: GUIControl;
  declare LBL_4: GUIControl;
  declare LBL_3: GUIControl;
  declare LBL_2: GUIControl;
  declare LBL_1: GUIControl;
  declare BTN_STEPNAME1: GUIButton;
  declare LBL_NUM1: GUILabel;
  declare BTN_STEPNAME2: GUIButton;
  declare LBL_NUM2: GUILabel;
  declare BTN_STEPNAME3: GUIButton;
  declare LBL_NUM3: GUILabel;
  declare BTN_STEPNAME4: GUIButton;
  declare LBL_NUM4: GUILabel;
  declare BTN_STEPNAME5: GUIButton;
  declare LBL_NUM5: GUILabel;
  declare BTN_STEPNAME6: GUIButton;
  declare LBL_NUM6: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'custpnl_p';
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
