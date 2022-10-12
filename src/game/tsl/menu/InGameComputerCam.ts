/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { InGameComputerCam as K1_InGameComputerCam, GUILabel } from "../../../gui";

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

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }

  Open(cam_id = -1) {
    super.Open();
    if (cam_id >= 0) {
      GameState.InGameDialog.SetPlaceableCamera(cam_id);
    } else {
      GameState.currenCamera = GameState.camera;
    }
  }

  Hide() {
    super.Hide();
    GameState.currenCamera = GameState.camera;
  }
  
}