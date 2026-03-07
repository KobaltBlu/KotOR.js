import type { GUIButton, GUILabel } from "../../../gui";
import { MenuSaveName as K1_MenuSaveName } from "../../kotor/KOTOR";

/**
 * MenuSaveName class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuSaveName.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuSaveName extends K1_MenuSaveName {

  declare BTN_OK: GUIButton;
  declare BTN_CANCEL: GUIButton;
  declare EDITBOX: GUILabel;
  declare LBL_TITLE: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'savename_p';
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
