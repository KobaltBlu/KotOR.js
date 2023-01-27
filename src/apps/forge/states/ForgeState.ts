import type { LoadingScreen } from "../../../LoadingScreen";
import { EditorFile } from "../EditorFile";
import { Project } from "../Project";
import { EditorTabManager } from "../managers/EditorTabManager";
import { TabProjectExplorerState } from "./tabs/TabProjectExplorerState";
import { TabQuickStartState } from "./tabs/TabQuickStartState";
import { TabResourceExplorerState } from "./tabs/TabResourceExplorerState";

declare const KotOR: any;

export class ForgeState {
  // static MenuTop: MenuTop = new MenuTop()
  static Project: Project;
  // static loader: LoadingScreen = new KotOR.LoadingScreen();
  static tabManager: EditorTabManager = new EditorTabManager();
  static explorerTabManager: EditorTabManager = new EditorTabManager();
  static projectExplorerTab: TabProjectExplorerState = new TabProjectExplorerState();
  static resourceExplorerTab: TabResourceExplorerState = new TabResourceExplorerState();
  // static inlineAudioPlayer: InlineAudioPlayer;
  // static GameMaps: GameMap[] = [];

  static async InitializeApp(): Promise<void>{
    return new Promise( (resolve, reject) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        KotOR.ApplicationProfile.directory = KotOR.GameFileSystem.rootDirectoryPath = KotOR.ApplicationProfile.profile.directory;
      }else{
        KotOR.GameFileSystem.rootDirectoryHandle = KotOR.ApplicationProfile.profile.directory_handle;
      }
      console.log('loading game...')
      KotOR.LoadingScreen.main.SetLogo(KotOR.ApplicationProfile.profile.logo);
      KotOR.LoadingScreen.main.SetBackgroundImage(KotOR.ApplicationProfile.profile.background);
      KotOR.LoadingScreen.main.Show();
      KotOR.GameState.GameKey = KotOR.ApplicationProfile.GameKey;
      KotOR.GameInitializer.Init({
        game: KotOR.ApplicationProfile.GameKey,
        onLoad: () => {
          KotOR.OdysseyWalkMesh.Init();
          //ConfigClient.get('Game.debug.light_helpers') ? true : false
          KotOR.LightManager.toggleLightHelpers();
          KotOR.GameState.audioEngine = new KotOR.AudioEngine();
          
          ForgeState.tabManager.addTab(new TabQuickStartState());
          ForgeState.explorerTabManager.addTab(ForgeState.resourceExplorerTab);
          ForgeState.explorerTabManager.addTab(ForgeState.projectExplorerTab);
          ForgeState.resourceExplorerTab.show();
                
          TabResourceExplorerState.GenerateResourceList( ForgeState.resourceExplorerTab ).then( (resourceList) => {
            // ForgeState.resourceExplorerTab.tabContentView.setResourceList(TabResourceExplorerState.Resources);
            KotOR.LoadingScreen.main.Hide();
            setTimeout( () => {
              KotOR.LoadingScreen.main.loader.style.display = 'none';
            }, 500);
            // Forge.tabManager.AddTab(new QuickStartTab());
            // ScriptEditorTab.InitNWScriptLanguage();
          });

          let pars = { minFilter: KotOR.THREE.LinearFilter, magFilter: KotOR.THREE.LinearFilter, format: KotOR.THREE.RGBFormat };
          KotOR.GameState.depthTarget = new KotOR.THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, pars );
          KotOR.GameState.depthTarget.texture.generateMipmaps = false;
          KotOR.GameState.depthTarget.stencilBuffer = false;
          KotOR.GameState.depthTarget.depthBuffer = true;
          KotOR.GameState.depthTarget.depthTexture = new KotOR.THREE.DepthTexture(window.innerWidth, window.innerHeight);
          KotOR.GameState.depthTarget.depthTexture.type = KotOR.THREE.UnsignedShortType;

          // console.log('loaded')
          // GameState.OpeningMoviesComplete = true;
          // GUIListBox.InitTextures();
          // OdysseyWalkMesh.Init();
          // GameState.Init();
          // GameState.audioEngine.musicGain.gain.value = 0;
          // document.body.append(GameState.stats.domElement)
          resolve();
        }
      });
    });
  }

  static async VerifyGameDirectory(onVerified: Function, onError: Function){
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      let validated = await KotOR.GameFileSystem.validateDirectory(KotOR.GameFileSystem.rootDirectoryPath);
      if(validated){
        onVerified();
      }else{
        try{
          let dir = await (window as any).dialog.locateDirectoryDialog(); 
          if(dir){
            KotOR.ApplicationProfile.profile.directory = dir;
            onVerified();
          }else{
            console.error('no directory');
          }

        }catch(e: any){
          console.error(e);
        }
      }
    }else{
      if(KotOR.GameFileSystem.rootDirectoryHandle){
        let validated = await KotOR.GameFileSystem.validateDirectoryHandle(KotOR.GameFileSystem.rootDirectoryHandle);
        if(validated){
          onVerified();
        }else{
          onError();
        }
      }else{
        onError();
      }
    }
  }

  static InitManagers(){
    // ForgeState.tabManager = new EditorTabManager();
    // ForgeState.explorerTabManager = new EditorTabManager();
    // ForgeState.projectExplorerTab = new ProjectExplorerTab();
    // ForgeState.resourceExplorerTab = new ResourceExplorerTab();
  }

  static getRecentProjects(): string[] {
    if(Array.isArray(KotOR.ConfigClient.options.recent_projects)){
      // ConfigClient.options.recent_projects = ConfigClient.options.recent_projects.map( (file: any) => {
      //   return Object.assign(new EditorFile(), file);
      // });
    }else{
      KotOR.ConfigClient.options.recent_projects = [];
    }
    return KotOR.ConfigClient.options.recent_projects;
  }

  static getRecentFiles(): EditorFile[] {
    if(Array.isArray(KotOR.ConfigClient.options.recent_files)){
      KotOR.ConfigClient.options.recent_files = KotOR.ConfigClient.options.recent_files.map( (file: any) => {
        return Object.assign(new EditorFile(), file);
      });
    }else{
      KotOR.ConfigClient.options.recent_files = [];
    }
    return KotOR.ConfigClient.options.recent_files;
  }
}