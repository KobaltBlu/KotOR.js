import type { GUIButton, GUILabel, GUIListBox } from "../../../gui";
import { MainOptions as K1_MainOptions } from "../../kotor/KOTOR";

/**
 * MainOptions class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MainOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MainOptions extends K1_MainOptions {

  declare BTN_AUTOPAUSE: GUIButton;
  declare BTN_GRAPHICS: GUIButton;
  declare BTN_SOUND: GUIButton;
  declare BTN_FEEDBACK: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_GAMEPLAY: GUIButton;
  declare LB_DESC: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'optionsmain_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_GAMEPLAY.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });

      this.BTN_AUTOPAUSE.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuAutoPause.open();
      });

      this.BTN_GRAPHICS.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuGraphics.open();
      });

      this.BTN_SOUND.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.manager.MenuSound.open();
      });

      this.BTN_FEEDBACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });
      resolve();
    });
  }
  
}
