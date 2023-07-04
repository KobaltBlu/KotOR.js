/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUILabel, GUIButton } from "../../../gui";
import { AutoPauseManager } from "../../../managers/AutoPauseManager";
import { InGamePause as K1_InGamePause } from "../../kotor/KOTOR";

/* @file
* The InGamePause menu class.
*/

export class InGamePause extends K1_InGamePause {

  declare LBL_PAUSEREASON: GUILabel;
  declare LBL_PRESS: GUILabel;
  declare BTN_UNPAUSE: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pause_p';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
      this.BTN_UNPAUSE.addEventListener('click', (e: any) => {
        AutoPauseManager.Unpause();
      });
    });
  }

  Update(delta: number = 0) {
    super.Update(delta);
    this.tGuiPanel.extent.left = (window.innerWidth / 2) - (this.tGuiPanel.extent.width / 2) - 5;
    this.tGuiPanel.extent.top = (-window.innerHeight / 2) + (this.tGuiPanel.extent.height / 2) + 45;
    this.RecalculatePosition();
  }
  
}
