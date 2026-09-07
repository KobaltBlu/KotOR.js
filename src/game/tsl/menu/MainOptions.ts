import { GameState } from "@/GameState";
import type { GUIButton, GUILabel, GUIListBox } from "@/gui";
import { MainOptions as K1_MainOptions } from "@/game/kotor/KOTOR";

/**
 * main options button description TLKs (ctor custom_value / OnEnterSlot).
 * Gameplay 0xa521, Feedback 0x2147a, Autopause 0xa523, Graphics 0xbe2f, Sound 0xbe30.
 */
const TLK_DESC_GAMEPLAY = 0xa521;
const TLK_DESC_FEEDBACK = 0x2147a;
const TLK_DESC_AUTOPAUSE = 0xa523;
const TLK_DESC_GRAPHICS = 0xbe2f;
const TLK_DESC_SOUND = 0xbe30;

/**
 * MainOptions class.
 *
 * (optionsmain_p).
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
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      this.selectedControl = this.BTN_GAMEPLAY;
      this._button_b = this.BTN_BACK;

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

      this.BTN_GAMEPLAY.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_GAMEPLAY);
      });

      this.BTN_FEEDBACK.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_FEEDBACK);
      });

      this.BTN_AUTOPAUSE.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_AUTOPAUSE);
      });

      this.BTN_GRAPHICS.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_GRAPHICS);
      });

      this.BTN_SOUND.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_SOUND);
      });

      resolve();
    });
  }

}
