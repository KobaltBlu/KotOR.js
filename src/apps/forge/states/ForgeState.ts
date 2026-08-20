import { EditorFile } from "@/apps/forge/EditorFile";
import { Project } from "@/apps/forge/Project";
import { EditorTabManager } from "@/apps/forge/managers/EditorTabManager";
import { TabProjectExplorerState } from "@/apps/forge/states/tabs/TabProjectExplorerState";
import { TabQuickStartState } from "@/apps/forge/states/tabs/TabQuickStartState";
import { TabResourceExplorerState } from "@/apps/forge/states/tabs/TabResourceExplorerState";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { ForgeFileSystem, ForgeFileSystemResponse } from "@/apps/forge/ForgeFileSystem";
import { pathParse } from "@/apps/forge/helpers/PathParse";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { TabStoreState } from "@/apps/forge/interfaces/TabStoreState";
import { NWScriptParser } from "@/nwscript/compiler/NWScriptParser";
import { ModalManagerState } from "@/apps/forge/states/modal/ModalManagerState";
import { MenuTopState } from "@/apps/forge/states/MenuTopState";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { ModalItemBrowserState } from "@/apps/forge/states/modal/ModalItemBrowserState";
import { ModalBlueprintBrowserState } from "@/apps/forge/states/modal/ModalBlueprintBrowserState";
import { ModalResRefBrowserState } from "@/apps/forge/states/modal/ModalResRefBrowserState";
import { ModalScriptBrowserState } from "@/apps/forge/states/modal/ModalScriptBrowserState";

import * as KotOR from "@/apps/forge/KotOR";
import { ForgeInitializer } from "@/apps/forge/ForgeInitializer";
import { NWScriptLanguageService } from "@/apps/forge/states/NWScriptLanguageService";
import { LYTLanguageService } from "@/apps/forge/states/LYTLanguageService";
import { TXILanguageService } from "@/apps/forge/states/TXILanguageService";
import { RecentProject } from "@/apps/forge/RecentProject";
import {
  isPersistableDirectoryHandle,
  isProjectDirectoryHandle,
} from "@/apps/forge/virtual/VirtualProjectFolder";
import {
  boundGameDirectoryLabel,
  clearGameDirectoryBinding,
  isUsableDirectoryHandle,
  persistGameDirectoryHandle,
  persistGameDirectoryPath,
} from "@/utility/gameDirectoryAccess";
import { getSessionSettings, shouldRestoreOpenTabs } from "@/apps/forge/settings/forgeSessionSettings";
import { forgeAudioSettings } from "@/apps/forge/settings/forgeEditorsSettings";

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
  static explorerPaneOpen: boolean = true;
  static hasGameData: boolean = false;
  static #shellInitialized: boolean = false;

  static #persistOpenTabs = (): void => {
    ForgeState.saveOpenTabsState();
  };

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

  static setExplorerPaneOpen(open: boolean): void {
    this.explorerPaneOpen = !!open;
    this.processEventListener('onExplorerPaneToggle', [this.explorerPaneOpen]);
  }

  static toggleExplorerPane(): void {
    this.setExplorerPaneOpen(!this.explorerPaneOpen);
  }

  static setHasGameData(value: boolean): void {
    this.hasGameData = !!value;
    this.processEventListener('onGameDataChanged', [this.hasGameData]);
  }

  static async hasChitinKey(): Promise<boolean> {
    try{
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(!KotOR.ApplicationProfile.directory && !KotOR.ApplicationProfile.profile?.directory){
          return false;
        }
      }else if(!KotOR.ApplicationProfile.directoryHandle){
        return false;
      }
      return await KotOR.GameFileSystem.exists('chitin.key');
    }catch(e){
      console.warn('ForgeState.hasChitinKey', e);
      return false;
    }
  }

  static gameProfileKey(): string {
    return String(KotOR.ApplicationProfile.profile?.key || KotOR.ApplicationProfile.key || "").toLowerCase();
  }

  static getBoundGameDirectoryLabel(): string {
    const env = KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON ? "electron" : "browser";
    return boundGameDirectoryLabel({
      directory: KotOR.ApplicationProfile.directory || KotOR.ApplicationProfile.profile?.directory,
      directory_handle: KotOR.ApplicationProfile.directoryHandle || KotOR.ApplicationProfile.profile?.directory_handle,
    }, env);
  }

  static hasBoundGameDirectory(): boolean {
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      return !!(KotOR.ApplicationProfile.directory || KotOR.ApplicationProfile.profile?.directory);
    }
    return !!(KotOR.ApplicationProfile.directoryHandle || KotOR.ApplicationProfile.profile?.directory_handle);
  }

  static async promptAndBindGameDirectory(): Promise<"ok" | "cancelled" | "invalid"> {
    const profileKey = ForgeState.gameProfileKey();
    if(!KotOR.ApplicationProfile.profile){
      KotOR.ApplicationProfile.profile = { key: profileKey };
    }
    const previousDirectory = KotOR.ApplicationProfile.directory;
    const previousHandle = KotOR.ApplicationProfile.directoryHandle;
    const previousProfileDirectory = KotOR.ApplicationProfile.profile.directory;
    const previousProfileHandle = KotOR.ApplicationProfile.profile.directory_handle;

    const restorePrevious = () => {
      KotOR.ApplicationProfile.directory = previousDirectory;
      KotOR.ApplicationProfile.directoryHandle = previousHandle;
      KotOR.ApplicationProfile.profile.directory = previousProfileDirectory;
      KotOR.ApplicationProfile.profile.directory_handle = previousProfileHandle;
    };

    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      try{
        const dir = await (window as any).dialog?.locateDirectoryDialog?.();
        if(!dir){
          return "cancelled";
        }
        KotOR.ApplicationProfile.profile.directory = dir;
        KotOR.ApplicationProfile.directory = dir;
        if(!(await ForgeState.hasChitinKey())){
          restorePrevious();
          return "invalid";
        }
        persistGameDirectoryPath(profileKey, dir);
      }catch(e){
        console.error(e);
        restorePrevious();
        return "cancelled";
      }
    }else{
      const handle = await KotOR.GameFileSystem.showRequestDirectoryDialog();
      if(!handle){
        return "cancelled";
      }
      KotOR.ApplicationProfile.directoryHandle = handle;
      KotOR.ApplicationProfile.profile.directory_handle = handle;
      if(!(await ForgeState.hasChitinKey())){
        restorePrevious();
        return "invalid";
      }
      await persistGameDirectoryHandle(profileKey, handle);
    }
    return "ok";
  }

  static async unbindGameDirectory(): Promise<void> {
    await clearGameDirectoryBinding(ForgeState.gameProfileKey());
    KotOR.ApplicationProfile.directory = undefined as any;
    KotOR.ApplicationProfile.directoryHandle = undefined as any;
    if(KotOR.ApplicationProfile.profile){
      delete KotOR.ApplicationProfile.profile.directory;
      delete KotOR.ApplicationProfile.profile.directory_handle;
    }
    try{
      KotOR.KEYManager.Key = new KotOR.KEYObject();
      KotOR.BIFManager.Clear();
    }catch(e){
      console.warn('ForgeState.unbindGameDirectory: archive reset failed', e);
    }
    try{
      KotOR.TLKManager.TLKStrings = [];
      KotOR.TLKManager.TLKObject = undefined as any;
    }catch(e){
      console.warn('ForgeState.unbindGameDirectory: tlk reset failed', e);
    }
    ForgeState.setHasGameData(false);
    ForgeState.invalidateGameCatalogCaches();
    TabResourceExplorerState.Resources.length = 0;
    ForgeState.resourceExplorerTab?.reload();
    MenuTopState.rebuild();
  }

  static invalidateGameCatalogCaches(): void {
    ModalItemBrowserState.invalidateCache();
    ModalBlueprintBrowserState.invalidateCache();
    ModalResRefBrowserState.invalidateKeyCache();
    ModalScriptBrowserState.invalidateKeyCache();
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
        const profileHandle = KotOR.ApplicationProfile.profile?.directory_handle;
        if(isUsableDirectoryHandle(profileHandle)){
          KotOR.ApplicationProfile.directoryHandle = profileHandle;
        }else if(isUsableDirectoryHandle(KotOR.ApplicationProfile.directoryHandle)){
          KotOR.ApplicationProfile.profile.directory_handle = KotOR.ApplicationProfile.directoryHandle;
        }else{
          KotOR.ApplicationProfile.directoryHandle = undefined as any;
        }
      }
      console.log('loading game...')
      ForgeState.loaderInit(KotOR.ApplicationProfile.profile.background, KotOR.ApplicationProfile.profile.logo);
      ForgeState.loaderShow();
      KotOR.GameState.GameKey = KotOR.ApplicationProfile.GameKey;
      ForgeInitializer.AddEventListener('on-loader-message', (message: string) => {
        ForgeState.loaderMessage(message);
      });

      const finish = async () => {
        await this.initNWScriptParser();
        try{
          KotOR.OdysseyWalkMesh.Init();
        }catch(e){
          console.warn('OdysseyWalkMesh.Init failed', e);
        }
        try{
          KotOR.AudioEngine.GetAudioEngine();
          KotOR.AudioEngine.GAIN_SFX = 0.75;
          KotOR.AudioEngine.GAIN_VO = 0.75;
          KotOR.AudioEngine.GAIN_MUSIC = 0.75;
          KotOR.AudioEngine.GAIN_MOVIE = 0.75;
          KotOR.AudioEngine.GAIN_GUI = 0.75;
        }catch(e){
          console.warn('AudioEngine init failed', e);
        }
        MenuTopState.rebuild();
        AudioPlayerState.AddEventListener("onFloatingMiniPlayerPrefs", () => {
          MenuTopState.rebuild();
        });

        ForgeState.recentFiles = ForgeState.getRecentFiles();
        ForgeState.recentProjects = ForgeState.getRecentProjects();
        
        if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.BROWSER){
          const { get } = await import('idb-keyval');
          for(const proj of ForgeState.recentProjects){
            if(!proj.handle && proj.name){
              const handleKey = `project_handle_${proj.getIdentifier()}`;
              try {
                const handle = await get(handleKey);
                if(isUsableDirectoryHandle(handle) || isProjectDirectoryHandle(handle)){
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

        if(!ForgeState.#shellInitialized){
          ForgeState.tabManager.clearAllTabs();
          ForgeState.explorerTabManager.clearAllTabs();

          const session = getSessionSettings();
          ForgeState.setExplorerPaneOpen(session.explorerOpenOnLaunch);
          AudioPlayerState.volume = forgeAudioSettings.get().volume;
          AudioPlayerState.loop = forgeAudioSettings.get().loop;
          if (session.showFloatingMiniPlayer) {
            AudioPlayerState.showFloatingMiniPlayer();
          }

          const tabStates: TabStoreState[] = KotOR.ConfigClient.get('open_tabs', []);
          if(shouldRestoreOpenTabs(session.restoreOpenTabs, tabStates)){
            for(let i = 0; i < tabStates.length; i++){
              const tabState = tabStates[i];
              this.tabManager.restoreTabState(tabState);
            }
          }else{
            ForgeState.tabManager.addTab(new TabQuickStartState());
          }

          const persistOpenTabs = ForgeState.#persistOpenTabs;
          ForgeState.tabManager.removeEventListener('onTabAdded', persistOpenTabs);
          ForgeState.tabManager.removeEventListener('onTabRemoved', persistOpenTabs);
          ForgeState.tabManager.removeEventListener('onTabsReordered', persistOpenTabs);
          ForgeState.tabManager.addEventListener('onTabAdded', persistOpenTabs);
          ForgeState.tabManager.addEventListener('onTabRemoved', persistOpenTabs);
          ForgeState.tabManager.addEventListener('onTabsReordered', persistOpenTabs);

          ForgeState.saveOpenTabsState();

          ForgeState.explorerTabManager.addTab(ForgeState.resourceExplorerTab);
          ForgeState.explorerTabManager.addTab(ForgeState.projectExplorerTab);
          ForgeState.resourceExplorerTab.show();
          ForgeState.#shellInitialized = true;
        }

        if(ForgeState.hasGameData){
          try{
            await TabResourceExplorerState.GenerateResourceList(ForgeState.resourceExplorerTab);
          }catch(e){
            console.warn('GenerateResourceList failed', e);
          }
        }else{
          TabResourceExplorerState.Resources.length = 0;
          ForgeState.resourceExplorerTab.reload();
        }
        ForgeState.loaderHide();
        const perfMonitor = (KotOR.GameState as any)?.PerformanceMonitor;
        if(perfMonitor && typeof perfMonitor.toString === 'function'){
          console.log(perfMonitor.toString());
        }
        resolve();
      };

      ForgeState.hasChitinKey().then(async (hasKey) => {
        const loaded = await ForgeInitializer.Init(KotOR.ApplicationProfile.GameKey, { loadGameData: hasKey });
        ForgeState.setHasGameData(!!loaded);
        await finish();
      }).catch(async (e) => {
        console.error(e);
        await ForgeInitializer.Init(KotOR.ApplicationProfile.GameKey, { loadGameData: false });
        ForgeState.setHasGameData(false);
        await finish();
      });
    });
  }

  static async attachGameData(): Promise<boolean> {
    ForgeState.loaderInit(KotOR.ApplicationProfile.profile.background, KotOR.ApplicationProfile.profile.logo);
    ForgeState.loaderShow();
    ForgeState.loaderMessage('Loading game data...');
    try{
      const loaded = await ForgeInitializer.LoadGameData();
      ForgeState.setHasGameData(!!loaded);
      if(loaded){
        ForgeState.invalidateGameCatalogCaches();
        await this.initNWScriptParser();
        try{
          await TabResourceExplorerState.GenerateResourceList(ForgeState.resourceExplorerTab);
        }catch(e){
          console.warn('GenerateResourceList failed', e);
        }
        MenuTopState.rebuild();
      }
      return !!loaded;
    }catch(e){
      console.error('ForgeState.attachGameData', e);
      ForgeState.setHasGameData(false);
      return false;
    }finally{
      ForgeState.loaderHide();
    }
  }

  static async VerifyGameDirectory(onVerified: Function, onError: Function){
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      if(await ForgeState.hasChitinKey()){
        onVerified();
      }else{
        onError();
      }
    }else{
      if(KotOR.ApplicationProfile.directoryHandle){
        let validated = await KotOR.GameFileSystem.validateDirectoryHandle(KotOR.ApplicationProfile.directoryHandle);
        if(validated && await ForgeState.hasChitinKey()){
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
    return new Promise<void>( (resolve) => {
      const registerLanguages = () => {
        try{
          NWScriptLanguageService.initNWScriptLanguage();
          LYTLanguageService.initLYTLanguage();
          TXILanguageService.initTXILanguage();
        }catch(e){
          console.warn('language service init failed', e);
        }
        resolve();
      };
      KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes.nss, 'nwscript').then(
        (nss: Uint8Array) => {
          this.nwscript_nss = nss;
          const textDecoder = new TextDecoder();
          this.nwScriptParser = new NWScriptParser(textDecoder.decode(this.nwscript_nss));
          registerLanguages();
        }
      ).catch( (e) => {
        console.warn('nwscript.nss not available; script editing continues without engine completions', e);
        this.nwscript_nss = this.nwscript_nss ?? new Uint8Array(0);
        if(!this.nwScriptParser){
          this.nwScriptParser = new NWScriptParser('');
        }
        registerLanguages();
      });
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
        return EditorFile.revive(file as Partial<EditorFile>);
      });
    }else{
      KotOR.ConfigClient.options.recent_files = [];
    }
    return KotOR.ConfigClient.options.recent_files as EditorFile[];
  }

  static addRecentFile(file: EditorFile){
    try{
      let file_path = file.toReferenceURI();
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

  static clearRecentFiles(){
    ForgeState.recentFiles.splice(0, ForgeState.recentFiles.length);
    KotOR.ConfigClient.options.recent_files = ForgeState.recentFiles;
    this.processEventListener('onRecentFilesUpdated', []);
    this.saveState();
  }

  static async clearRecentProjects(){
    ForgeState.recentProjects.splice(0, ForgeState.recentProjects.length);
    KotOR.ConfigClient.options.recent_projects = ForgeState.recentProjects;
    this.processEventListener('onRecentProjectsUpdated', []);
    this.saveState();
  }

  static removeRecentFile(file: EditorFile){
    if(!file) return;
    let file_path = file.toReferenceURI();
    if(file_path){
      const index = ForgeState.recentFiles.findIndex( (f: EditorFile) => {
        return f.toReferenceURI() == file_path;
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
      const asHandle = isProjectDirectoryHandle(projectPathOrHandle)
        ? projectPathOrHandle
        : (isProjectDirectoryHandle(handle) ? handle : undefined);

      if(asHandle){
        project = new RecentProject({
          handle: asHandle,
          name: asHandle.name,
          virtual: ProjectFileSystem.isVirtual,
        });
      } else if(typeof projectPathOrHandle === 'string' && projectPathOrHandle){
        if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
          const normalizedPath = projectPathOrHandle.replace(/\\/g, '/');
          project = new RecentProject({ path: normalizedPath });
        } else {
          project = new RecentProject({
            name: projectPathOrHandle,
            virtual: ProjectFileSystem.isVirtual,
          });
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

      const { set } = await import('idb-keyval');
      KotOR.ConfigClient.options.recent_projects = ForgeState.recentProjects.map((proj: RecentProject) => {
        const serialized: any = {
          path: proj.path,
          name: proj.name,
          virtual: !!proj.virtual,
        };
        if(isPersistableDirectoryHandle(proj.handle)){
          const handleKey = `project_handle_${proj.getIdentifier()}`;
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
          name: proj.name,
          virtual: !!proj.virtual,
        };
        if(isPersistableDirectoryHandle(proj.handle)){
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

  static async saveAllEditorTabs(): Promise<void> {
    const tabs = [...(ForgeState.tabManager?.tabs || [])];
    for(let i = 0; i < tabs.length; i++){
      const tab = tabs[i];
      if(!tab?.file){
        continue;
      }
      try{
        await tab.save();
      }catch(e){
        console.error('ForgeState.saveAllEditorTabs', e);
      }
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
        if(Array.isArray(response.paths) && response.paths[0]){
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
                path: EditorFile.diskPathToFileURI(file_path) || file_path.replace(/\\/g, '/'),
                path2: EditorFile.diskPathToFileURI(file_path2) || String(file_path2).replace(/\\/g, '/'),
                filename: parsed.base, 
                resref: parsed.name, 
                ext: parsed.ext
              });
            });
          }else{
            FileTypeManager.onOpenFile({
              path: EditorFile.diskPathToFileURI(file_path) || file_path.replace(/\\/g, '/'),
              filename: parsed.base, 
              resref: parsed.name, 
              ext: parsed.ext
            });
          }
        }
      }else{
        if(Array.isArray(response.handles) && response.handles[0]){
          const [handle] = response.handles as FileSystemFileHandle[];
          const parsed = pathParse(handle.name);

          if(parsed.ext == 'mdl'){

            const originalTitle = document.title;
            document.title = `Open MDX File (${parsed.name}.mdx)`;

            const mdxResponse = await ForgeFileSystem.OpenFile({
              ext: ['.mdx'],
            });
            const [mdxHandle] = mdxResponse.handles as FileSystemFileHandle[];
            if(!mdxHandle){
              return;
            }

            document.title = originalTitle;

            FileTypeManager.onOpenFile({
              path: EditorFile.referenceURIForSystemVirtualName(handle.name),
              path2: EditorFile.referenceURIForSystemVirtualName(mdxHandle.name),
              handle: handle, 
              handle2: mdxHandle, 
              filename: handle.name, 
              resref: parsed.name, 
              ext: parsed.ext
            });


          }else{
            FileTypeManager.onOpenFile({
              path: EditorFile.referenceURIForSystemVirtualName(handle.name),
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
    try{
      const states: TabStoreState[] = ForgeState.tabManager.tabs.map( (state) => {
        const f = state.file as EditorFile;
        const ref = f?.toReferenceURI?.();
        const filePlain = ref && f
          ? Object.assign({}, f as object, { path: ref } as Partial<EditorFile>)
          : f;
        return {
          type: state.type,
          file: filePlain as EditorFile,
        };
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
  const session = getSessionSettings();
  if (session.confirmCloseUnsaved) {
    const dirty = ForgeState.tabManager.tabs.some((tab) => tab.isClosable && tab.file?.unsaved_changes);
    if (dirty) {
      event.preventDefault();
      event.returnValue = "";
    }
  }
});
