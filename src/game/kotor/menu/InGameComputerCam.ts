/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GameMenu, GUILabel, MenuManager } from "../../../gui";

/* @file
* The InGameComputerCam menu class.
*/

export class InGameComputerCam extends GameMenu {

  LBL_RETURN: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'computercamera';
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

  Open(cam_id = -1) {
    super.Open();
    if (cam_id >= 0) {
      MenuManager.InGameDialog.SetPlaceableCamera(cam_id);
    } else {
      GameState.currentCamera = GameState.camera;
    }
  }

  Hide() {
    super.Hide();
    GameState.currentCamera = GameState.camera;
  }
  
}
