import * as KOTOR from "../game/kotor/KOTOR";
import * as TSL from "../game/tsl/TSL";
import { GameState } from "../GameState";
import { EngineMode, GameEngineType } from "../enums/engine";
import type { GUIControl, GameMenu } from "../gui";
import { ActionMenuManager } from "../engine/menu/ActionMenuManager";
import { EngineState } from "../enums/engine/EngineState";
import { PerformanceMonitor } from "../utility/PerformanceMonitor";

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

      if(!MenuManager.activeMenus.length || MenuManager.activeMenus[MenuManager.activeMenus.length-1].engineMode != EngineMode.GUI){
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

    const activeMenus = MenuManager.activeMenus;
    for(let i = 0, len = activeMenus.length; i < len; i++){
      activeMenus[i].update(delta);
    }

    const activeModals = MenuManager.activeModals;
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
        //Main Menus
        MenuManager.LoadScreen = await MenuManager.GameMenuLoader(KOTOR.LoadScreen) as KOTOR.LoadScreen;
        MenuManager.MainMenu = await MenuManager.GameMenuLoader(KOTOR.MainMenu) as KOTOR.MainMenu;
        MenuManager.MainMovies = await MenuManager.GameMenuLoader(KOTOR.MainMovies) as KOTOR.MainMovies;
        MenuManager.MainOptions = await MenuManager.GameMenuLoader(KOTOR.MainOptions) as KOTOR.MainOptions;
        MenuManager.MenuResolutions = await MenuManager.GameMenuLoader(KOTOR.MenuResolutions) as KOTOR.MenuResolutions;
        MenuManager.MenuSaveLoad = await MenuManager.GameMenuLoader(KOTOR.MenuSaveLoad) as KOTOR.MenuSaveLoad;
        MenuManager.MenuSaveName = await MenuManager.GameMenuLoader(KOTOR.MenuSaveName) as KOTOR.MenuSaveName;
        MenuManager.MenuGameplay = await MenuManager.GameMenuLoader(KOTOR.MenuGameplay) as KOTOR.MenuGameplay;
        MenuManager.MenuGraphics = await MenuManager.GameMenuLoader(KOTOR.MenuGraphics) as KOTOR.MenuGraphics;
        MenuManager.MenuGraphicsAdvanced = await MenuManager.GameMenuLoader(KOTOR.MenuGraphicsAdvanced) as KOTOR.MenuGraphicsAdvanced;
        MenuManager.MenuAutoPause = await MenuManager.GameMenuLoader(KOTOR.MenuAutoPause) as KOTOR.MenuAutoPause;
        MenuManager.MenuToolTip = await MenuManager.GameMenuLoader(KOTOR.MenuToolTip) as KOTOR.MenuToolTip;
        MenuManager.MenuSound = await MenuManager.GameMenuLoader(KOTOR.MenuSound) as KOTOR.MenuSound;
        MenuManager.MenuSoundAdvanced = await MenuManager.GameMenuLoader(KOTOR.MenuSoundAdvanced) as KOTOR.MenuSoundAdvanced;
        MenuManager.MenuMouse = await MenuManager.GameMenuLoader(KOTOR.MenuMouse) as KOTOR.MenuMouse;
        MenuManager.MenuKeyboardMapping = await MenuManager.GameMenuLoader(KOTOR.MenuKeyboardMapping) as KOTOR.MenuKeyboardMapping;
        MenuManager.MenuKeyboardEntry = await MenuManager.GameMenuLoader(KOTOR.MenuKeyboardEntry) as KOTOR.MenuKeyboardEntry;
        MenuManager.InGameConfirm = await MenuManager.GameMenuLoader(KOTOR.InGameConfirm) as KOTOR.InGameConfirm;
      }else if(GameState.GameKey == GameEngineType.TSL){
        MenuManager.LoadScreen = await MenuManager.GameMenuLoader(TSL.LoadScreen) as KOTOR.LoadScreen;
        MenuManager.MainMenu = await MenuManager.GameMenuLoader(TSL.MainMenu) as KOTOR.MainMenu;
        MenuManager.MainMovies = await MenuManager.GameMenuLoader(TSL.MainMovies) as KOTOR.MainMovies;
        MenuManager.MainMusic = await MenuManager.GameMenuLoader(TSL.MainMusic) as TSL.MainMusic;
        MenuManager.MainOptions = await MenuManager.GameMenuLoader(TSL.MainOptions) as KOTOR.MainOptions;
        MenuManager.MenuResolutions = await MenuManager.GameMenuLoader(TSL.MenuResolutions) as KOTOR.MenuResolutions;
        MenuManager.MenuSaveLoad = await MenuManager.GameMenuLoader(TSL.MenuSaveLoad) as KOTOR.MenuSaveLoad;
        MenuManager.MenuSaveName = await MenuManager.GameMenuLoader(TSL.MenuSaveName) as KOTOR.MenuSaveName;
        MenuManager.MenuGameplay = await MenuManager.GameMenuLoader(TSL.MenuGameplay) as KOTOR.MenuGameplay;
        MenuManager.MenuGraphics = await MenuManager.GameMenuLoader(TSL.MenuGraphics) as KOTOR.MenuGraphics;
        MenuManager.MenuGraphicsAdvanced = await MenuManager.GameMenuLoader(TSL.MenuGraphicsAdvanced) as KOTOR.MenuGraphicsAdvanced;
        MenuManager.MenuAutoPause = await MenuManager.GameMenuLoader(TSL.MenuAutoPause) as KOTOR.MenuAutoPause;
        MenuManager.MenuToolTip = await MenuManager.GameMenuLoader(TSL.MenuToolTip) as KOTOR.MenuToolTip;
        MenuManager.MenuSound = await MenuManager.GameMenuLoader(TSL.MenuSound) as KOTOR.MenuSound;
        MenuManager.MenuSoundAdvanced = await MenuManager.GameMenuLoader(TSL.MenuSoundAdvanced) as KOTOR.MenuSoundAdvanced;
        MenuManager.MenuMouse = await MenuManager.GameMenuLoader(TSL.MenuMouse) as KOTOR.MenuMouse;
        MenuManager.MenuKeyboardMapping = await MenuManager.GameMenuLoader(TSL.MenuKeyboardMapping) as KOTOR.MenuKeyboardMapping;
        MenuManager.MenuKeyboardEntry = await MenuManager.GameMenuLoader(TSL.MenuKeyboardEntry) as KOTOR.MenuKeyboardEntry;
        MenuManager.InGameConfirm = await MenuManager.GameMenuLoader(TSL.InGameConfirm) as KOTOR.InGameConfirm;
      }
    }catch(e){
      console.error(e);
    }
  }
  
  static async LoadCharGenGameMenus(){
    try{
      if(GameState.GameKey == GameEngineType.KOTOR){
        MenuManager.CharGenMain = await MenuManager.GameMenuLoader(KOTOR.CharGenMain) as KOTOR.CharGenMain;
        MenuManager.CharGenAbilities = await MenuManager.GameMenuLoader(KOTOR.CharGenAbilities) as KOTOR.CharGenAbilities;
        MenuManager.CharGenClass = await MenuManager.GameMenuLoader(KOTOR.CharGenClass) as KOTOR.CharGenClass;
        MenuManager.CharGenCustomPanel = await MenuManager.GameMenuLoader(KOTOR.CharGenCustomPanel) as KOTOR.CharGenCustomPanel;
        MenuManager.CharGenFeats = await MenuManager.GameMenuLoader(KOTOR.CharGenFeats) as KOTOR.CharGenFeats;
        MenuManager.CharGenName = await MenuManager.GameMenuLoader(KOTOR.CharGenName) as KOTOR.CharGenName;
        MenuManager.CharGenPortCust = await MenuManager.GameMenuLoader(KOTOR.CharGenPortCust) as KOTOR.CharGenPortCust; //Character Portrait
        MenuManager.CharGenQuickOrCustom = await MenuManager.GameMenuLoader(KOTOR.CharGenQuickOrCustom) as KOTOR.CharGenQuickOrCustom;
        MenuManager.CharGenQuickPanel = await MenuManager.GameMenuLoader(KOTOR.CharGenQuickPanel) as KOTOR.CharGenQuickPanel;
        MenuManager.CharGenSkills = await MenuManager.GameMenuLoader(KOTOR.CharGenSkills) as KOTOR.CharGenSkills;
      }else if(GameState.GameKey == GameEngineType.TSL){
        MenuManager.CharGenAbilities = await MenuManager.GameMenuLoader(TSL.CharGenAbilities) as KOTOR.CharGenAbilities;
        MenuManager.CharGenClass = await MenuManager.GameMenuLoader(TSL.CharGenClass) as KOTOR.CharGenClass;
        MenuManager.CharGenCustomPanel = await MenuManager.GameMenuLoader(TSL.CharGenCustomPanel) as KOTOR.CharGenCustomPanel;
        MenuManager.CharGenFeats = await MenuManager.GameMenuLoader(TSL.CharGenFeats) as KOTOR.CharGenFeats;
        MenuManager.CharGenMain = await MenuManager.GameMenuLoader(TSL.CharGenMain) as KOTOR.CharGenMain;
        MenuManager.CharGenName = await MenuManager.GameMenuLoader(TSL.CharGenName) as KOTOR.CharGenName;
        MenuManager.CharGenPortCust = await MenuManager.GameMenuLoader(TSL.CharGenPortCust) as KOTOR.CharGenPortCust; //Character Portrait
        MenuManager.CharGenQuickOrCustom = await MenuManager.GameMenuLoader(TSL.CharGenQuickOrCustom) as KOTOR.CharGenQuickOrCustom;
        MenuManager.CharGenQuickPanel = await MenuManager.GameMenuLoader(TSL.CharGenQuickPanel) as KOTOR.CharGenQuickPanel;
        MenuManager.CharGenSkills = await MenuManager.GameMenuLoader(TSL.CharGenSkills) as KOTOR.CharGenSkills;
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
        MenuManager.InGameAreaTransition = await MenuManager.GameMenuLoader(KOTOR.InGameAreaTransition) as KOTOR.InGameAreaTransition;
        MenuManager.InGameBark = await MenuManager.GameMenuLoader(KOTOR.InGameBark) as KOTOR.InGameBark;
        MenuManager.InGameComputer = await MenuManager.GameMenuLoader(KOTOR.InGameComputer) as KOTOR.InGameComputer;
        MenuManager.InGameComputerCam = await MenuManager.GameMenuLoader(KOTOR.InGameComputerCam) as KOTOR.InGameComputerCam;
        MenuManager.InGameDialog = await MenuManager.GameMenuLoader(KOTOR.InGameDialog) as KOTOR.InGameDialog;
        MenuManager.InGameOverlay = await MenuManager.GameMenuLoader(KOTOR.InGameOverlay) as KOTOR.InGameOverlay;
        MenuManager.InGamePause = await MenuManager.GameMenuLoader(KOTOR.InGamePause) as KOTOR.InGamePause;
        MenuManager.MenuAbilities = await MenuManager.GameMenuLoader(KOTOR.MenuAbilities) as KOTOR.MenuAbilities;
        MenuManager.MenuCharacter = await MenuManager.GameMenuLoader(KOTOR.MenuCharacter) as KOTOR.MenuCharacter;
        MenuManager.MenuContainer = await MenuManager.GameMenuLoader(KOTOR.MenuContainer) as KOTOR.MenuContainer;
        MenuManager.MenuEquipment = await MenuManager.GameMenuLoader(KOTOR.MenuEquipment) as KOTOR.MenuEquipment;
        MenuManager.MenuGalaxyMap = await MenuManager.GameMenuLoader(KOTOR.MenuGalaxyMap) as KOTOR.MenuGalaxyMap;
        MenuManager.MenuInventory = await MenuManager.GameMenuLoader(KOTOR.MenuInventory) as KOTOR.MenuInventory;
        MenuManager.MenuJournal = await MenuManager.GameMenuLoader(KOTOR.MenuJournal) as KOTOR.MenuJournal;
        MenuManager.MenuLevelUp = await MenuManager.GameMenuLoader(KOTOR.MenuLevelUp) as KOTOR.MenuLevelUp;
        MenuManager.MenuMap = await MenuManager.GameMenuLoader(KOTOR.MenuMap) as KOTOR.MenuMap;
        MenuManager.MenuMessages = await MenuManager.GameMenuLoader(KOTOR.MenuMessages) as KOTOR.MenuMessages;
        MenuManager.MenuOptions = await MenuManager.GameMenuLoader(KOTOR.MenuOptions) as KOTOR.MenuOptions;
        MenuManager.MenuFeedback = await MenuManager.GameMenuLoader(KOTOR.MenuFeedback) as KOTOR.MenuFeedback;
        MenuManager.MenuPartySelection = await MenuManager.GameMenuLoader(KOTOR.MenuPartySelection) as KOTOR.MenuPartySelection;
        MenuManager.MenuStore = await MenuManager.GameMenuLoader(KOTOR.MenuStore) as KOTOR.MenuStore;
        MenuManager.MenuTop = await MenuManager.GameMenuLoader(KOTOR.MenuTop) as KOTOR.MenuTop;
        MenuManager.MenuUpgrade = await MenuManager.GameMenuLoader(KOTOR.MenuUpgrade) as KOTOR.MenuUpgrade;
        MenuManager.MenuUpgradeItems = await MenuManager.GameMenuLoader(KOTOR.MenuUpgradeItems) as KOTOR.MenuUpgradeItems;
        MenuManager.MenuUpgradeSelect = await MenuManager.GameMenuLoader(KOTOR.MenuUpgradeSelect) as KOTOR.MenuUpgradeSelect;
        MenuManager.MenuPazaakWager = await MenuManager.GameMenuLoader(KOTOR.MenuPazaakWager) as KOTOR.MenuPazaakWager;
        MenuManager.MenuPazaakGame = await MenuManager.GameMenuLoader(KOTOR.MenuPazaakGame) as KOTOR.MenuPazaakGame;
        MenuManager.MenuPazaakSetup = await MenuManager.GameMenuLoader(KOTOR.MenuPazaakSetup) as KOTOR.MenuPazaakSetup;
      }else if(GameState.GameKey == GameEngineType.TSL){
        MenuManager.InGameAreaTransition = await MenuManager.GameMenuLoader(TSL.InGameAreaTransition) as KOTOR.InGameAreaTransition;
        MenuManager.InGameBark = await MenuManager.GameMenuLoader(TSL.InGameBark) as KOTOR.InGameBark;
        MenuManager.InGameComputer = await MenuManager.GameMenuLoader(TSL.InGameComputer) as KOTOR.InGameComputer;
        MenuManager.InGameComputerCam = await MenuManager.GameMenuLoader(TSL.InGameComputerCam) as KOTOR.InGameComputerCam;
        MenuManager.InGameDialog = await MenuManager.GameMenuLoader(TSL.InGameDialog) as KOTOR.InGameDialog;
        MenuManager.InGameOverlay = await MenuManager.GameMenuLoader(TSL.InGameOverlay) as KOTOR.InGameOverlay;
        MenuManager.InGamePause = await MenuManager.GameMenuLoader(TSL.InGamePause) as KOTOR.InGamePause;
        MenuManager.MenuAbilities = await MenuManager.GameMenuLoader(TSL.MenuAbilities) as KOTOR.MenuAbilities;
        MenuManager.MenuCharacter = await MenuManager.GameMenuLoader(TSL.MenuCharacter) as KOTOR.MenuCharacter;
        MenuManager.MenuChemicals = await MenuManager.GameMenuLoader(TSL.MenuChemicals) as TSL.MenuChemicals;
        MenuManager.MenuContainer = await MenuManager.GameMenuLoader(TSL.MenuContainer) as KOTOR.MenuContainer;
        MenuManager.MenuEquipment = await MenuManager.GameMenuLoader(TSL.MenuEquipment) as KOTOR.MenuEquipment;
        MenuManager.MenuGalaxyMap = await MenuManager.GameMenuLoader(TSL.MenuGalaxyMap) as KOTOR.MenuGalaxyMap;
        MenuManager.MenuInventory = await MenuManager.GameMenuLoader(TSL.MenuInventory) as KOTOR.MenuInventory;
        MenuManager.MenuJournal = await MenuManager.GameMenuLoader(TSL.MenuJournal) as KOTOR.MenuJournal;
        MenuManager.MenuLevelUp = await MenuManager.GameMenuLoader(TSL.MenuLevelUp) as KOTOR.MenuLevelUp;
        MenuManager.MenuMap = await MenuManager.GameMenuLoader(TSL.MenuMap) as KOTOR.MenuMap;
        MenuManager.MenuMessages = await MenuManager.GameMenuLoader(TSL.MenuMessages) as KOTOR.MenuMessages;
        MenuManager.MenuOptions = await MenuManager.GameMenuLoader(TSL.MenuOptions) as KOTOR.MenuOptions;
        MenuManager.MenuFeedback = await MenuManager.GameMenuLoader(TSL.MenuFeedback) as KOTOR.MenuFeedback;
        MenuManager.MenuPartySelection = await MenuManager.GameMenuLoader(TSL.MenuPartySelection) as KOTOR.MenuPartySelection;
        MenuManager.MenuStore = await MenuManager.GameMenuLoader(TSL.MenuStore) as KOTOR.MenuStore;
        MenuManager.MenuTop = await MenuManager.GameMenuLoader(TSL.MenuTop) as KOTOR.MenuTop;
        MenuManager.MenuUpgrade = await MenuManager.GameMenuLoader(TSL.MenuUpgrade) as KOTOR.MenuUpgrade;
        MenuManager.MenuUpgradeItems = await MenuManager.GameMenuLoader(TSL.MenuUpgradeItems) as KOTOR.MenuUpgradeItems;
        MenuManager.MenuUpgradeSelect = await MenuManager.GameMenuLoader(TSL.MenuUpgradeSelect) as KOTOR.MenuUpgradeSelect;
        MenuManager.MenuPazaakWager = await MenuManager.GameMenuLoader(TSL.MenuPazaakWager) as KOTOR.MenuPazaakWager;
        MenuManager.MenuPazaakGame = await MenuManager.GameMenuLoader(TSL.MenuPazaakGame) as KOTOR.MenuPazaakGame;
        MenuManager.MenuPazaakSetup = await MenuManager.GameMenuLoader(TSL.MenuPazaakSetup) as KOTOR.MenuPazaakSetup;
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
