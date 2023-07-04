/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { GUIButton, GUILabel, GUIListBox, MenuManager } from "../../../gui";
import { MainOptions as K1_MainOptions } from "../../kotor/KOTOR";
import { EngineMode } from "../../../enums/engine/EngineMode";

/* @file
* The MainOptions menu class.
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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.BTN_GAMEPLAY.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });

      this.BTN_AUTOPAUSE.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuAutoPause.Open();
      });

      this.BTN_GRAPHICS.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuGraphics.Open();
      });

      this.BTN_SOUND.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuSound.Open();
      });

      this.BTN_FEEDBACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });
      resolve();
    });
  }
  
}
