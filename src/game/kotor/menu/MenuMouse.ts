import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUISlider, GUICheckBox } from "../../../gui";

/**
 * MenuMouse class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuMouse.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuMouse extends GameMenu {

  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  SLI_MOUSESEN: GUISlider;
  LBL_MOUSESEN: GUILabel;
  CB_REVBUTTONS: GUICheckBox;

  constructor(){
    super();
    this.gui_resref = 'optmouse';
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
