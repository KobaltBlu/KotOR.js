import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton, GUICheckBox } from "../../../gui";

/**
 * MenuGameplay class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuGameplay.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuGameplay extends GameMenu {

  CB_INVERTCAM: GUICheckBox;
  CB_LEVELUP: GUICheckBox;
  BTN_DIFFICULTY: GUIButton;
  BTN_DIFFLEFT: GUIButton;
  BTN_DIFFRIGHT: GUIButton;
  LBL_TITLE: GUILabel;
  LB_DESC: GUIListBox;
  CB_AUTOSAVE: GUICheckBox;
  CB_REVERSE: GUICheckBox;
  CB_DISABLEMOVE: GUICheckBox;
  BTN_BACK: GUIButton;
  BTN_DEFAULT: GUIButton;
  BTN_KEYMAP: GUIButton;
  BTN_MOUSE: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optgameplay';
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
