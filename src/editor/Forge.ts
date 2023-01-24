import { LoadingScreen } from "../LoadingScreen";
import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { ConfigClient } from "../utility/ConfigClient";
import { GameFileSystem } from "../utility/GameFileSystem";
import { EditorFile } from "./EditorFile";
import { EditorTabManager } from "./EditorTabManager";
import { InlineAudioPlayer } from "./InlineAudioPlayer";
import { GameMap } from "./interface/GameMap";
import { Project } from "./Project";
import { ProjectExplorerTab, ResourceExplorerTab } from "./tabs";
import { MenuTop } from "./ui/MenuTop";
import { GameState } from "../GameState";
import { GameInitializer } from "../GameInitializer";
import { OdysseyWalkMesh } from "../odyssey";
import { LightManager } from "../managers/LightManager";
import * as THREE from "three";

export class Forge {
  static MenuTop: MenuTop = new MenuTop()
  static Project: Project;
  static loader: LoadingScreen;// = new LoadingScreen();
  static tabManager: EditorTabManager = new EditorTabManager();
  static explorerTabManager: EditorTabManager = new EditorTabManager();
  static projectExplorerTab: ProjectExplorerTab;
  static resourceExplorerTab: ResourceExplorerTab;
  static inlineAudioPlayer: InlineAudioPlayer;
  static GameMaps: GameMap[] = [];

  static InitializeApp(){
    if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
      ApplicationProfile.directory = GameFileSystem.rootDirectoryPath = ApplicationProfile.profile.directory;
    }else{
      GameFileSystem.rootDirectoryHandle = ApplicationProfile.profile.directory_handle;
    }
    console.log('loading game...')
    LoadingScreen.main.SetLogo(ApplicationProfile.profile.logo);
    LoadingScreen.main.SetBackgroundImage(ApplicationProfile.profile.background);
    LoadingScreen.main.Show();
    GameState.GameKey = ApplicationProfile.GameKey;
    GameInitializer.Init({
      game: ApplicationProfile.GameKey,
      onLoad: () => {
        OdysseyWalkMesh.Init();
        //ConfigClient.get('Game.debug.light_helpers') ? true : false
        LightManager.toggleLightHelpers();
              
        // Forge.resourceExplorerTab.initialize( () => {
          LoadingScreen.main.Hide();
          setTimeout( () => {
            LoadingScreen.main.loader.style.display = 'none';
          }, 500);
          // Forge.tabManager.AddTab(new QuickStartTab());
          // ScriptEditorTab.InitNWScriptLanguage();
        // });

        let pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
        GameState.depthTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
        GameState.depthTarget.texture.generateMipmaps = false;
        GameState.depthTarget.stencilBuffer = false;
        GameState.depthTarget.depthBuffer = true;
        GameState.depthTarget.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
        GameState.depthTarget.depthTexture.type = THREE.UnsignedShortType;

        // console.log('loaded')
        // GameState.OpeningMoviesComplete = true;
        // GUIListBox.InitTextures();
        // OdysseyWalkMesh.Init();
        // GameState.Init();
        // GameState.audioEngine.musicGain.gain.value = 0;
        // document.body.append(GameState.stats.domElement)
      }
    });
  }

  static InitManagers(){
    Forge.tabManager = new EditorTabManager();
    Forge.explorerTabManager = new EditorTabManager();
    Forge.projectExplorerTab = new ProjectExplorerTab();
    Forge.resourceExplorerTab = new ResourceExplorerTab();

    // explorerTabManager.AttachTo($('#tabs-explorer'));
    
    // explorerTabManager.AddTab(resourceExplorerTab);
    // explorerTabManager.AddTab(projectExplorerTab);
    
    // resourceExplorerTab.Show();
    
    // Forge.MenuTop.BuildTopMenu();
    // Forge.tabManager.AttachTo($('#renderer-container #tabs-container'));
  }

  static getRecentProjects(): string[] {
    if(Array.isArray(ConfigClient.options.recent_projects)){
      // ConfigClient.options.recent_projects = ConfigClient.options.recent_projects.map( (file: any) => {
      //   return Object.assign(new EditorFile(), file);
      // });
    }else{
      ConfigClient.options.recent_projects = [];
    }
    return ConfigClient.options.recent_projects;
  }

  static getRecentFiles(): EditorFile[] {
    if(Array.isArray(ConfigClient.options.recent_files)){
      ConfigClient.options.recent_files = ConfigClient.options.recent_files.map( (file: any) => {
        return Object.assign(new EditorFile(), file);
      });
    }else{
      ConfigClient.options.recent_files = [];
    }
    return ConfigClient.options.recent_files;
  }
}
