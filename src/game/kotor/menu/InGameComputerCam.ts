import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu } from "../../../gui";
import type { GUILabel } from "../../../gui";

/**
 * InGameComputerCam class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameComputerCam.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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
