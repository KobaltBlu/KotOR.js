import { CursorManager } from "./CursorManager";
import { GameMenu, KotOR, TSL } from "../internal";
import { GameEngineType, GameState } from "../GameState";


export class MenuManager {
  static pulseOpacity: number;
  static activeMenus: any[];
  static pulse: number;

  //References to the game menus
  static CharGenAbilities: typeof KotOR.CharGenAbilities;
  static CharGenClass: typeof KotOR.CharGenClass;
  static CharGenCustomPanel: typeof KotOR.CharGenCustomPanel;
  static CharGenFeats: typeof KotOR.CharGenFeats;
  static CharGenMain: typeof KotOR.CharGenMain;
  static CharGenName: typeof KotOR.CharGenName;
  static CharGenPortCust: typeof KotOR.CharGenPortCust;
  static CharGenQuickOrCustom: typeof KotOR.CharGenQuickOrCustom;
  static CharGenQuickPanel: typeof KotOR.CharGenQuickPanel;
  static CharGenSkills: typeof KotOR.CharGenSkills;
  static InGameAreaTransition: typeof KotOR.InGameAreaTransition;
  static InGameBark: typeof KotOR.InGameBark;
  static InGameComputer: typeof KotOR.InGameComputer;
  static InGameComputerCam: typeof KotOR.InGameComputerCam;
  static InGameConfirm: typeof KotOR.InGameConfirm;
  static InGameDialog: typeof KotOR.InGameDialog;
  static InGameOverlay: typeof KotOR.InGameOverlay;
  static InGamePause: typeof KotOR.InGamePause;
  static LoadScreen: typeof KotOR.LoadScreen;
  static MainMenu: typeof KotOR.MainMenu;
  static MainMovies: typeof KotOR.MainMovies;
  static MainMusic: typeof TSL.MainMusic;
  static MainOptions: typeof KotOR.MainOptions;
  static MenuAbilities: typeof KotOR.MenuAbilities;
  static MenuCharacter: typeof KotOR.MenuCharacter;
  static MenuChemicals: typeof TSL.MenuChemicals;
  static MenuContainer: typeof KotOR.MenuContainer;
  static MenuEquipment: typeof KotOR.MenuEquipment;
  static MenuOptionsFeedback: typeof KotOR.MenuOptionsFeedback;
  static MenuGalaxyMap: typeof KotOR.MenuGalaxyMap;
  static MenuGraphics: typeof KotOR.MenuGraphics;
  static MenuGraphicsAdvanced: typeof KotOR.MenuGraphicsAdvanced;
  static MenuInventory: typeof KotOR.MenuInventory;
  static MenuJournal: typeof KotOR.MenuJournal;
  static MenuLevelUp: typeof KotOR.MenuLevelUp;
  static MenuMap: typeof KotOR.MenuMap;
  static MenuMessages: typeof KotOR.MenuMessages;
  static MenuOptions: typeof KotOR.MenuOptions;
  static MenuPartySelection: typeof KotOR.MenuPartySelection;
  static MenuResolutions: typeof KotOR.MenuResolutions;
  static MenuSaveLoad: typeof KotOR.MenuSaveLoad;
  static MenuSaveName: typeof KotOR.MenuSaveName;
  static MenuSound: typeof KotOR.MenuSound;
  static MenuSoundAdvanced: typeof KotOR.MenuSoundAdvanced;
  static MenuStore: typeof KotOR.MenuStore;
  static MenuTop: typeof KotOR.MenuTop;

  static Init(){

    MenuManager.activeMenus = [];
    MenuManager.pulse = 0;
    MenuManager.pulseOpacity = 1;

  }

  static Add(menu: GameMenu){
    if(!menu.isOverlayGUI){
      //Hide the current top most menu in the list before adding the new Menu
      if(MenuManager.activeMenus.length)
        MenuManager.activeMenus[MenuManager.activeMenus.length-1].Hide();
    }

    if(menu instanceof GameMenu)
      MenuManager.activeMenus.push(menu);

    MenuManager.Resize();
  }

  static Remove(menu: GameMenu){
    let mIdx = MenuManager.activeMenus.indexOf(menu);
    if(mIdx >= 0)
      MenuManager.activeMenus.splice(mIdx, 1);

    //Reshow the new top most menu in the list
    if(MenuManager.activeMenus.length)
      MenuManager.GetCurrentMenu().Show();

    MenuManager.Resize();
  }

  static ClearMenus(){
    while(MenuManager.activeMenus.length){
      MenuManager.activeMenus[0].Close();
    }
  }

  static GetCurrentMenu(){
    return MenuManager.activeMenus[MenuManager.activeMenus.length-1];
  }

  static Resize(){
    for(let i = 0, len = MenuManager.activeMenus.length; i < len; i++){
      MenuManager.activeMenus[i].Resize();
    }
  }

  static Update(delta = 0){
    GameState.updateCursor();
    CursorManager.cursor.material.depthTest = false;
    CursorManager.cursor.material.depthWrite = false;
    CursorManager.cursor.renderOrder = 9999999;
    MenuManager.pulse += delta;
    if(MenuManager.pulse > 2){
      MenuManager.pulse = 0;
    }

    if(this.pulse > 2){
      MenuManager.pulseOpacity = 0;
    }

    if(this.pulse > 1){
      MenuManager.pulseOpacity = this.pulse - 1;
    }else{
      MenuManager.pulseOpacity = 1 - this.pulse;
    }

    if(MenuManager.InGameOverlay.bVisible){
      MenuManager.InGameOverlay.Update(delta);
    }

    let activeMenus = MenuManager.activeMenus;
    for(let i = 0, len = activeMenus.length; i < len; i++){
      activeMenus[i].Update(delta);
    }

    if(GameState.scene_gui.children.indexOf(GameState.scene_cursor_holder) != GameState.scene_gui.children.length){
      GameState.scene_cursor_holder.remove(GameState.scene_gui);
      GameState.scene_gui.add(GameState.scene_cursor_holder);
    }

  }

  static async GameMenuLoader(menuConstructor: any): Promise<GameMenu> {
    return new Promise( (resolve: Function, reject: Function) => {
      new menuConstructor({
        onLoad: (menu: GameMenu) => {
          resolve(menu);
        }
      })
    });
  }

  static async LoadGameMenus(){
    if(GameState.GameKey == GameEngineType.KOTOR){
      // MenuManager.CharGenAbilities = await MenuManager.GameMenuLoader(KotOR.CharGenAbilities) as any;
      // MenuManager.CharGenClass = await MenuManager.GameMenuLoader(KotOR.CharGenClass) as any;
      // MenuManager.CharGenCustomPanel = await MenuManager.GameMenuLoader(KotOR.CharGenCustomPanel) as any;
      // MenuManager.CharGenFeats = await MenuManager.GameMenuLoader(KotOR.CharGenFeats) as any;
      // MenuManager.CharGenMain = await MenuManager.GameMenuLoader(KotOR.CharGenMain) as any;
      // MenuManager.CharGenName = await MenuManager.GameMenuLoader(KotOR.CharGenName) as any;
      // MenuManager.CharGenPortCust = await MenuManager.GameMenuLoader(KotOR.CharGenPortCust) as any; //Character Portrait
      // MenuManager.CharGenQuickOrCustom = await MenuManager.GameMenuLoader(KotOR.CharGenQuickOrCustom) as any;
      // MenuManager.CharGenQuickPanel = await MenuManager.GameMenuLoader(KotOR.CharGenQuickPanel) as any;
      // MenuManager.CharGenSkills = await MenuManager.GameMenuLoader(KotOR.CharGenSkills) as any;

      // MenuManager.MenuAbilities = await MenuManager.GameMenuLoader(KotOR.MenuAbilities) as any;
      // MenuManager.MenuCharacter = await MenuManager.GameMenuLoader(KotOR.MenuCharacter) as any;
      // MenuManager.MenuContainer = await MenuManager.GameMenuLoader(KotOR.MenuContainer) as any;
      // MenuManager.MenuEquipment = await MenuManager.GameMenuLoader(KotOR.MenuEquipment) as any;
      // MenuManager.MenuGalaxyMap = await MenuManager.GameMenuLoader(KotOR.MenuGalaxyMap) as any;
      // MenuManager.MenuGraphics = await MenuManager.GameMenuLoader(KotOR.MenuGraphics) as any;
      // MenuManager.MenuGraphicsAdvanced = await MenuManager.GameMenuLoader(KotOR.MenuGraphicsAdvanced) as any;
      // MenuManager.MenuInventory = await MenuManager.GameMenuLoader(KotOR.MenuInventory) as any;
      // MenuManager.MenuJournal = await MenuManager.GameMenuLoader(KotOR.MenuJournal) as any;
      // MenuManager.MenuLevelUp = await MenuManager.GameMenuLoader(KotOR.MenuLevelUp) as any;
      // MenuManager.MenuMap = await MenuManager.GameMenuLoader(KotOR.MenuMap) as any;
      // MenuManager.MenuMessages = await MenuManager.GameMenuLoader(KotOR.MenuMessages) as any;
      // MenuManager.MenuOptions = await MenuManager.GameMenuLoader(KotOR.MenuOptions) as any;
      // MenuManager.MenuOptionsFeedback = await MenuManager.GameMenuLoader(KotOR.MenuOptionsFeedback) as any;
      // MenuManager.MenuPartySelection = await MenuManager.GameMenuLoader(KotOR.MenuPartySelection) as any;
      // MenuManager.MenuResolutions = await MenuManager.GameMenuLoader(KotOR.MenuResolutions) as any;
      // MenuManager.MenuSaveLoad = await MenuManager.GameMenuLoader(KotOR.MenuSaveLoad) as any;
      // MenuManager.MenuSaveName = await MenuManager.GameMenuLoader(KotOR.MenuSaveName) as any;
      // MenuManager.MenuSound = await MenuManager.GameMenuLoader(KotOR.MenuSound) as any;
      // MenuManager.MenuSoundAdvanced = await MenuManager.GameMenuLoader(KotOR.MenuSoundAdvanced) as any;
      // MenuManager.MenuStore = await MenuManager.GameMenuLoader(KotOR.MenuStore) as any;
      // MenuManager.MenuTop = await MenuManager.GameMenuLoader(KotOR.MenuTop) as any;

      // MenuManager.MainMenu = await MenuManager.GameMenuLoader(KotOR.MainMenu) as any;
      // MenuManager.MainMovies = await MenuManager.GameMenuLoader(KotOR.MainMovies) as any;
      // MenuManager.MainOptions = await MenuManager.GameMenuLoader(KotOR.MainOptions) as any;

      // MenuManager.LoadScreen = await MenuManager.GameMenuLoader(KotOR.LoadScreen) as any;

      // MenuManager.InGameAreaTransition = await MenuManager.GameMenuLoader(KotOR.InGameAreaTransition) as any;
      // MenuManager.InGameBark = await MenuManager.GameMenuLoader(KotOR.InGameBark) as any;
      // MenuManager.InGameComputer = await MenuManager.GameMenuLoader(KotOR.InGameComputer) as any;
      // MenuManager.InGameComputerCam = await MenuManager.GameMenuLoader(KotOR.InGameComputerCam) as any;
      // MenuManager.InGameConfirm = await MenuManager.GameMenuLoader(KotOR.InGameConfirm) as any;
      // MenuManager.InGameDialog = await MenuManager.GameMenuLoader(KotOR.InGameDialog) as any;
      // MenuManager.InGameOverlay = await MenuManager.GameMenuLoader(KotOR.InGameOverlay) as any;
      // MenuManager.InGamePause = await MenuManager.GameMenuLoader(KotOR.InGamePause) as any;
    }else if(GameState.GameKey == GameEngineType.TSL){
      // MenuManager.CharGenAbilities = await MenuManager.GameMenuLoader(TSL.CharGenAbilities) as any;
      // MenuManager.CharGenClass = await MenuManager.GameMenuLoader(TSL.CharGenClass) as any;
      // MenuManager.CharGenCustomPanel = await MenuManager.GameMenuLoader(TSL.CharGenCustomPanel) as any;
      // MenuManager.CharGenFeats = await MenuManager.GameMenuLoader(TSL.CharGenFeats) as any;
      // MenuManager.CharGenMain = await MenuManager.GameMenuLoader(TSL.CharGenMain) as any;
      // MenuManager.CharGenName = await MenuManager.GameMenuLoader(TSL.CharGenName) as any;
      // MenuManager.CharGenPortCust = await MenuManager.GameMenuLoader(TSL.CharGenPortCust) as any; //Character Portrait
      // MenuManager.CharGenQuickOrCustom = await MenuManager.GameMenuLoader(TSL.CharGenQuickOrCustom) as any;
      // MenuManager.CharGenQuickPanel = await MenuManager.GameMenuLoader(TSL.CharGenQuickPanel) as any;
      // MenuManager.CharGenSkills = await MenuManager.GameMenuLoader(TSL.CharGenSkills) as any;

      // MenuManager.MenuAbilities = await MenuManager.GameMenuLoader(TSL.MenuAbilities) as any;
      // MenuManager.MenuCharacter = await MenuManager.GameMenuLoader(TSL.MenuCharacter) as any;
      // MenuManager.MenuChemicals = await MenuManager.GameMenuLoader(TSL.MenuChemicals) as any;
      // MenuManager.MenuContainer = await MenuManager.GameMenuLoader(TSL.MenuContainer) as any;
      // MenuManager.MenuEquipment = await MenuManager.GameMenuLoader(TSL.MenuEquipment) as any;
      // MenuManager.MenuGalaxyMap = await MenuManager.GameMenuLoader(TSL.MenuGalaxyMap) as any;
      // MenuManager.MenuGraphics = await MenuManager.GameMenuLoader(TSL.MenuGraphics) as any;
      // MenuManager.MenuGraphicsAdvanced = await MenuManager.GameMenuLoader(TSL.MenuGraphicsAdvanced) as any;
      // MenuManager.MenuInventory = await MenuManager.GameMenuLoader(TSL.MenuInventory) as any;
      // MenuManager.MenuJournal = await MenuManager.GameMenuLoader(TSL.MenuJournal) as any;
      // MenuManager.MenuLevelUp = await MenuManager.GameMenuLoader(TSL.MenuLevelUp) as any;
      // MenuManager.MenuMap = await MenuManager.GameMenuLoader(TSL.MenuMap) as any;
      // MenuManager.MenuMessages = await MenuManager.GameMenuLoader(TSL.MenuMessages) as any;
      // MenuManager.MenuOptions = await MenuManager.GameMenuLoader(TSL.MenuOptions) as any;
      // MenuManager.MenuOptionsFeedback = await MenuManager.GameMenuLoader(KotOR.MenuOptionsFeedback) as any;
      // MenuManager.MenuPartySelection = await MenuManager.GameMenuLoader(TSL.MenuPartySelection) as any;
      // MenuManager.MenuResolutions = await MenuManager.GameMenuLoader(TSL.MenuResolutions) as any;
      // MenuManager.MenuSaveLoad = await MenuManager.GameMenuLoader(TSL.MenuSaveLoad) as any;
      // MenuManager.MenuSaveName = await MenuManager.GameMenuLoader(TSL.MenuSaveName) as any;
      // MenuManager.MenuSound = await MenuManager.GameMenuLoader(TSL.MenuSound) as any;
      // MenuManager.MenuSoundAdvanced = await MenuManager.GameMenuLoader(TSL.MenuSoundAdvanced) as any;
      // MenuManager.MenuStore = await MenuManager.GameMenuLoader(TSL.MenuStore) as any;
      // MenuManager.MenuTop = await MenuManager.GameMenuLoader(TSL.MenuTop) as any;

      // MenuManager.MainMenu = await MenuManager.GameMenuLoader(TSL.MainMenu) as any;
      // MenuManager.MainMovies = await MenuManager.GameMenuLoader(TSL.MainMovies) as any;
      // MenuManager.MainMusic = await MenuManager.GameMenuLoader(TSL.MainMusic) as any;
      // MenuManager.MainOptions = await MenuManager.GameMenuLoader(TSL.MainOptions) as any;

      // MenuManager.LoadScreen = await MenuManager.GameMenuLoader(TSL.LoadScreen) as any;

      // MenuManager.InGameAreaTransition = await MenuManager.GameMenuLoader(TSL.InGameAreaTransition) as any;
      // MenuManager.InGameBark = await MenuManager.GameMenuLoader(TSL.InGameBark) as any;
      // MenuManager.InGameComputer = await MenuManager.GameMenuLoader(TSL.InGameComputer) as any;
      // MenuManager.InGameComputerCam = await MenuManager.GameMenuLoader(TSL.InGameComputerCam) as any;
      // MenuManager.InGameConfirm = await MenuManager.GameMenuLoader(TSL.InGameConfirm) as any;
      // MenuManager.InGameDialog = await MenuManager.GameMenuLoader(TSL.InGameDialog) as any;
      // MenuManager.InGameOverlay = await MenuManager.GameMenuLoader(TSL.InGameOverlay) as any;
      // MenuManager.InGamePause = await MenuManager.GameMenuLoader(TSL.InGamePause) as any;
    }

  }

}

MenuManager.Init();
