import type { GUILabel } from "../../../gui";
import { InGameAreaTransition as K1_InGameAreaTransition } from "../../kotor/KOTOR";

/**
 * InGameAreaTransition class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameAreaTransition.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameAreaTransition extends K1_InGameAreaTransition {

  declare LBL_ICON: GUILabel;
  declare LBL_TEXTBG: GUILabel;
  declare LBL_DESCRIPTION: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'areatrans_p';
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
