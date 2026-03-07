import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/**
 * MenuScriptSelect class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuScriptSelect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuScriptSelect extends GameMenu {

  LST_AIState: GUIListBox;
  LB_DESC: GUIListBox;
  LBL_TITLE: GUILabel;
  BTN_Back: GUIButton;
  BTN_Accept: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'scriptselect';
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
