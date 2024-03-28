import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

/**
 * MainOptions class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MainOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MainOptions extends GameMenu {

  LB_DESC: GUIListBox;
  BTN_GAMEPLAY: GUIButton;
  BTN_AUTOPAUSE: GUIButton;
  BTN_GRAPHICS: GUIButton;
  BTN_SOUND: GUIButton;
  BTN_FEEDBACK: GUIButton;
  LBL_TITLE: GUILabel;
  BTN_BACK: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optionsmain';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_GAMEPLAY.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      this.BTN_AUTOPAUSE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuAutoPause.open();
      });

      this.BTN_GRAPHICS.addEventListener('click', (e) => {
        e.stopPropagation();
        //this.Hide();
        this.manager.MenuGraphics.open();
      });

      this.BTN_SOUND.addEventListener('click', (e) => {
        e.stopPropagation();
        //this.Hide();
        this.manager.MenuSound.open();
      });

      this.BTN_FEEDBACK.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      this._button_b = this.BTN_BACK;
      resolve();
    });
  }
  
}
