import { EngineState } from "@/enums/engine/EngineState";
import { MenuSaveLoadMode } from "@/enums/gui/MenuSaveLoadMode";
import { GameState } from "@/GameState";
import type { GUIButton, GUILabel, GUIListBox } from "@/gui";
import { Module } from "@/module/Module";
import { NWScript } from "@/nwscript/NWScript";
import { MenuOptions as K1_MenuOptions } from "@/game/kotor/KOTOR";
import { ModuleLoadCoordinator } from '@/engine/ModuleLoadCoordinator';

/**
 * description TLKs (TSL).
 */
const TLK_DESC_LOADGAME = 0xa53c;
const TLK_DESC_SAVEGAME = 0xa53d;
const TLK_DESC_GAMEPLAY = 0xa521;
const TLK_DESC_FEEDBACK = 0x2147a;
const TLK_DESC_AUTOPAUSE = 0xa523;
const TLK_DESC_GRAPHICS = 0xbe2f;
const TLK_DESC_SOUND = 0xbe30;
const TLK_DESC_QUIT = 0xa53e;

/**
 * MenuOptions class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file MenuOptions.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
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

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {

      this.BTN_EXIT.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_LOADGAME.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuSaveLoad.mode = MenuSaveLoadMode.LOADGAME;
        this.manager.MenuSaveLoad.open();
      });

      this.BTN_SAVEGAME.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuSaveLoad.mode = MenuSaveLoadMode.SAVEGAME;
        this.manager.MenuSaveLoad.open();
      });

      this.BTN_GAMEPLAY.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuGameplay.open();
      });

      this.BTN_FEEDBACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.manager.MenuFeedback.open();
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

      this.BTN_QUIT.addEventListener('click', () => {
        GameState.MenuManager.InGameConfirm.showConfirmDialog(42348, () => {
          ModuleLoadCoordinator.UnloadModule();
          GameState.State = EngineState.RUNNING;
                
          if(GameState.module instanceof Module){
            GameState.module.dispose();
            GameState.module = undefined;
          }

          //Remove all cached scripts and kill all running instances
          NWScript.Reload();

          //Resets all keys to their default state
          GameState.controls.initKeys();
          this.manager.MainMenu.Start();
        });
      });

      this.BTN_LOADGAME.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_LOADGAME);
      });
      this.BTN_SAVEGAME.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_SAVEGAME);
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
      this.BTN_QUIT.addEventListener('hover', () => {
        this.setDescription(TLK_DESC_QUIT);
      });

      resolve();
    });
  }

  show() {
    super.show();
    this.setDescription(TLK_DESC_LOADGAME);
  }
  
}
