/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUIListBox, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuScriptSelect menu class.
*/

export class MenuScriptSelect extends GameMenu {

  LST_AIState: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_TITLE: GUILabel;
  BTN_Back: GUIButton;
  BTN_Accept: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'scriptselect';
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
