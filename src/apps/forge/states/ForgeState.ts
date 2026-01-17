import { EditorFile } from "../EditorFile";
import { Project } from "../Project";
import { EditorTabManager } from "../managers/EditorTabManager";
import { TabProjectExplorerState } from "./tabs/TabProjectExplorerState";
import { TabQuickStartState } from "./tabs/TabQuickStartState";
import { TabResourceExplorerState } from "./tabs/TabResourceExplorerState";
import { ProjectFileSystem } from "../ProjectFileSystem";
import { ForgeFileSystem, ForgeFileSystemResponse } from "../ForgeFileSystem";
import { pathParse } from "../helpers/PathParse";
import { FileTypeManager } from "../FileTypeManager";
import { EditorFileProtocol } from "../enum/EditorFileProtocol";
import { TabStoreState } from "../interfaces/TabStoreState";
import { NWScriptParser } from "../../../nwscript/compiler/NWScriptParser";
import { ModalManagerState } from "./modal/ModalManagerState";
import { MenuTopState } from "./MenuTopState";

import * as KotOR from '../KotOR';
import { NWScriptLanguageService } from "./NWScriptLanguageService";
import { LYTLanguageService } from "./LYTLanguageService";
import { RecentProject } from "../RecentProject";

export class ForgeState {
  // static MenuTop: MenuTop = new MenuTop()
  static project: Project
  // static loader: LoadingScreen = new KotOR.LoadingScreen();
  static modalManager: ModalManagerState = new ModalManagerState();
  static tabManager: EditorTabManager = new EditorTabManager();
  static explorerTabManager: EditorTabManager = new EditorTabManager();
  static projectExplorerTab: TabProjectExplorerState = new TabProjectExplorerState();
  static resourceExplorerTab: TabResourceExplorerState = new TabResourceExplorerState();

  static recentFiles: EditorFile[] = [];
  static recentProjects: RecentProject[] = [];

  static #eventListeners: any = {};

  static nwscript_nss: Uint8Array;
  static nwScriptParser: NWScriptParser;

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

  /**
   * Initializes the loading screen
   */
  static loaderInit(backgroundURL: string, logoURL: string): void {
    ForgeState.processEventListener('on-loader-init', [backgroundURL, logoURL]);
  }

  /**
   * Shows the loading screen
   */
  static loaderShow(): void {
    ForgeState.processEventListener('on-loader-show', []);
  }

  /**
   * Hides the loading screen
   */
  static loaderHide(): void {
    ForgeState.processEventListener('on-loader-hide', []);
  }

  /**
   * Sets the loading screen message
   */
  static loaderMessage(message: string): void {
    ForgeState.processEventListener('on-loader-message', [message]);
  }

  static async InitializeApp(): Promise<void>{
    return new Promise( (resolve, reject) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        KotOR.ApplicationProfile.directory = KotOR.ApplicationProfile.profile.directory;
      }else{
        KotOR.ApplicationProfile.directoryHandle = KotOR.ApplicationProfile.profile.directory_handle;
      }
      console.log('loading game...')
      ForgeState.loaderInit(KotOR.ApplicationProfile.profile.background, KotOR.ApplicationProfile.profile.logo);
      ForgeState.loaderShow();
      KotOR.GameState.GameKey = KotOR.ApplicationProfile.GameKey;
      KotOR.GameInitializer.AddEventListener('on-loader-message', (message: string) => {
        ForgeState.loaderMessage(message);
      });
      KotOR.GameInitializer.Init(KotOR.ApplicationProfile.GameKey).then( async () => {
        await this.initNWScriptParser();
        KotOR.OdysseyWalkMesh.Init();
        KotOR.AudioEngine.GetAudioEngine();
        KotOR.AudioEngine.GAIN_SFX = 0.75;
        KotOR.AudioEngine.GAIN_VO = 0.75;
        KotOR.AudioEngine.GAIN_MUSIC = 0.75;
        KotOR.AudioEngine.GAIN_MOVIE = 0.75;
        KotOR.AudioEngine.GAIN_GUI = 0.75;
        MenuTopState.buildAudioMenuItems();
        //ConfigClient.get('Game.debug.light_helpers') ? true : false
        // KotOR.LightManager.toggleLightHelpers();
        // KotOR.AudioEngine.GetAudioEngine() = new KotOR.AudioEngine();

        ForgeState.recentFiles = ForgeState.getRecentFiles();
        ForgeState.recentProjects = ForgeState.getRecentProjects();
        
        // Restore handles from IndexedDB for browser projects
        if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
          const { get } = await import('idb-keyval');
          for(const proj of ForgeState.recentProjects){
            if(!proj.handle && proj.name){
              const handleKey = `project_handle_${proj.getIdentifier()}`;
              try {
                const handle = await get(handleKey);
                if(handle instanceof FileSystemDirectoryHandle){
                  proj.handle = handle;
                }
              } catch(e) {
                console.warn('Failed to restore handle for project:', proj.getDisplayName(), e);
              }
            }
          }
        }
        
        this.processEventListener('onRecentProjectsUpdated', []);
        this.processEventListener('onRecentFilesUpdated', []);
        
        const tabStates: TabStoreState[] = KotOR.ConfigClient.get('open_tabs', []);
        if(tabStates.length){
          for(let i = 0; i < tabStates.length; i++){
            const tabState = tabStates[i];
            this.tabManager.restoreTabState(tabState);
          }
        }else{
          ForgeState.tabManager.addTab(new TabQuickStartState());
        }

        ForgeState.tabManager.addEventListener('onTabAdded', () => {
          ForgeState.saveOpenTabsState();
        });

        ForgeState.tabManager.addEventListener('onTabRemoved', () => {
          ForgeState.saveOpenTabsState();
        });

        ForgeState.explorerTabManager.addTab(ForgeState.resourceExplorerTab);
        ForgeState.explorerTabManager.addTab(ForgeState.projectExplorerTab);
        ForgeState.resourceExplorerTab.show();

        TabResourceExplorerState.GenerateResourceList( ForgeState.resourceExplorerTab ).then( (resourceList) => {
          ForgeState.loaderHide();
          // ScriptEditorTab.InitNWScriptLanguage();
          resolve();
        });
      });
    });
  }

  static async VerifyGameDirectory(onVerified: Function, onError: Function){
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      // let validated = await KotOR.GameFileSystem.validateDirectory(KotOR.ApplicationProfile.rootDirectory);
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
      if(KotOR.ApplicationProfile.directoryHandle){
        let validated = await KotOR.GameFileSystem.validateDirectoryHandle(KotOR.ApplicationProfile.directoryHandle);
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

  static initNWScriptParser(){
    return new Promise<void>( (resolve, reject) => {
      KotOR.ResourceLoader.loadResource( KotOR.ResourceTypes.nss, 'nwscript').then(
        (nss: Uint8Array) => {
          this.nwscript_nss = nss;
          const textDecoder = new TextDecoder();
          this.nwScriptParser = new NWScriptParser(textDecoder.decode(this.nwscript_nss));
          NWScriptLanguageService.initNWScriptLanguage();
          LYTLanguageService.initLYTLanguage();
          resolve();
        }
      ).catch( (e) => {console.error(e)});
    });
  }

  static getRecentProjects(): RecentProject[] {
    if(Array.isArray(KotOR.ConfigClient.options.recent_projects)){
      // Convert stored objects to RecentProject instances
      KotOR.ConfigClient.options.recent_projects = KotOR.ConfigClient.options.recent_projects
        .filter((proj: any) => proj && (proj.path || proj.handle || proj.name))
        .map((proj: any) => RecentProject.From(proj))
        .slice(0, 10);
    }else{
      KotOR.ConfigClient.options.recent_projects = [];
    }
    return KotOR.ConfigClient.options.recent_projects as RecentProject[];
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

  static async addRecentProject(projectPathOrHandle: string | FileSystemDirectoryHandle, handle?: FileSystemDirectoryHandle){
    try{
      let project: RecentProject | null = null;

      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        // For Electron, projectPathOrHandle is a string path
        if(typeof projectPathOrHandle === 'string' && projectPathOrHandle){
          const normalizedPath = projectPathOrHandle.replace(/\\/g, '/');
          project = new RecentProject({ path: normalizedPath });
        }
      } else {
        // For Browser, projectPathOrHandle could be a handle or a string name
        if(projectPathOrHandle instanceof FileSystemDirectoryHandle){
          project = new RecentProject({ 
            handle: projectPathOrHandle,
            name: projectPathOrHandle.name 
          });
        } else if(handle instanceof FileSystemDirectoryHandle){
          project = new RecentProject({ 
            handle: handle,
            name: typeof projectPathOrHandle === 'string' ? projectPathOrHandle : handle.name 
          });
        } else if(typeof projectPathOrHandle === 'string'){
          // Fallback: just store the name if handle is not available
          project = new RecentProject({ name: projectPathOrHandle });
        }
      }

      if(!project) return;

      // Remove if already exists (by identifier)
      await this.removeRecentProject(project);

      // Add to beginning of list
      ForgeState.recentProjects.unshift(project);

      // Limit to 10 most recent
      if(ForgeState.recentProjects.length > 10){
        ForgeState.recentProjects = ForgeState.recentProjects.slice(0, 10);
      }

      // Sync with ConfigClient (handles are stored in IndexedDB via idb-keyval)
      // We serialize the project data, but handles are stored separately
      const { set } = await import('idb-keyval');
      KotOR.ConfigClient.options.recent_projects = ForgeState.recentProjects.map((proj: RecentProject) => {
        const serialized: any = {
          path: proj.path,
          name: proj.name
        };
        // Store handle separately in IndexedDB if available
        if(proj.handle){
          const handleKey = `project_handle_${proj.getIdentifier()}`;
          // Store handle in IndexedDB (idb-keyval handles FileSystemDirectoryHandle)
          set(handleKey, proj.handle).catch((e) => {
            console.warn('Failed to store handle in IndexedDB:', e);
          });
          serialized.handleKey = handleKey;
        }
        return serialized;
      });

      this.saveState();
      this.processEventListener('onRecentProjectsUpdated', [project]);
    }catch(e){
      console.error('Error adding recent project:', e);
    }
  }

  static async removeRecentProject(projectOrIdentifier: RecentProject | string){
    if(!projectOrIdentifier) return;
    
    let index = -1;
    if(projectOrIdentifier instanceof RecentProject){
      const identifier = projectOrIdentifier.getIdentifier();
      index = ForgeState.recentProjects.findIndex((proj: RecentProject) => {
        return proj.getIdentifier() === identifier;
      });
    } else {
      const normalized = typeof projectOrIdentifier === 'string' 
        ? projectOrIdentifier.replace(/\\/g, '/') 
        : '';
      index = ForgeState.recentProjects.findIndex((proj: RecentProject) => {
        return proj.getIdentifier()?.replace(/\\/g, '/') === normalized;
      });
    }
    
    if(index >= 0){
      const removed = ForgeState.recentProjects[index];
      // Clean up stored handle if it exists
      if(removed.handle){
        const handleKey = `project_handle_${removed.getIdentifier()}`;
        const { del } = await import('idb-keyval');
        del(handleKey).catch((e) => {
          console.warn('Failed to delete handle from IndexedDB:', e);
        });
      }
      ForgeState.recentProjects.splice(index, 1);
      const { set } = await import('idb-keyval');
      KotOR.ConfigClient.options.recent_projects = ForgeState.recentProjects.map((proj: RecentProject) => {
        const serialized: any = {
          path: proj.path,
          name: proj.name
        };
        if(proj.handle){
          const handleKey = `project_handle_${proj.getIdentifier()}`;
          set(handleKey, proj.handle).catch((e) => {
            console.warn('Failed to store handle in IndexedDB:', e);
          });
          serialized.handleKey = handleKey;
        }
        return serialized;
      });
      this.saveState();
      this.processEventListener('onRecentProjectsUpdated', []);
    }
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
          const parsed = pathParse(file_path);
          if(parsed.ext == 'mdl'){
            (window as any).dialog.showOpenDialog({
              title: `Open MDX File (${parsed.name}.mdx)`,
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
                ext: parsed.ext
              });
            });
          }else{
            FileTypeManager.onOpenFile({
              path: file_path, 
              filename: parsed.base, 
              resref: parsed.name, 
              ext: parsed.ext
            });
          }
        }
      }else{
        if(Array.isArray(response.handles)){
          const [handle] = response.handles as FileSystemFileHandle[];
          const parsed = pathParse(handle.name);

          if(parsed.ext == 'mdl'){

            const originalTitle = document.title;
            document.title = `Open MDX File (${parsed.name}.mdx)`;

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
              resref: parsed.name, 
              ext: parsed.ext
            });


          }else{
            FileTypeManager.onOpenFile({
              path: `${EditorFileProtocol.FILE}//system.dir/${handle.name}`, 
              handle: handle, 
              filename: handle.name, 
              resref: parsed.name, 
              ext: parsed.ext
            });
          }
        }
      }
    });
  }

  static saveOpenTabsState(){
    return;
    try{
      const states: TabStoreState[] = ForgeState.tabManager.tabs.map( (state) => {
        return {
          type: state.type,
          file: state.file
        }
      });
      KotOR.ConfigClient.set('open_tabs', states);
    }catch(e){
      console.error(e);
    }
  }

}
(window as any).ForgeState = ForgeState;
(window as any).ProjectFileSystem = ProjectFileSystem;

window.addEventListener('beforeunload', (event) => { 
  console.log('Saving Editor Config');
  ForgeState.saveOpenTabsState();
});
