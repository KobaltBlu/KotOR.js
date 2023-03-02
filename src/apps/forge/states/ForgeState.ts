import { EditorFile } from "../EditorFile";
import { Project } from "../Project";
import { EditorTabManager } from "../managers/EditorTabManager";
import { TabProjectExplorerState } from "./tabs/TabProjectExplorerState";
import { TabQuickStartState } from "./tabs/TabQuickStartState";
import { TabResourceExplorerState } from "./tabs/TabResourceExplorerState";
import * as KotOR from '../KotOR';
import { ProjectFileSystem } from "../ProjectFileSystem";
import { ForgeFileSystem, ForgeFileSystemResponse } from "../ForgeFileSystem";
import { pathParse } from "../helpers/PathParse";
import { FileTypeManager } from "../FileTypeManager";
import { EditorFileProtocol } from "../enum/EditorFileProtocol";

export class ForgeState {
  // static MenuTop: MenuTop = new MenuTop()
  static project: Project;
  // static loader: LoadingScreen = new KotOR.LoadingScreen();
  static tabManager: EditorTabManager = new EditorTabManager();
  static explorerTabManager: EditorTabManager = new EditorTabManager();
  static projectExplorerTab: TabProjectExplorerState = new TabProjectExplorerState();
  static resourceExplorerTab: TabResourceExplorerState = new TabResourceExplorerState();

  static recentFiles: EditorFile[] = [];
  static recentProjects: string[] = [];

  static #eventListeners: any = {};

  static addEventListener<T>(type: T, cb: Function): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      let ev = this.#eventListeners[type];
      let index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        console.warn('Event Listener: Already added', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static removeEventListener<T>(type: T, cb: Function): void {
    if(Array.isArray(this.#eventListeners[type])){
      let ev = this.#eventListeners[type];
      let index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        console.warn('Event Listener: Already removed', type);
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static processEventListener<T>(type: T, args: any[] = []): void {
    if(Array.isArray(this.#eventListeners[type])){
      let ev = this.#eventListeners[type];
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      console.warn('Event Listener: Unsupported', type);
    }
  }

  static triggerEventListener<T>(type: T, args: any[] = []): void {
    this.processEventListener(type, args);
  }

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

          ForgeState.recentFiles = ForgeState.getRecentFiles();
          this.processEventListener('onRecentProjectsUpdated', []);

          ForgeState.recentProjects = ForgeState.getRecentProjects();
          this.processEventListener('onRecentFilesUpdated', []);
          
          ForgeState.tabManager.addTab(new TabQuickStartState());
          ForgeState.explorerTabManager.addTab(ForgeState.resourceExplorerTab);
          ForgeState.explorerTabManager.addTab(ForgeState.projectExplorerTab);
          ForgeState.resourceExplorerTab.show();

          TabResourceExplorerState.GenerateResourceList( ForgeState.resourceExplorerTab ).then( (resourceList) => {
            KotOR.LoadingScreen.main.Hide();
            setTimeout( () => {
              KotOR.LoadingScreen.main.loader.style.display = 'none';
              resolve();
            }, 500);
            // ScriptEditorTab.InitNWScriptLanguage();
          });
        }
      });
    });
  }

  static async VerifyGameDirectory(onVerified: Function, onError: Function){
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      // let validated = await KotOR.GameFileSystem.validateDirectory(KotOR.GameFileSystem.rootDirectoryPath);
      if(await KotOR.GameFileSystem.exists('chitin.key')){
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
    return KotOR.ConfigClient.options.recent_files as EditorFile[];
  }

  static addRecentFile(file: EditorFile){
    try{
      //Update the opened files list
      let file_path = file.getPath();
      if(file_path){
        this.removeRecentFile(file);

        //Append this file to the beginning of the list
        ForgeState.recentFiles.unshift(file);

        this.saveState();

        //Notify the project we have opened a new file
        if(ForgeState.project instanceof Project){
          ForgeState.project.addToOpenFileList(file);
        }
        this.processEventListener('onRecentFilesUpdated', [file]);
      }
    }catch(e){
      console.error(e);
    }
  }

  static removeRecentFile(file: EditorFile){
    if(!file) return;
    let file_path = file.getPath();
    if(file_path){
      const index = ForgeState.recentFiles.findIndex( (file: EditorFile) => {
        return file.getPath() == file_path;
      })
      if (index >= 0) {
        ForgeState.recentFiles.splice(index, 1);
      }
    }
    this.processEventListener('onRecentFilesUpdated', [file]);
    this.saveState();
  }

  static saveState(){
    try{
      KotOR.ConfigClient.save(null as any, true); //Save the configuration silently
    }catch(e){
      console.error(e);
    }
  }

  static switchGame(profile: any = {}){
    //TODO

    //check if the new profile is different from the current profile

    //check for open unsaved work

    //save the current forge state

    //switch to the new profile

    //give the use back control of the application
  }

  static openFile(){
    ForgeFileSystem.OpenFile().then( async (response: ForgeFileSystemResponse) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(Array.isArray(response.paths)){
          const file_path = response.paths[0];
          let parsed = pathParse(file_path);
          let fileParts = parsed.name.split('.');
          if(parsed.ext == '.mdl'){
            (window as any).dialog.showOpenDialog({
              title: `Open MDX File (${fileParts[0]}.mdx)`,
              filters: [
                {name: 'Model File', extensions: ['mdx']},
                {name: 'All Formats', extensions: ['*']},
              ],
              properties: ['createDirectory'],
            }).then( (result: any) => {
              let file_path2 = result.filePaths[0];
              FileTypeManager.onOpenFile({
                path: file_path, 
                path2: file_path2, 
                filename: parsed.base, 
                resref: parsed.name, 
                ext: fileParts[1]
              });
            });
          }else{
            FileTypeManager.onOpenFile({
              path: file_path, 
              filename: parsed.base, 
              resref: parsed.name, 
              ext: fileParts[1]
            });
          }
        }
      }else{
        if(Array.isArray(response.handles)){
          const [handle] = response.handles as FileSystemFileHandle[];
          let parsed = pathParse(handle.name);
          let fileParts = parsed.name.split('.');

          if(parsed.ext == '.mdl'){

            const originalTitle = document.title;
            document.title = `Open MDX File (${fileParts[0]}.mdx)`;

            const mdxResponse = await ForgeFileSystem.OpenFile({
              ext: ['.mdx'],
            });
            const [mdxHandle] = mdxResponse.handles as FileSystemFileHandle[];

            document.title = originalTitle;

            FileTypeManager.onOpenFile({
              path: `${EditorFileProtocol.FILE}//system.dir/${handle.name}`, 
              path2: `${EditorFileProtocol.FILE}//system.dir/${mdxHandle.name}`, 
              handle: handle, 
              handle2: mdxHandle, 
              filename: handle.name, 
              resref: fileParts[0], 
              ext: fileParts[1]
            });


          }else{
            FileTypeManager.onOpenFile({
              path: `${EditorFileProtocol.FILE}//system.dir/${handle.name}`, 
              handle: handle, 
              filename: handle.name, 
              resref: fileParts[0], 
              ext: fileParts[1]
            });
          }
        }
      }
    });
  }

}
(window as any).ForgeState = ForgeState;
(window as any).ProjectFileSystem = ProjectFileSystem;
