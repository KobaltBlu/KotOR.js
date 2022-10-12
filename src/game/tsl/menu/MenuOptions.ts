/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { GameState } from "../../../GameState";
import { MenuOptions as K1_MenuOptions, GUIButton, GUILabel, GUIListBox, MenuManager } from "../../../gui";

/* @file
* The MenuOptions menu class.
*/

export class MenuOptions extends K1_MenuOptions {

  declare BTN_SAVEGAME: GUIButton;
  declare BTN_GAMEPLAY: GUIButton;
  declare BTN_QUIT: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare BTN_FEEDBACK: GUIButton;
  declare BTN_AUTOPAUSE: GUIButton;
  declare BTN_GRAPHICS: GUIButton;
  declare BTN_SOUND: GUIButton;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare BTN_EXIT: GUIButton;
  declare BTN_LOADGAME: GUIButton;
  declare LB_DESC: GUIListBox;

  constructor(){
    super();
    this.gui_resref = 'optionsingame_p';
    this.background = 'blackfill';
    this.voidFill = true;
  }

  async MenuControlInitializer() {
    await super.MenuControlInitializer();
    return new Promise<void>((resolve, reject) => {

      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.BTN_LOADGAME.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuSaveLoad.mode = 'load';
        MenuManager.MenuSaveLoad.Open();
      });

      this.BTN_SAVEGAME.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuSaveLoad.mode = 'save';
        MenuManager.MenuSaveLoad.Open();
      });

      this.BTN_GRAPHICS.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuGraphics.Open();
      });

      this.BTN_SOUND.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuSound.Open();
      });

      this.BTN_QUIT.addEventListener('click', () => {
        GameState.Mode = GameState.MODES.MAINMENU;
        GameState.UnloadModule();
        GameState.State = GameState.STATES.RUNNING;
              
        if(GameState.module instanceof Module){
          GameState.module.dispose();
          GameState.module = undefined;
        }

        //Remove all cached scripts and kill all running instances
        NWScript.Reload();

        //Resets all keys to their default state
        GameState.controls.InitKeys();
        MenuManager.MainMenu.Open();
      });
      resolve();
    });
  }

  Show() {
    super.Show();
    GameState.MenuActive = true;
  }
  
}
