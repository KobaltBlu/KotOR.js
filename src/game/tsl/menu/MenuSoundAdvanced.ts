/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import type { GUILabel, GUIListBox, GUICheckBox, GUIButton } from "../../../gui";
import { MenuSoundAdvanced as K1_MenuSoundAdvanced } from "../../kotor/KOTOR";

/* @file
* The MenuSoundAdvanced menu class.
*/

export class MenuSoundAdvanced extends K1_MenuSoundAdvanced {

  declare LBL_BAR4: GUILabel;
  declare LBL_TITLE: GUILabel;
  declare LB_DESC: GUIListBox;
  declare CB_FORCESOFTWARE: GUICheckBox;
  declare BTN_EAX: GUIButton;
  declare BTN_EAXLEFT: GUIButton;
  declare BTN_EAXRIGHT: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare BTN_DEFAULT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optsoundadv_p';
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
