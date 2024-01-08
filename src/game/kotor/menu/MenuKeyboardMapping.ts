import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/**
 * MenuKeyboardMapping class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuKeyboardMapping.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuKeyboardMapping extends GameMenu {

  LST_EventList: GUIListBox;
  BTN_Default: GUIButton;
  BTN_Accept: GUIButton;
  BTN_Cancel: GUIButton;
  LBL_Title: GUILabel;
  BTN_Filter_Move: GUIButton;
  BTN_Filter_Game: GUIButton;
  BTN_Filter_Mini: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optkeymapping';
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
