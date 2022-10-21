/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUICheckBox, GUIListBox, GUIButton } from "../../../gui";
import { MenuAutoPause as K1_MenuAutoPause } from "../../kotor/KOTOR";

/* @file
* The MenuAutoPause menu class.
*/

export class MenuAutoPause extends K1_MenuAutoPause {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare CB_ENEMYSIGHTED: GUICheckBox;
  declare CB_PARTYKILLED: GUICheckBox;
  declare CB_ACTIONMENU: GUICheckBox;
  declare LB_DETAILS: GUIListBox;
  declare CB_ENDROUND: GUICheckBox;
  declare CB_TRIGGERS: GUICheckBox;
  declare CB_MINESIGHTED: GUICheckBox;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optautopause_p';
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
