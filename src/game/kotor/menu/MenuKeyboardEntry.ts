import { GameMenu } from "../../../gui";
import type { GUILabel, GUIButton } from "../../../gui";

/**
 * MenuKeyboardEntry class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuKeyboardEntry.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuKeyboardEntry extends GameMenu {

  LBL_Title: GUILabel;
  LBL_EventName: GUILabel;
  BTN_Cancel: GUIButton;
  EDT_NewKey: GUILabel;
  LBL_NewKey: GUILabel;
  LBL_Desc: GUILabel;
  LBL_Instructions: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'optkeyentry';
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
