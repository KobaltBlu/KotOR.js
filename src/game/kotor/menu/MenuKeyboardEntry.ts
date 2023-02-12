/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIButton } from "../../../gui";

/* @file
* The MenuKeyboardEntry menu class.
*/

export class MenuKeyboardEntry extends GameMenu {

  LBL_Title: GUILabel;
  LBL_EventName: GUILabel;
  BTN_Cancel: GUIButton;
  EDT_NewKey: GUILabel;
  LBL_NewKey: GUILabel;
  LBL_Desc: GUILabel;
  LBL_Instructions: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'optkeyentry';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
}
  
}
