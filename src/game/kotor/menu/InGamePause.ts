/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUILabel, GUIButton, MenuManager } from "../../../gui";
import { AutoPauseManager } from "../../../managers/AutoPauseManager";

/* @file
* The InGamePause menu class.
*/

export class InGamePause extends GameMenu {

  engineMode: EngineMode = EngineMode.INGAME;
  LBL_PAUSEREASON: GUILabel;
  LBL_PRESS: GUILabel;
  BTN_UNPAUSE: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'pause';
    this.background = '';
    this.voidFill = false;
    this.isOverlayGUI = false;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_UNPAUSE.addEventListener('click', (e: any) => {
        AutoPauseManager.Unpause();
      });
      resolve();
    });
  }

  Show() {
    super.Show();
    this.tGuiPanel.pulsing = true;
    this.LBL_PAUSEREASON.pulsing = true;
    this.LBL_PRESS.pulsing = true;
  }

  Update(delta: number = 0) {
    super.Update(delta);
    this.tGuiPanel.extent.left = (window.innerWidth / 2) - (this.tGuiPanel.extent.width / 2) - 0;
    this.tGuiPanel.extent.top = (-window.innerHeight / 2) + (this.tGuiPanel.extent.height / 2) + 36;
    this.RecalculatePosition();
  }
  
}
