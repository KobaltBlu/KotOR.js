import { GameMenu } from "../../../gui";
import type { GUILabel } from "../../../gui";

/**
 * MenuToolTip class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuToolTip.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuToolTip extends GameMenu {

  tooltip: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'tooltip8x6';
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
