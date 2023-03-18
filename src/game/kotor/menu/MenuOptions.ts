/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import { EngineMode } from "../../../enums/engine/EngineMode";
import { EngineState } from "../../../enums/engine/EngineState";
import { MenuSaveLoadMode } from "../../../enums/gui/MenuSaveLoadMode";
import { GameState } from "../../../GameState";
import { GameMenu, GUIButton, GUIControl, GUILabel, GUIListBox, MenuManager } from "../../../gui";
import { TLKManager } from "../../../managers/TLKManager";
import { Module } from "../../../module";
import { NWScript } from "../../../nwscript/NWScript";

/* @file
* The MenuOptions menu class.
*/

export class MenuOptions extends GameMenu {

  BTN_LOADGAME: GUIButton;
  BTN_SAVEGAME: GUIButton;
  BTN_GAMEPLAY: GUIButton;
  BTN_QUIT: GUIButton;
  LBL_TITLE: GUILabel;
  BTN_FEEDBACK: GUIButton;
  BTN_AUTOPAUSE: GUIButton;
  BTN_GRAPHICS: GUIButton;
  BTN_SOUND: GUIButton;
  LB_DESC: GUIListBox;
  BTN_EXIT: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'optionsingame';
    this.background = '1600x1200back';
    this.voidFill = true;
    this.childMenu = MenuManager.MenuTop;
  }

  async MenuControlInitializer(skipInit: boolean = false) {
    await super.MenuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      
      this.BTN_EXIT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.Close();
      });
      this._button_b = this.BTN_EXIT;

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

      this.BTN_LOADGAME.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(TLKManager.TLKStrings[42300].Value)
      });

      this.BTN_SAVEGAME.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(TLKManager.TLKStrings[42301].Value)
      });

      this.BTN_GAMEPLAY.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(TLKManager.TLKStrings[48006].Value)
      });

      this.BTN_FEEDBACK.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(TLKManager.TLKStrings[42274].Value)
      });

      this.BTN_AUTOPAUSE.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(TLKManager.TLKStrings[48572].Value)
      });

      this.BTN_GRAPHICS.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(TLKManager.TLKStrings[48010].Value)
      });

      this.BTN_SOUND.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(TLKManager.TLKStrings[48012].Value)
      });

      this.BTN_QUIT.addEventListener( 'hover', () => {
        this.LB_DESC.clearItems();
        this.LB_DESC.addItem(TLKManager.TLKStrings[42302].Value)
      });

      this.BTN_QUIT.addEventListener('click', () => {
        GameState.UnloadModule();
        GameState.State = EngineState.RUNNING;
              
        if(GameState.module instanceof Module){
          GameState.module.dispose();
          GameState.module = undefined;
        }

        //Remove all cached scripts and kill all running instances
        NWScript.Reload();

        //Resets all keys to their default state
        GameState.controls.initKeys();
        MenuManager.MainMenu.Start();
      });

      this.selectedControl = this.BTN_LOADGAME;
      resolve();
    });
  }

  Show() {
    super.Show();
    MenuManager.MenuTop.LBLH_OPT.onHoverIn();
  }

  triggerControllerDUpPress() {
    if (!this.selectedControl) {
      this.selectedControl = this.BTN_LOADGAME;
    }
    this.BTN_LOADGAME.onHoverOut();
    this.BTN_SAVEGAME.onHoverOut();
    this.BTN_FEEDBACK.onHoverOut();
    this.BTN_GRAPHICS.onHoverOut();
    this.BTN_GAMEPLAY.onHoverOut();
    this.BTN_SOUND.onHoverOut();
    this.BTN_AUTOPAUSE.onHoverOut();
    if (this.selectedControl == this.BTN_QUIT) {
      this.selectedControl = this.BTN_SOUND;
    } else if (this.selectedControl == this.BTN_SOUND) {
      this.selectedControl = this.BTN_GRAPHICS;
    } else if (this.selectedControl == this.BTN_GRAPHICS) {
      this.selectedControl = this.BTN_AUTOPAUSE;
    } else if (this.selectedControl == this.BTN_AUTOPAUSE) {
      this.selectedControl = this.BTN_FEEDBACK;
    } else if (this.selectedControl == this.BTN_FEEDBACK) {
      this.selectedControl = this.BTN_GAMEPLAY;
    } else if (this.selectedControl == this.BTN_GAMEPLAY) {
      this.selectedControl = this.BTN_SAVEGAME;
    } else if (this.selectedControl == this.BTN_SAVEGAME) {
      this.selectedControl = this.BTN_LOADGAME;
    } else if (this.selectedControl == this.BTN_LOADGAME) {
      this.selectedControl = this.BTN_QUIT;
    }
    this.selectedControl.onHoverIn();
  }

  triggerControllerDDownPress() {
    if (!this.selectedControl) {
      this.selectedControl = this.BTN_LOADGAME;
    }
    this.BTN_LOADGAME.onHoverOut();
    this.BTN_SAVEGAME.onHoverOut();
    this.BTN_FEEDBACK.onHoverOut();
    this.BTN_GRAPHICS.onHoverOut();
    this.BTN_GAMEPLAY.onHoverOut();
    this.BTN_SOUND.onHoverOut();
    this.BTN_AUTOPAUSE.onHoverOut();
    if (this.selectedControl == this.BTN_LOADGAME) {
      this.selectedControl = this.BTN_SAVEGAME;
    } else if (this.selectedControl == this.BTN_SAVEGAME) {
      this.selectedControl = this.BTN_GAMEPLAY;
    } else if (this.selectedControl == this.BTN_GAMEPLAY) {
      this.selectedControl = this.BTN_FEEDBACK;
    } else if (this.selectedControl == this.BTN_FEEDBACK) {
      this.selectedControl = this.BTN_AUTOPAUSE;
    } else if (this.selectedControl == this.BTN_AUTOPAUSE) {
      this.selectedControl = this.BTN_GRAPHICS;
    } else if (this.selectedControl == this.BTN_GRAPHICS) {
      this.selectedControl = this.BTN_SOUND;
    } else if (this.selectedControl == this.BTN_SOUND) {
      this.selectedControl = this.BTN_QUIT;
    } else if (this.selectedControl == this.BTN_QUIT) {
      this.selectedControl = this.BTN_LOADGAME;
    }
    this.selectedControl.onHoverIn();
  }

  triggerControllerAPress() {
    if (this.selectedControl instanceof GUIControl) {
      this.selectedControl.click();
    }
  }

  triggerControllerRStickYPress(positive = false) {
    if (positive) {
      this.LB_DESC.scrollUp();
    } else {
      this.LB_DESC.scrollDown();
    }
  }

  triggerControllerBumperLPress() {
    MenuManager.MenuTop.BTN_MAP.click();
  }

  triggerControllerBumperRPress() {
    MenuManager.MenuTop.BTN_EQU.click();
  }
  
}
