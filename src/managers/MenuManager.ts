import * as KOTOR from "../game/kotor/KOTOR";
import * as TSL from "../game/tsl/TSL";
import { GameState } from "../GameState";
import { GameEngineType } from "../enums/engine/GameEngineType";
import { GUIControl, GameMenu } from "../gui";
import { ActionMenuManager } from "../ActionMenuManager";
import { EngineMode } from "../enums/engine/EngineMode";
import { EngineState } from "../enums/engine/EngineState";
import { CharGenManager, CursorManager, ModuleObjectManager } from ".";
import { Mouse } from "../controls/Mouse";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";


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
  static MenuGraphics: KOTOR.MenuGraphics;
  static MenuGraphicsAdvanced: KOTOR.MenuGraphicsAdvanced;
  static MenuInventory: KOTOR.MenuInventory;
  static MenuJournal: KOTOR.MenuJournal;
  static MenuLevelUp: KOTOR.MenuLevelUp;
  static MenuMap: KOTOR.MenuMap;
  static MenuMessages: KOTOR.MenuMessages;
  static MenuOptions: KOTOR.MenuOptions;
  static MenuPartySelection: KOTOR.MenuPartySelection;
  static MenuResolutions: KOTOR.MenuResolutions;
  static MenuSaveLoad: KOTOR.MenuSaveLoad;
  static MenuSaveName: KOTOR.MenuSaveName;
  static MenuSound: KOTOR.MenuSound;
  static MenuSoundAdvanced: KOTOR.MenuSoundAdvanced;
  static MenuStore: KOTOR.MenuStore;
  static MenuTop: KOTOR.MenuTop;

  static Init(){

    MenuManager.activeMenus = [];
    MenuManager.activeModals = [];
    MenuManager.pulse = 0;
    MenuManager.pulseOpacity = 1;

  }

  static Add(menu: GameMenu){
    if(!menu) return;
    
    if(!menu.isOverlayGUI){
      //Hide the current top most menu in the list before adding the new Menu
      if(MenuManager.activeMenus.length)
        MenuManager.activeMenus[MenuManager.activeMenus.length-1].hide();

      if(menu instanceof GameMenu)
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
      MenuManager.InGameOverlay.update(delta);
    }

    if(GameState.State == EngineState.PAUSED){
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
  

  // static updateCursorPosition(){
  //   CursorManager.setCursor('default');
  //   GameState.scene_cursor_holder.position.x = Mouse.positionViewport.x - (window.innerWidth/2) + (32/2);
  //   GameState.scene_cursor_holder.position.y = (Mouse.positionViewport.y*-1) + (window.innerHeight/2) - (32/2);
  // }

  // static updateCursor(){
  //   let cursorCaptured = false;
  //   let guiHoverCaptured = false;

  //   this.hoveredGUIElement = undefined;

  //   let uiControls = GameState.controls.MenuGetActiveUIElements();
  //   let controlCount = uiControls.length;
  //   for(let i = 0; i < controlCount; i++){
  //     let control = uiControls[i];
  //     if(!control.isVisible())
  //       continue;

  //     //if(control === GameState.mouse.clickItem){
  //     if(control instanceof GUIListBox && this.hoveredGUIElement == undefined){
  //       this.hoveredGUIElement = control;
  //     }

  //     if(!(control.widget.parent.type === 'Scene')){
  //       if(!guiHoverCaptured){
  //         let cMenu = control.menu;
  //         cMenu.SetWidgetHoverActive(control, true);
  //         guiHoverCaptured = false;
  //       }

  //       if(typeof control.isClickable == 'function'){
  //         if(control.isClickable()){
  //           CursorManager.setCursor('select');
  //           cursorCaptured = true;
  //         }
  //       }
  //     }
  //     //}
  //   }

  //   CursorManager.arrow.visible = false;
  //   if(CursorManager.selectedObject?.type == ModuleObjectType){
  //     if(CursorManager.selectedObject.position.distanceTo(GameState.getCurrentPlayer().position) > GameState.maxSelectableDistance){
  //       CursorManager.selectedObject = undefined;
  //     }
  //   }

  //   if(!cursorCaptured && GameState.Mode == EngineMode.INGAME){
  //     if(MenuManager.GetCurrentMenu() == MenuManager.InGameOverlay){
  //       if(GameState.scene_cursor_holder.visible){
  //         //console.log(GameState.scene_cursor_holder.position);
  //         let hoveredObject = false;
  //         GameState.onMouseHitInteractive( (moduleObject: ModuleObject) => {
  //           if(moduleObject instanceof ModuleObject && moduleObject.isUseable()){
  //             if(moduleObject != GameState.getCurrentPlayer()){
  //               GameState.setReticleHoveredObject(moduleObject);
  //             }
  //           }else{
  //             CursorManager.hovered = CursorManager.hoveredObject = undefined;
  //           }
  //         });
  //       }else{
  //         if(!CursorManager.selectedObject){
  //           let closest = ModuleObjectManager.GetNearestInteractableObject();
  //           GameState.setReticleSelectedObject(closest);
  //           GameState.setReticleHoveredObject(closest);
  //         }
  //       }
  //     }
  //   }

  //   if(GameState.Mode == EngineMode.INGAME && CursorManager.hovered instanceof OdysseyObject3D){
  //     CursorManager.hovered.getWorldPosition(CursorManager.reticle.position);
  //     CursorManager.reticle.visible = true;
  //   }else{
  //     CursorManager.reticle.visible = false;
  //   }

  //   if(GameState.Mode == EngineMode.INGAME && CursorManager.selected instanceof OdysseyObject3D && !MenuManager.MenuContainer.bVisible){
  //     CursorManager.selected.getWorldPosition(CursorManager.reticle2.position);
  //     CursorManager.reticle2.visible = true;
  //     if(CursorManager.selectedObject?.objectType == ModuleObjectType.ModuleDoor){      
  //       CursorManager.setReticle2('reticleF2');
  //     }else if(CursorManager.selectedObject?.objectType == ModuleObjectType.ModulePlaceable){
  //       if(!CursorManager.selectedObject.isUseable()){
  //         return;
  //       }      
  //       CursorManager.setReticle2('reticleF2');
  //     }else if(CursorManager.selectedObject?.objectType == ModuleObjectType.ModuleCreature){
  //       if(CursorManager.selectedObject.isHostile(GameState.getCurrentPlayer())){
  //         CursorManager.setReticle2('reticleH2');
  //       }else{
  //         CursorManager.setReticle2('reticleF2');
  //       }
  //     }
  //   }else{
  //     CursorManager.reticle2.visible = false;
  //   }

  // }

  static async GameMenuLoader(menuConstructor: any): Promise<GameMenu> {
    return new Promise( async (resolve: Function, reject: Function) => {
      const menu: GameMenu = new menuConstructor();
      menu.manager = MenuManager;
      await menu.load();
      resolve(menu);
    });
  }

  static async LoadGameMenus(){
    ActionMenuManager.InitActionMenuPanels();
    await CharGenManager.Init();
    try{
      if(GameState.GameKey == GameEngineType.KOTOR){
        MenuManager.CharGenAbilities = await MenuManager.GameMenuLoader(KOTOR.CharGenAbilities) as KOTOR.CharGenAbilities;
        MenuManager.CharGenClass = await MenuManager.GameMenuLoader(KOTOR.CharGenClass) as KOTOR.CharGenClass;
        MenuManager.CharGenCustomPanel = await MenuManager.GameMenuLoader(KOTOR.CharGenCustomPanel) as KOTOR.CharGenCustomPanel;
        MenuManager.CharGenFeats = await MenuManager.GameMenuLoader(KOTOR.CharGenFeats) as KOTOR.CharGenFeats;
        MenuManager.CharGenMain = await MenuManager.GameMenuLoader(KOTOR.CharGenMain) as KOTOR.CharGenMain;
        MenuManager.CharGenName = await MenuManager.GameMenuLoader(KOTOR.CharGenName) as KOTOR.CharGenName;
        MenuManager.CharGenPortCust = await MenuManager.GameMenuLoader(KOTOR.CharGenPortCust) as KOTOR.CharGenPortCust; //Character Portrait
        MenuManager.CharGenQuickOrCustom = await MenuManager.GameMenuLoader(KOTOR.CharGenQuickOrCustom) as KOTOR.CharGenQuickOrCustom;
        MenuManager.CharGenQuickPanel = await MenuManager.GameMenuLoader(KOTOR.CharGenQuickPanel) as KOTOR.CharGenQuickPanel;
        MenuManager.CharGenSkills = await MenuManager.GameMenuLoader(KOTOR.CharGenSkills) as KOTOR.CharGenSkills;

        MenuManager.MenuAbilities = await MenuManager.GameMenuLoader(KOTOR.MenuAbilities) as KOTOR.MenuAbilities;
        MenuManager.MenuAutoPause = await MenuManager.GameMenuLoader(KOTOR.MenuAutoPause) as KOTOR.MenuAutoPause;
        MenuManager.MenuCharacter = await MenuManager.GameMenuLoader(KOTOR.MenuCharacter) as KOTOR.MenuCharacter;
        MenuManager.MenuContainer = await MenuManager.GameMenuLoader(KOTOR.MenuContainer) as KOTOR.MenuContainer;
        MenuManager.MenuEquipment = await MenuManager.GameMenuLoader(KOTOR.MenuEquipment) as KOTOR.MenuEquipment;
        MenuManager.MenuGalaxyMap = await MenuManager.GameMenuLoader(KOTOR.MenuGalaxyMap) as KOTOR.MenuGalaxyMap;
        MenuManager.MenuGraphics = await MenuManager.GameMenuLoader(KOTOR.MenuGraphics) as KOTOR.MenuGraphics;
        MenuManager.MenuGraphicsAdvanced = await MenuManager.GameMenuLoader(KOTOR.MenuGraphicsAdvanced) as KOTOR.MenuGraphicsAdvanced;
        MenuManager.MenuInventory = await MenuManager.GameMenuLoader(KOTOR.MenuInventory) as KOTOR.MenuInventory;
        MenuManager.MenuJournal = await MenuManager.GameMenuLoader(KOTOR.MenuJournal) as KOTOR.MenuJournal;
        MenuManager.MenuLevelUp = await MenuManager.GameMenuLoader(KOTOR.MenuLevelUp) as KOTOR.MenuLevelUp;
        MenuManager.MenuMap = await MenuManager.GameMenuLoader(KOTOR.MenuMap) as KOTOR.MenuMap;
        MenuManager.MenuMessages = await MenuManager.GameMenuLoader(KOTOR.MenuMessages) as KOTOR.MenuMessages;
        MenuManager.MenuOptions = await MenuManager.GameMenuLoader(KOTOR.MenuOptions) as KOTOR.MenuOptions;
        MenuManager.MenuFeedback = await MenuManager.GameMenuLoader(KOTOR.MenuFeedback) as KOTOR.MenuFeedback;
        MenuManager.MenuPartySelection = await MenuManager.GameMenuLoader(KOTOR.MenuPartySelection) as KOTOR.MenuPartySelection;
        MenuManager.MenuResolutions = await MenuManager.GameMenuLoader(KOTOR.MenuResolutions) as KOTOR.MenuResolutions;
        MenuManager.MenuSaveLoad = await MenuManager.GameMenuLoader(KOTOR.MenuSaveLoad) as KOTOR.MenuSaveLoad;
        MenuManager.MenuSaveName = await MenuManager.GameMenuLoader(KOTOR.MenuSaveName) as KOTOR.MenuSaveName;
        MenuManager.MenuSound = await MenuManager.GameMenuLoader(KOTOR.MenuSound) as KOTOR.MenuSound;
        MenuManager.MenuSoundAdvanced = await MenuManager.GameMenuLoader(KOTOR.MenuSoundAdvanced) as KOTOR.MenuSoundAdvanced;
        MenuManager.MenuStore = await MenuManager.GameMenuLoader(KOTOR.MenuStore) as KOTOR.MenuStore;
        MenuManager.MenuTop = await MenuManager.GameMenuLoader(KOTOR.MenuTop) as KOTOR.MenuTop;

        MenuManager.MainMenu = await MenuManager.GameMenuLoader(KOTOR.MainMenu) as KOTOR.MainMenu;
        MenuManager.MainMovies = await MenuManager.GameMenuLoader(KOTOR.MainMovies) as KOTOR.MainMovies;
        MenuManager.MainOptions = await MenuManager.GameMenuLoader(KOTOR.MainOptions) as KOTOR.MainOptions;

        MenuManager.LoadScreen = await MenuManager.GameMenuLoader(KOTOR.LoadScreen) as KOTOR.LoadScreen;

        MenuManager.InGameAreaTransition = await MenuManager.GameMenuLoader(KOTOR.InGameAreaTransition) as KOTOR.InGameAreaTransition;
        MenuManager.InGameBark = await MenuManager.GameMenuLoader(KOTOR.InGameBark) as KOTOR.InGameBark;
        MenuManager.InGameComputer = await MenuManager.GameMenuLoader(KOTOR.InGameComputer) as KOTOR.InGameComputer;
        MenuManager.InGameComputerCam = await MenuManager.GameMenuLoader(KOTOR.InGameComputerCam) as KOTOR.InGameComputerCam;
        MenuManager.InGameConfirm = await MenuManager.GameMenuLoader(KOTOR.InGameConfirm) as KOTOR.InGameConfirm;
        MenuManager.InGameDialog = await MenuManager.GameMenuLoader(KOTOR.InGameDialog) as KOTOR.InGameDialog;
        MenuManager.InGameOverlay = await MenuManager.GameMenuLoader(KOTOR.InGameOverlay) as KOTOR.InGameOverlay;
        MenuManager.InGamePause = await MenuManager.GameMenuLoader(KOTOR.InGamePause) as KOTOR.InGamePause;
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

        MenuManager.MenuAbilities = await MenuManager.GameMenuLoader(TSL.MenuAbilities) as KOTOR.MenuAbilities;
        MenuManager.MenuCharacter = await MenuManager.GameMenuLoader(TSL.MenuCharacter) as KOTOR.MenuCharacter;
        MenuManager.MenuChemicals = await MenuManager.GameMenuLoader(TSL.MenuChemicals) as TSL.MenuChemicals;
        MenuManager.MenuContainer = await MenuManager.GameMenuLoader(TSL.MenuContainer) as KOTOR.MenuContainer;
        MenuManager.MenuEquipment = await MenuManager.GameMenuLoader(TSL.MenuEquipment) as KOTOR.MenuEquipment;
        MenuManager.MenuGalaxyMap = await MenuManager.GameMenuLoader(TSL.MenuGalaxyMap) as KOTOR.MenuGalaxyMap;
        MenuManager.MenuGraphics = await MenuManager.GameMenuLoader(TSL.MenuGraphics) as KOTOR.MenuGraphics;
        MenuManager.MenuGraphicsAdvanced = await MenuManager.GameMenuLoader(TSL.MenuGraphicsAdvanced) as KOTOR.MenuGraphicsAdvanced;
        MenuManager.MenuInventory = await MenuManager.GameMenuLoader(TSL.MenuInventory) as KOTOR.MenuInventory;
        MenuManager.MenuJournal = await MenuManager.GameMenuLoader(TSL.MenuJournal) as KOTOR.MenuJournal;
        MenuManager.MenuLevelUp = await MenuManager.GameMenuLoader(TSL.MenuLevelUp) as KOTOR.MenuLevelUp;
        MenuManager.MenuMap = await MenuManager.GameMenuLoader(TSL.MenuMap) as KOTOR.MenuMap;
        MenuManager.MenuMessages = await MenuManager.GameMenuLoader(TSL.MenuMessages) as KOTOR.MenuMessages;
        MenuManager.MenuOptions = await MenuManager.GameMenuLoader(TSL.MenuOptions) as KOTOR.MenuOptions;
        MenuManager.MenuFeedback = await MenuManager.GameMenuLoader(TSL.MenuFeedback) as KOTOR.MenuFeedback;
        MenuManager.MenuPartySelection = await MenuManager.GameMenuLoader(TSL.MenuPartySelection) as KOTOR.MenuPartySelection;
        MenuManager.MenuResolutions = await MenuManager.GameMenuLoader(TSL.MenuResolutions) as KOTOR.MenuResolutions;
        MenuManager.MenuSaveLoad = await MenuManager.GameMenuLoader(TSL.MenuSaveLoad) as KOTOR.MenuSaveLoad;
        MenuManager.MenuSaveName = await MenuManager.GameMenuLoader(TSL.MenuSaveName) as KOTOR.MenuSaveName;
        MenuManager.MenuSound = await MenuManager.GameMenuLoader(TSL.MenuSound) as KOTOR.MenuSound;
        MenuManager.MenuSoundAdvanced = await MenuManager.GameMenuLoader(TSL.MenuSoundAdvanced) as KOTOR.MenuSoundAdvanced;
        MenuManager.MenuStore = await MenuManager.GameMenuLoader(TSL.MenuStore) as KOTOR.MenuStore;
        MenuManager.MenuTop = await MenuManager.GameMenuLoader(TSL.MenuTop) as KOTOR.MenuTop;

        MenuManager.MainMenu = await MenuManager.GameMenuLoader(TSL.MainMenu) as KOTOR.MainMenu;
        MenuManager.MainMovies = await MenuManager.GameMenuLoader(TSL.MainMovies) as KOTOR.MainMovies;
        MenuManager.MainMusic = await MenuManager.GameMenuLoader(TSL.MainMusic) as TSL.MainMusic;
        MenuManager.MainOptions = await MenuManager.GameMenuLoader(TSL.MainOptions) as KOTOR.MainOptions;

        MenuManager.LoadScreen = await MenuManager.GameMenuLoader(TSL.LoadScreen) as KOTOR.LoadScreen;

        MenuManager.InGameAreaTransition = await MenuManager.GameMenuLoader(TSL.InGameAreaTransition) as KOTOR.InGameAreaTransition;
        MenuManager.InGameBark = await MenuManager.GameMenuLoader(TSL.InGameBark) as KOTOR.InGameBark;
        MenuManager.InGameComputer = await MenuManager.GameMenuLoader(TSL.InGameComputer) as KOTOR.InGameComputer;
        MenuManager.InGameComputerCam = await MenuManager.GameMenuLoader(TSL.InGameComputerCam) as KOTOR.InGameComputerCam;
        MenuManager.InGameConfirm = await MenuManager.GameMenuLoader(TSL.InGameConfirm) as KOTOR.InGameConfirm;
        MenuManager.InGameDialog = await MenuManager.GameMenuLoader(TSL.InGameDialog) as KOTOR.InGameDialog;
        MenuManager.InGameOverlay = await MenuManager.GameMenuLoader(TSL.InGameOverlay) as KOTOR.InGameOverlay;
        MenuManager.InGamePause = await MenuManager.GameMenuLoader(TSL.InGamePause) as KOTOR.InGamePause;
      }
    }catch(e){
      console.error(e);
    }
  }

}

MenuManager.Init();
