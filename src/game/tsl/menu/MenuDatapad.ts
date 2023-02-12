/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUIListBox, GUIButton, GameMenu } from "../../../gui";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The MenuDatapad menu class.
*/

export class MenuDatapad extends GameMenu {

  declare LB_MESSAGE: GUIListBox;
  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'datapad_p';
    this.background = '';
    this.voidFill = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
