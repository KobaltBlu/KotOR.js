/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel } from "../../../gui";

/* @file
* The InGameComputerCam menu class.
*/

export class InGameComputerCam extends GameMenu {

  engineMode: EngineMode = EngineMode.DIALOG;
  LBL_RETURN: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'computercamera';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
