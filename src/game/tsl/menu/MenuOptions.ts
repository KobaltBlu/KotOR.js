/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { EngineMode } from "../../../enums/engine/EngineMode";
import { EngineState } from "../../../enums/engine/EngineState";
import { MenuSaveLoadMode } from "../../../enums/gui/MenuSaveLoadMode";
import { GameState } from "../../../GameState";
import { GUIButton, GUILabel, GUIListBox, MenuManager } from "../../../gui";
import { Module } from "../../../module";
import { NWScript } from "../../../nwscript/NWScript";
import { MenuOptions as K1_MenuOptions } from "../../kotor/KOTOR";

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

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });

      this.BTN_LOADGAME.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
        MenuManager.MenuSaveLoad.Open();
      });

      this.BTN_SAVEGAME.addEventListener('click', (e: any) => {
        e.stopPropagation();
        MenuManager.MenuSaveLoad.mode = MenuSaveLoadMode.SAVEGAME;
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
        GameState.UnloadModule();
        GameState.State = EngineState.RUNNING;
              
        if(GameState.module instanceof Module){
          GameState.module.dispose();
          GameState.module = undefined as any;
        }

        //Remove all cached scripts and kill all running instances
        NWScript.Reload();

        //Resets all keys to their default state
        GameState.controls.initKeys();
        MenuManager.MainMenu.Start();
      });
      resolve();
    });
  }

  Show() {
    super.Show();
  }
  
}
