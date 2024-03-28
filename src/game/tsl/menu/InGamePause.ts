import { GameState } from "../../../GameState";
import type { GUILabel, GUIButton } from "../../../gui";
import { InGamePause as K1_InGamePause } from "../../kotor/KOTOR";

/**
 * InGamePause class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGamePause.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
      this.BTN_UNPAUSE.addEventListener('click', (e) => {
        GameState.AutoPauseManager.Unpause();
      });
    });
  }

  update(delta: number = 0) {
    super.update(delta);
    this.tGuiPanel.extent.left = (GameState.ResolutionManager.getViewportWidth() / 2) - (this.tGuiPanel.extent.width / 2) - 5;
    this.tGuiPanel.extent.top = (-GameState.ResolutionManager.getViewportHeight() / 2) + (this.tGuiPanel.extent.height / 2) + 45;
    this.recalculatePosition();
  }
  
}
