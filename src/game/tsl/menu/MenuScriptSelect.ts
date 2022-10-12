/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuScriptSelect as K1_MenuScriptSelect, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuScriptSelect menu class.
*/

export class MenuScriptSelect extends K1_MenuScriptSelect {

  declare LST_AIState: GUIListBox;
  declare LB_DESC: GUIListBox;
  declare LBL_TITLE: GUILabel;
  declare BTN_Back: GUIButton;
  declare BTN_Accept: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'scriptselect_p';
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
