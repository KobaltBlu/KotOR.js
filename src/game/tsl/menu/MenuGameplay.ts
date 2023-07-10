/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import type { GUILabel, GUICheckBox, GUIButton, GUIListBox } from "../../../gui";
import { MenuGameplay as K1_MenuGameplay } from "../../kotor/KOTOR";

/* @file
* The MenuGameplay menu class.
*/

export class MenuGameplay extends K1_MenuGameplay {

  declare LBL_BAR4: GUILabel;
  declare CB_INVERTCAM: GUICheckBox;
  declare CB_LEVELUP: GUICheckBox;
  declare BTN_DIFFICULTY: GUIButton;
  declare BTN_DIFFLEFT: GUIButton;
  declare BTN_DIFFRIGHT: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare CB_AUTOSAVE: GUICheckBox;
  declare CB_REVERSE: GUICheckBox;
  declare CB_DISABLEMOVE: GUICheckBox;
  declare BTN_KEYMAP: GUIButton;
  declare BTN_MOUSE: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_DEFAULT: GUIButton;
  declare CB_REVERSE_INGAME: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optgameplay_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
