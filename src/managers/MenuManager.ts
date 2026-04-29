import * as KOTOR from "@/game/kotor/KOTOR";
import * as TSL from "@/game/tsl/TSL";
import { GameState } from "@/GameState";
import { EngineMode, GameEngineType } from "@/enums/engine";
import type { GUIControl, GameMenu } from "@/gui";
import { ActionMenuManager } from "@/engine/menu/ActionMenuManager";
import { EngineState } from "@/enums/engine/EngineState";
import { PerformanceMonitor } from "@/utility/PerformanceMonitor";

/**
 * MenuManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuManager {
  static pulseOpacity: number;
  static activeMenus: GameMenu[];
  static activeModals: GameMenu[];
  static pulse: number;

  static activeGUIElement: GUIControl;
  static hoveredGUIElement: GUIControl;

  //References to the game menus
  static CharGenAbilities: KOTOR.CharGenAbilities;
  static CharGenClass: KOTOR.CharGenClass;
  static CharGenCustomPanel: KOTOR.CharGenCustomPanel;
  static CharGenFeats: KOTOR.CharGenFeats;
  static CharGenMain: KOTOR.CharGenMain;
  static CharGenName: KOTOR.CharGenName;
  static CharGenPortCust: KOTOR.CharGenPortCust;
  static CharGenQuickOrCustom: KOTOR.CharGenQuickOrCustom;
  static CharGenQuickPanel: KOTOR.CharGenQuickPanel;
  static CharGenSkills: KOTOR.CharGenSkills;
  static InGameAreaTransition: KOTOR.InGameAreaTransition;
  static InGameBark: KOTOR.InGameBark;
  static InGameComputer: KOTOR.InGameComputer;
  static InGameComputerCam: KOTOR.InGameComputerCam;
  static InGameConfirm: KOTOR.InGameConfirm;
  static InGameDialog: KOTOR.InGameDialog;
  static InGameOverlay: KOTOR.InGameOverlay;
  static InGamePause: KOTOR.InGamePause;
  static LoadScreen: KOTOR.LoadScreen;
  static MainMenu: KOTOR.MainMenu;
  static MainMovies: KOTOR.MainMovies;
  static MainMusic: TSL.MainMusic;
  static MainOptions: KOTOR.MainOptions;
  static MenuAbilities: KOTOR.MenuAbilities;
  static MenuAutoPause: KOTOR.MenuAutoPause;
  static MenuCharacter: KOTOR.MenuCharacter;
  static MenuChemicals: TSL.MenuChemicals;
  static MenuContainer: KOTOR.MenuContainer;
  static MenuEquipment: KOTOR.MenuEquipment;
  static MenuFeedback: KOTOR.MenuFeedback;
  static MenuGalaxyMap: KOTOR.MenuGalaxyMap;
  static MenuGameplay: KOTOR.MenuGameplay;
  static MenuGraphics: KOTOR.MenuGraphics;
  static MenuGraphicsAdvanced: KOTOR.MenuGraphicsAdvanced;
  static MenuInventory: KOTOR.MenuInventory;
  static MenuJournal: KOTOR.MenuJournal;
  static MenuLevelUp: KOTOR.MenuLevelUp;
  static MenuMap: KOTOR.MenuMap;
  static MenuMessages: KOTOR.MenuMessages;
  static MenuOptions: KOTOR.MenuOptions;
  static MenuPartySelection: KOTOR.MenuPartySelection;
  static MenuPazaakWager: KOTOR.MenuPazaakWager;
  static MenuPazaakGame: KOTOR.MenuPazaakGame;
  static MenuPazaakSetup: KOTOR.MenuPazaakSetup;
  static MenuResolutions: KOTOR.MenuResolutions;
  static MenuSaveLoad: KOTOR.MenuSaveLoad;
  static MenuSaveName: KOTOR.MenuSaveName;
  static MenuSound: KOTOR.MenuSound;
  static MenuSoundAdvanced: KOTOR.MenuSoundAdvanced;
  static MenuStore: KOTOR.MenuStore;
  static MenuSwoopUp: TSL.MenuSwoopUp;
  static MenuTop: KOTOR.MenuTop;
  static MenuToolTip: KOTOR.MenuToolTip;
  static MenuMouse: KOTOR.MenuMouse;
  static MenuKeyboardMapping: KOTOR.MenuKeyboardMapping;
  static MenuKeyboardEntry: KOTOR.MenuKeyboardEntry;
  static MenuUpgrade: KOTOR.MenuUpgrade;
  static MenuUpgradeItems: KOTOR.MenuUpgradeItems;
  static MenuUpgradeSelect: KOTOR.MenuUpgradeSelect;

  static Init(){

    MenuManager.activeMenus = [];
    MenuManager.activeModals = [];
    MenuManager.pulse = 0;
    MenuManager.pulseOpacity = 1;

  }

  static Add(menu: GameMenu){
    if(!menu) return;

    MenuManager.MenuToolTip.hide();
    
    if(!menu.isOverlayGUI){
      //Hide the current top most menu in the list before adding the new Menu
      if(MenuManager.activeMenus.length)
        MenuManager.activeMenus[MenuManager.activeMenus.length-1].hide();

      const idx = MenuManager.activeMenus.indexOf(menu);
      if(idx >= 0)
        MenuManager.activeMenus.splice(idx, 1);
      
      MenuManager.activeMenus.push(menu);
  
      MenuManager.Resize();
    }else{
      if(MenuManager.activeModals.indexOf(menu) == -1)
        MenuManager.activeModals.push(menu);
    }
  }

  static Remove(menu: GameMenu){
    if(!menu) return;

    if(!menu.isOverlayGUI){
      const mIdx = MenuManager.activeMenus.indexOf(menu);
      if(mIdx >= 0)
        MenuManager.activeMenus.splice(mIdx, 1);

      //Reshow the new top most menu in the list
      if(MenuManager.activeMenus.length)
        MenuManager.GetCurrentMenu().show();

      MenuManager.Resize();

      if((!MenuManager.activeMenus.length || MenuManager.activeMenus[MenuManager.activeMenus.length-1].engineMode != EngineMode.GUI) && GameState.Mode !== EngineMode.MOVIE){
        GameState.RestoreEnginePlayMode();
      }
    }else{
      const mIdx = MenuManager.activeModals.indexOf(menu);
      if(mIdx >= 0)
        MenuManager.activeModals.splice(mIdx, 1);
    }
  }

  static ClearMenus(){
    while(MenuManager.activeMenus.length){
      MenuManager.activeMenus[0].close();
    }
    while(MenuManager.activeModals.length){
      MenuManager.activeModals[0].close();
    }
    if(GameState.Mode == EngineMode.LOADING){
      GameState.MenuManager.LoadScreen.open();
    }
  }

  static GetCurrentMenu(){
    return MenuManager.activeMenus[MenuManager.activeMenus.length-1];
  }

  /** Topmost menu for input: overlay modals above the regular menu stack. */
  static GetForegroundMenu(): GameMenu | undefined {
    if(MenuManager.activeModals.length){
      return MenuManager.activeModals[MenuManager.activeModals.length - 1];
    }
    if(MenuManager.activeMenus.length){
      return MenuManager.activeMenus[MenuManager.activeMenus.length - 1];
    }
    return undefined;
  }

  static Resize(){
    for(let i = 0, len = MenuManager.activeMenus.length; i < len; i++){
      MenuManager.activeMenus[i].resize();
    }
  }

  static Update(delta = 0){
    GameState.CursorManager.updateCursor();
    GameState.CursorManager.cursor.material.depthTest = false;
    GameState.CursorManager.cursor.material.depthWrite = false;
    GameState.CursorManager.cursor.renderOrder = 9999999;

    MenuManager.pulse += 5 * delta;
    // Map time * speed to a full sine wave cycle (0 to 2π)
    const wave = Math.sin(MenuManager.pulse);
    // Convert sine range (-1 to 1) to 0 to 1
    MenuManager.pulseOpacity = (wave + 1) / 2;

    // if(MenuManager.pulse > 2){
    //   MenuManager.pulse = 0;
    // }

    // if(this.pulse > 2){
    //   MenuManager.pulseOpacity = 0;
    // }

    // if(this.pulse > 1){
    //   MenuManager.pulseOpacity = this.pulse - 1;
    // }else{
    //   MenuManager.pulseOpacity = 1 - this.pulse;
    // }

    if(GameState.Mode == EngineMode.INGAME && MenuManager.InGameOverlay.bVisible){
      MenuManager.InGameOverlay.update(delta);
    }

    if(GameState.Mode == EngineMode.INGAME && GameState.State == EngineState.PAUSED){
      MenuManager.InGamePause.update(delta);
    }

    let activeMenus = MenuManager.activeMenus;
    for(let i = 0, len = activeMenus.length; i < len; i++){
      activeMenus[i].update(delta);
    }

    let activeModals = MenuManager.activeModals;
    for(let i = 0, len = activeModals.length; i < len; i++){
      activeModals[i].update(delta);
    }

    if(GameState.scene_gui.children.indexOf(GameState.scene_cursor_holder) != GameState.scene_gui.children.length){
      GameState.scene_cursor_holder.remove(GameState.scene_gui);
      GameState.scene_gui.add(GameState.scene_cursor_holder);
    }

  }

  static async GameMenuLoader(menuConstructor: any): Promise<GameMenu> {
    PerformanceMonitor.start(menuConstructor.name+'.GameMenuLoader');
    const menu: GameMenu = new menuConstructor();
    menu.manager = MenuManager;
    await menu.load();
    PerformanceMonitor.stop(menuConstructor.name+'.GameMenuLoader');
    return menu;
  }  
  
  static async LoadMainGameMenus(){
    try{
      if(GameState.GameKey == GameEngineType.KOTOR){
        [
          MenuManager.LoadScreen,
          MenuManager.MainMenu,
          MenuManager.MainMovies,
          MenuManager.MainOptions,
          MenuManager.MenuResolutions,
          MenuManager.MenuSaveLoad,
          MenuManager.MenuSaveName,
          MenuManager.MenuGameplay,
          MenuManager.MenuGraphics,
          MenuManager.MenuGraphicsAdvanced,
          MenuManager.MenuAutoPause,
          MenuManager.MenuToolTip,
          MenuManager.MenuSound,
          MenuManager.MenuSoundAdvanced,
          MenuManager.MenuMouse,
          MenuManager.MenuKeyboardMapping,
          MenuManager.MenuKeyboardEntry,
          MenuManager.InGameConfirm,
        ] = await Promise.all([
          MenuManager.GameMenuLoader(KOTOR.LoadScreen),
          MenuManager.GameMenuLoader(KOTOR.MainMenu),
          MenuManager.GameMenuLoader(KOTOR.MainMovies),
          MenuManager.GameMenuLoader(KOTOR.MainOptions),
          MenuManager.GameMenuLoader(KOTOR.MenuResolutions),
          MenuManager.GameMenuLoader(KOTOR.MenuSaveLoad),
          MenuManager.GameMenuLoader(KOTOR.MenuSaveName),
          MenuManager.GameMenuLoader(KOTOR.MenuGameplay),
          MenuManager.GameMenuLoader(KOTOR.MenuGraphics),
          MenuManager.GameMenuLoader(KOTOR.MenuGraphicsAdvanced),
          MenuManager.GameMenuLoader(KOTOR.MenuAutoPause),
          MenuManager.GameMenuLoader(KOTOR.MenuToolTip),
          MenuManager.GameMenuLoader(KOTOR.MenuSound),
          MenuManager.GameMenuLoader(KOTOR.MenuSoundAdvanced),
          MenuManager.GameMenuLoader(KOTOR.MenuMouse),
          MenuManager.GameMenuLoader(KOTOR.MenuKeyboardMapping),
          MenuManager.GameMenuLoader(KOTOR.MenuKeyboardEntry),
          MenuManager.GameMenuLoader(KOTOR.InGameConfirm),
        ]) as [
          KOTOR.LoadScreen, KOTOR.MainMenu, KOTOR.MainMovies, KOTOR.MainOptions,
          KOTOR.MenuResolutions, KOTOR.MenuSaveLoad, KOTOR.MenuSaveName, KOTOR.MenuGameplay,
          KOTOR.MenuGraphics, KOTOR.MenuGraphicsAdvanced, KOTOR.MenuAutoPause, KOTOR.MenuToolTip,
          KOTOR.MenuSound, KOTOR.MenuSoundAdvanced, KOTOR.MenuMouse, KOTOR.MenuKeyboardMapping,
          KOTOR.MenuKeyboardEntry, KOTOR.InGameConfirm,
        ];
      }else if(GameState.GameKey == GameEngineType.TSL){
        [
          MenuManager.LoadScreen,
          MenuManager.MainMenu,
          MenuManager.MainMovies,
          MenuManager.MainMusic,
          MenuManager.MainOptions,
          MenuManager.MenuResolutions,
          MenuManager.MenuSaveLoad,
          MenuManager.MenuSaveName,
          MenuManager.MenuGameplay,
          MenuManager.MenuGraphics,
          MenuManager.MenuGraphicsAdvanced,
          MenuManager.MenuAutoPause,
          MenuManager.MenuToolTip,
          MenuManager.MenuSound,
          MenuManager.MenuSoundAdvanced,
          MenuManager.MenuMouse,
          MenuManager.MenuKeyboardMapping,
          MenuManager.MenuKeyboardEntry,
          MenuManager.InGameConfirm,
        ] = await Promise.all([
          MenuManager.GameMenuLoader(TSL.LoadScreen),
          MenuManager.GameMenuLoader(TSL.MainMenu),
          MenuManager.GameMenuLoader(TSL.MainMovies),
          MenuManager.GameMenuLoader(TSL.MainMusic),
          MenuManager.GameMenuLoader(TSL.MainOptions),
          MenuManager.GameMenuLoader(TSL.MenuResolutions),
          MenuManager.GameMenuLoader(TSL.MenuSaveLoad),
          MenuManager.GameMenuLoader(TSL.MenuSaveName),
          MenuManager.GameMenuLoader(TSL.MenuGameplay),
          MenuManager.GameMenuLoader(TSL.MenuGraphics),
          MenuManager.GameMenuLoader(TSL.MenuGraphicsAdvanced),
          MenuManager.GameMenuLoader(TSL.MenuAutoPause),
          MenuManager.GameMenuLoader(TSL.MenuToolTip),
          MenuManager.GameMenuLoader(TSL.MenuSound),
          MenuManager.GameMenuLoader(TSL.MenuSoundAdvanced),
          MenuManager.GameMenuLoader(TSL.MenuMouse),
          MenuManager.GameMenuLoader(TSL.MenuKeyboardMapping),
          MenuManager.GameMenuLoader(TSL.MenuKeyboardEntry),
          MenuManager.GameMenuLoader(TSL.InGameConfirm),
        ]) as [
          KOTOR.LoadScreen, KOTOR.MainMenu, KOTOR.MainMovies, TSL.MainMusic, KOTOR.MainOptions,
          KOTOR.MenuResolutions, KOTOR.MenuSaveLoad, KOTOR.MenuSaveName, KOTOR.MenuGameplay,
          KOTOR.MenuGraphics, KOTOR.MenuGraphicsAdvanced, KOTOR.MenuAutoPause, KOTOR.MenuToolTip,
          KOTOR.MenuSound, KOTOR.MenuSoundAdvanced, KOTOR.MenuMouse, KOTOR.MenuKeyboardMapping,
          KOTOR.MenuKeyboardEntry, KOTOR.InGameConfirm,
        ];
      }
    }catch(e){
      console.error(e);
    }
  }
  
  static async LoadCharGenGameMenus(){
    try{
      if(GameState.GameKey == GameEngineType.KOTOR){
        [
          MenuManager.CharGenMain,
          MenuManager.CharGenAbilities,
          MenuManager.CharGenClass,
          MenuManager.CharGenCustomPanel,
          MenuManager.CharGenFeats,
          MenuManager.CharGenName,
          MenuManager.CharGenPortCust,
          MenuManager.CharGenQuickOrCustom,
          MenuManager.CharGenQuickPanel,
          MenuManager.CharGenSkills,
        ] = await Promise.all([
          MenuManager.GameMenuLoader(KOTOR.CharGenMain),
          MenuManager.GameMenuLoader(KOTOR.CharGenAbilities),
          MenuManager.GameMenuLoader(KOTOR.CharGenClass),
          MenuManager.GameMenuLoader(KOTOR.CharGenCustomPanel),
          MenuManager.GameMenuLoader(KOTOR.CharGenFeats),
          MenuManager.GameMenuLoader(KOTOR.CharGenName),
          MenuManager.GameMenuLoader(KOTOR.CharGenPortCust),
          MenuManager.GameMenuLoader(KOTOR.CharGenQuickOrCustom),
          MenuManager.GameMenuLoader(KOTOR.CharGenQuickPanel),
          MenuManager.GameMenuLoader(KOTOR.CharGenSkills),
        ]) as [
          KOTOR.CharGenMain, KOTOR.CharGenAbilities, KOTOR.CharGenClass, KOTOR.CharGenCustomPanel,
          KOTOR.CharGenFeats, KOTOR.CharGenName, KOTOR.CharGenPortCust, KOTOR.CharGenQuickOrCustom,
          KOTOR.CharGenQuickPanel, KOTOR.CharGenSkills,
        ];
      }else if(GameState.GameKey == GameEngineType.TSL){
        [
          MenuManager.CharGenAbilities,
          MenuManager.CharGenClass,
          MenuManager.CharGenCustomPanel,
          MenuManager.CharGenFeats,
          MenuManager.CharGenMain,
          MenuManager.CharGenName,
          MenuManager.CharGenPortCust,
          MenuManager.CharGenQuickOrCustom,
          MenuManager.CharGenQuickPanel,
          MenuManager.CharGenSkills,
        ] = await Promise.all([
          MenuManager.GameMenuLoader(TSL.CharGenAbilities),
          MenuManager.GameMenuLoader(TSL.CharGenClass),
          MenuManager.GameMenuLoader(TSL.CharGenCustomPanel),
          MenuManager.GameMenuLoader(TSL.CharGenFeats),
          MenuManager.GameMenuLoader(TSL.CharGenMain),
          MenuManager.GameMenuLoader(TSL.CharGenName),
          MenuManager.GameMenuLoader(TSL.CharGenPortCust),
          MenuManager.GameMenuLoader(TSL.CharGenQuickOrCustom),
          MenuManager.GameMenuLoader(TSL.CharGenQuickPanel),
          MenuManager.GameMenuLoader(TSL.CharGenSkills),
        ]) as [
          KOTOR.CharGenAbilities, KOTOR.CharGenClass, KOTOR.CharGenCustomPanel, KOTOR.CharGenFeats,
          KOTOR.CharGenMain, KOTOR.CharGenName, KOTOR.CharGenPortCust, KOTOR.CharGenQuickOrCustom,
          KOTOR.CharGenQuickPanel, KOTOR.CharGenSkills,
        ];
      }
    }catch(e){
      console.error(e);
    }
  }

  static #ingameMenusLoaded = false;
  static async LoadInGameMenus(){
    if(MenuManager.#ingameMenusLoaded) return;
    MenuManager.#ingameMenusLoaded = true;
    ActionMenuManager.InitActionMenuPanels();
    try{
      if(GameState.GameKey == GameEngineType.KOTOR){
        [
          MenuManager.InGameAreaTransition,
          MenuManager.InGameBark,
          MenuManager.InGameComputer,
          MenuManager.InGameComputerCam,
          MenuManager.InGameDialog,
          MenuManager.InGameOverlay,
          MenuManager.InGamePause,
          MenuManager.MenuAbilities,
          MenuManager.MenuCharacter,
          MenuManager.MenuContainer,
          MenuManager.MenuEquipment,
          MenuManager.MenuGalaxyMap,
          MenuManager.MenuInventory,
          MenuManager.MenuJournal,
          MenuManager.MenuLevelUp,
          MenuManager.MenuMap,
          MenuManager.MenuMessages,
          MenuManager.MenuOptions,
          MenuManager.MenuFeedback,
          MenuManager.MenuPartySelection,
          MenuManager.MenuStore,
          MenuManager.MenuTop,
          MenuManager.MenuUpgrade,
          MenuManager.MenuUpgradeItems,
          MenuManager.MenuUpgradeSelect,
          MenuManager.MenuPazaakWager,
          MenuManager.MenuPazaakGame,
          MenuManager.MenuPazaakSetup,
        ] = await Promise.all([
          MenuManager.GameMenuLoader(KOTOR.InGameAreaTransition),
          MenuManager.GameMenuLoader(KOTOR.InGameBark),
          MenuManager.GameMenuLoader(KOTOR.InGameComputer),
          MenuManager.GameMenuLoader(KOTOR.InGameComputerCam),
          MenuManager.GameMenuLoader(KOTOR.InGameDialog),
          MenuManager.GameMenuLoader(KOTOR.InGameOverlay),
          MenuManager.GameMenuLoader(KOTOR.InGamePause),
          MenuManager.GameMenuLoader(KOTOR.MenuAbilities),
          MenuManager.GameMenuLoader(KOTOR.MenuCharacter),
          MenuManager.GameMenuLoader(KOTOR.MenuContainer),
          MenuManager.GameMenuLoader(KOTOR.MenuEquipment),
          MenuManager.GameMenuLoader(KOTOR.MenuGalaxyMap),
          MenuManager.GameMenuLoader(KOTOR.MenuInventory),
          MenuManager.GameMenuLoader(KOTOR.MenuJournal),
          MenuManager.GameMenuLoader(KOTOR.MenuLevelUp),
          MenuManager.GameMenuLoader(KOTOR.MenuMap),
          MenuManager.GameMenuLoader(KOTOR.MenuMessages),
          MenuManager.GameMenuLoader(KOTOR.MenuOptions),
          MenuManager.GameMenuLoader(KOTOR.MenuFeedback),
          MenuManager.GameMenuLoader(KOTOR.MenuPartySelection),
          MenuManager.GameMenuLoader(KOTOR.MenuStore),
          MenuManager.GameMenuLoader(KOTOR.MenuTop),
          MenuManager.GameMenuLoader(KOTOR.MenuUpgrade),
          MenuManager.GameMenuLoader(KOTOR.MenuUpgradeItems),
          MenuManager.GameMenuLoader(KOTOR.MenuUpgradeSelect),
          MenuManager.GameMenuLoader(KOTOR.MenuPazaakWager),
          MenuManager.GameMenuLoader(KOTOR.MenuPazaakGame),
          MenuManager.GameMenuLoader(KOTOR.MenuPazaakSetup),
        ]) as [
          KOTOR.InGameAreaTransition, KOTOR.InGameBark, KOTOR.InGameComputer, KOTOR.InGameComputerCam,
          KOTOR.InGameDialog, KOTOR.InGameOverlay, KOTOR.InGamePause, KOTOR.MenuAbilities,
          KOTOR.MenuCharacter, KOTOR.MenuContainer, KOTOR.MenuEquipment, KOTOR.MenuGalaxyMap,
          KOTOR.MenuInventory, KOTOR.MenuJournal, KOTOR.MenuLevelUp, KOTOR.MenuMap,
          KOTOR.MenuMessages, KOTOR.MenuOptions, KOTOR.MenuFeedback, KOTOR.MenuPartySelection,
          KOTOR.MenuStore, KOTOR.MenuTop, KOTOR.MenuUpgrade, KOTOR.MenuUpgradeItems,
          KOTOR.MenuUpgradeSelect, KOTOR.MenuPazaakWager, KOTOR.MenuPazaakGame, KOTOR.MenuPazaakSetup,
        ];
      }else if(GameState.GameKey == GameEngineType.TSL){
        [
          MenuManager.InGameAreaTransition,
          MenuManager.InGameBark,
          MenuManager.InGameComputer,
          MenuManager.InGameComputerCam,
          MenuManager.InGameDialog,
          MenuManager.InGameOverlay,
          MenuManager.InGamePause,
          MenuManager.MenuAbilities,
          MenuManager.MenuCharacter,
          MenuManager.MenuChemicals,
          MenuManager.MenuContainer,
          MenuManager.MenuEquipment,
          MenuManager.MenuGalaxyMap,
          MenuManager.MenuInventory,
          MenuManager.MenuJournal,
          MenuManager.MenuLevelUp,
          MenuManager.MenuMap,
          MenuManager.MenuMessages,
          MenuManager.MenuOptions,
          MenuManager.MenuFeedback,
          MenuManager.MenuPartySelection,
          MenuManager.MenuStore,
          MenuManager.MenuTop,
          MenuManager.MenuUpgrade,
          MenuManager.MenuUpgradeItems,
          MenuManager.MenuUpgradeSelect,
          MenuManager.MenuPazaakWager,
          MenuManager.MenuPazaakGame,
          MenuManager.MenuPazaakSetup,
        ] = await Promise.all([
          MenuManager.GameMenuLoader(TSL.InGameAreaTransition),
          MenuManager.GameMenuLoader(TSL.InGameBark),
          MenuManager.GameMenuLoader(TSL.InGameComputer),
          MenuManager.GameMenuLoader(TSL.InGameComputerCam),
          MenuManager.GameMenuLoader(TSL.InGameDialog),
          MenuManager.GameMenuLoader(TSL.InGameOverlay),
          MenuManager.GameMenuLoader(TSL.InGamePause),
          MenuManager.GameMenuLoader(TSL.MenuAbilities),
          MenuManager.GameMenuLoader(TSL.MenuCharacter),
          MenuManager.GameMenuLoader(TSL.MenuChemicals),
          MenuManager.GameMenuLoader(TSL.MenuContainer),
          MenuManager.GameMenuLoader(TSL.MenuEquipment),
          MenuManager.GameMenuLoader(TSL.MenuGalaxyMap),
          MenuManager.GameMenuLoader(TSL.MenuInventory),
          MenuManager.GameMenuLoader(TSL.MenuJournal),
          MenuManager.GameMenuLoader(TSL.MenuLevelUp),
          MenuManager.GameMenuLoader(TSL.MenuMap),
          MenuManager.GameMenuLoader(TSL.MenuMessages),
          MenuManager.GameMenuLoader(TSL.MenuOptions),
          MenuManager.GameMenuLoader(TSL.MenuFeedback),
          MenuManager.GameMenuLoader(TSL.MenuPartySelection),
          MenuManager.GameMenuLoader(TSL.MenuStore),
          MenuManager.GameMenuLoader(TSL.MenuTop),
          MenuManager.GameMenuLoader(TSL.MenuUpgrade),
          MenuManager.GameMenuLoader(TSL.MenuUpgradeItems),
          MenuManager.GameMenuLoader(TSL.MenuUpgradeSelect),
          MenuManager.GameMenuLoader(TSL.MenuPazaakWager),
          MenuManager.GameMenuLoader(TSL.MenuPazaakGame),
          MenuManager.GameMenuLoader(TSL.MenuPazaakSetup),
        ]) as [
          KOTOR.InGameAreaTransition, KOTOR.InGameBark, KOTOR.InGameComputer, KOTOR.InGameComputerCam,
          KOTOR.InGameDialog, KOTOR.InGameOverlay, KOTOR.InGamePause, KOTOR.MenuAbilities,
          KOTOR.MenuCharacter, TSL.MenuChemicals, KOTOR.MenuContainer, KOTOR.MenuEquipment,
          KOTOR.MenuGalaxyMap, KOTOR.MenuInventory, KOTOR.MenuJournal, KOTOR.MenuLevelUp,
          KOTOR.MenuMap, KOTOR.MenuMessages, KOTOR.MenuOptions, KOTOR.MenuFeedback,
          KOTOR.MenuPartySelection, KOTOR.MenuStore, KOTOR.MenuTop, KOTOR.MenuUpgrade,
          KOTOR.MenuUpgradeItems, KOTOR.MenuUpgradeSelect, KOTOR.MenuPazaakWager,
          KOTOR.MenuPazaakGame, KOTOR.MenuPazaakSetup,
        ];
      }

      MenuManager.MenuJournal.childMenu = GameState.MenuManager.MenuTop;
      MenuManager.MenuInventory.childMenu = GameState.MenuManager.MenuTop;
      MenuManager.MenuEquipment.childMenu = GameState.MenuManager.MenuTop;
      MenuManager.MenuCharacter.childMenu = GameState.MenuManager.MenuTop;
      MenuManager.MenuMessages.childMenu = GameState.MenuManager.MenuTop;
      MenuManager.MenuOptions.childMenu = GameState.MenuManager.MenuTop;
      MenuManager.MenuMap.childMenu = GameState.MenuManager.MenuTop;
      MenuManager.MenuAbilities.childMenu = GameState.MenuManager.MenuTop;

      if(GameState.GameKey == GameEngineType.TSL){
        MenuManager.MenuPartySelection.childMenu = GameState.MenuManager.MenuTop;
      }
    }catch(e){
      console.error(e);
    }
  }

}

MenuManager.Init();
