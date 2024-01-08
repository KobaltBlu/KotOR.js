import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel } from "../../../gui";

/**
 * MenuDebug class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuDebug.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuDebug extends GameMenu {

  LB_OPTIONS: GUIListBox;
  LBL_BUILD: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'debug';
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
