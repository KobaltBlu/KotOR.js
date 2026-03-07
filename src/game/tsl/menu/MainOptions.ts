import { GameState } from "../../../GameState";
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

      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_GAMEPLAY.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuGameplay.open();
      });

      this.BTN_AUTOPAUSE.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuAutoPause.open();
      });

      this.BTN_GRAPHICS.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuGraphics.open();
      });

      this.BTN_SOUND.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuSound.open();
      });

      this.BTN_FEEDBACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuFeedback.open();
      });

      this.BTN_GAMEPLAY.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[42273].Value)
      });

      this.BTN_FEEDBACK.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[136314].Value)
      });

      this.BTN_AUTOPAUSE.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[42275].Value)
      });

      this.BTN_GRAPHICS.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[48687].Value)
      });

      this.BTN_SOUND.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(GameState.TLKManager.TLKStrings[48688].Value)
      });

      resolve();
    });
  }
  
}
