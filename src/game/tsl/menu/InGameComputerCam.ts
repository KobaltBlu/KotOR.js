import type { GUILabel } from "../../../gui";
import { InGameComputerCam as K1_InGameComputerCam } from "../../kotor/KOTOR";

/**
 * InGameComputerCam class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameComputerCam.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameComputerCam extends K1_InGameComputerCam {

  declare LBL_RETURN: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'computercam_p';
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
