import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";
import { MenuKeyboardMapping as K1_MenuKeyboardMapping } from "../../kotor/KOTOR";

/**
 * MenuKeyboardMapping class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuKeyboardMapping.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuKeyboardMapping extends K1_MenuKeyboardMapping {

  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LST_EventList: GUIListBox;
  declare LBL_Title: GUILabel;
  declare BTN_Filter_Move: GUIButton;
  declare BTN_Filter_Game: GUIButton;
  declare BTN_Filter_Mini: GUIButton;
  declare LBL_BAR3: GUILabel;
  declare BTN_Cancel: GUIButton;
  declare BTN_Accept: GUIButton;
  declare BTN_Default: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optkeymapping_p';
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
