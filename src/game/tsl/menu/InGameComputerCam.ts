/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, MenuManager } from "../../../gui";
import { InGameComputerCam as K1_InGameComputerCam } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The InGameComputerCam menu class.
*/

export class InGameComputerCam extends K1_InGameComputerCam {

  declare LBL_RETURN: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'computercam_p';
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
