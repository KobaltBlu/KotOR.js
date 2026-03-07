import type { GUIListBox } from "../../../gui";
import { MenuCredits as K1_MenuCredits } from "../../kotor/KOTOR";

/**
 * MenuCredits class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuCredits.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuCredits extends K1_MenuCredits {

  declare LB_CREDITS: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'credits_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
