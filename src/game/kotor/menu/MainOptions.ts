/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { EngineMode } from "../../../enums/engine/EngineMode";
import { GameMenu, GUIListBox, GUIButton, GUILabel, MenuManager } from "../../../gui";

/* @file
* The MainOptions menu class.
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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
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
      });

      this.BTN_GRAPHICS.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //this.Hide();
        MenuManager.MenuGraphics.Open();
      });

      this.BTN_SOUND.addEventListener('click', (e: any) => {
        e.stopPropagation();
        //this.Hide();
        MenuManager.MenuSound.Open();
      });

      this.BTN_FEEDBACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
      });

      this._button_b = this.BTN_BACK;
      resolve();
    });
  }
  
}
