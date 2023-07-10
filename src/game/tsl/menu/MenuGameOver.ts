/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameMenu } from "../../../gui";
import type { GUIButton, GUILabel } from "../../../gui";

/* @file
* The MenuGameOver menu class.
*/

export class MenuGameOver extends GameMenu {

  declare BTN_LASTSAVE: GUIButton;
  declare BTN_LOADGAME: GUIButton;
  declare BTN_QUIT: GUIButton;
  declare LBL_MESSAGE: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'gameover_p';
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
