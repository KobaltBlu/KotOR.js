import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";

/**
 * InGamePause class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGamePause.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_UNPAUSE.addEventListener('click', (e) => {
        GameState.AutoPauseManager.Unpause();
      });
      resolve();
    });
  }

  show() {
    super.show();
    this.tGuiPanel.pulsing = true;
    this.LBL_PAUSEREASON.pulsing = true;
    this.LBL_PRESS.pulsing = true;
  }

  update(delta: number = 0) {
    super.update(delta);
    this.tGuiPanel.extent.left = (GameState.ResolutionManager.getViewportWidth() / 2) - (this.tGuiPanel.extent.width / 2) - 0;
    this.tGuiPanel.extent.top = (-GameState.ResolutionManager.getViewportHeight() / 2) + (this.tGuiPanel.extent.height / 2) + 36;
    this.recalculatePosition();
  }
  
}
