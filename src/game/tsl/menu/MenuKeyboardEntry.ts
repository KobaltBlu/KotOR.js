import type { GUILabel, GUIButton } from "../../../gui";
import { MenuKeyboardEntry as K1_MenuKeyboardEntry } from "../../kotor/KOTOR";

/**
 * MenuKeyboardEntry class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuKeyboardEntry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuKeyboardEntry extends K1_MenuKeyboardEntry {

  declare LBL_Title: GUILabel;
  declare LBL_EventName: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare EDT_NewKey: GUILabel;
  declare LBL_NewKey: GUILabel;
  declare LBL_Desc: GUILabel;
  declare LBL_Instructions: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'optkeyentry_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_Cancel.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      resolve();
    });
  }
  
}
