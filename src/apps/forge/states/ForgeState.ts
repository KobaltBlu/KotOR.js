import { DEFAULT_EXTRACT_OPTIONS, type ExtractOptions } from "@/apps/forge/data/ExtractOptions";
import { RECENT_PROJECTS_MAX } from "@/apps/forge/data/ForgeConstants";
import { EditorFile } from "@/apps/forge/EditorFile";
import { EditorFileProtocol } from "@/apps/forge/enum/EditorFileProtocol";
import { FileTypeManager } from "@/apps/forge/FileTypeManager";
import { ForgeFileSystem, ForgeFileSystemResponse } from "@/apps/forge/ForgeFileSystem";
import type { IForgeHostAdapter } from "@/apps/forge/ForgeHostAdapter";
import { pathParse } from "@/apps/forge/helpers/PathParse";
import { TabStoreState } from "@/apps/forge/interfaces/TabStoreState";
import * as KotOR from '@/apps/forge/KotOR';
import { EditorTabManager } from "@/apps/forge/managers/EditorTabManager";
import { Project } from "@/apps/forge/Project";
import { ProjectFileSystem } from "@/apps/forge/ProjectFileSystem";
import { RecentProject } from "@/apps/forge/RecentProject";
import { LYTLanguageService } from "@/apps/forge/states/LYTLanguageService";
import { MenuTopState } from "@/apps/forge/states/MenuTopState";
import { ModalManagerState } from "@/apps/forge/states/modal/ModalManagerState";
import { NWScriptLanguageService } from "@/apps/forge/states/NWScriptLanguageService";
import { TabProjectExplorerState } from "@/apps/forge/states/tabs/TabProjectExplorerState";
import { TabQuickStartState } from "@/apps/forge/states/tabs/TabQuickStartState";
import { TabResourceExplorerState } from "@/apps/forge/states/tabs/TabResourceExplorerState";
import { NWScriptParser } from "@/nwscript/compiler/NWScriptParser";
import { createScopedLogger, LogScope } from "@/utility/Logger";





const log = createScopedLogger(LogScope.Forge);

/** Static event listener callback type for ForgeState. */
type ForgeStateListener = (...args: unknown[]) => void;

export class ForgeState {
  private constructor() {}
  /** Prevents treating this class as extraneous (static-only); do not use. */
  private readonly _instanceMarker?: undefined;

  // static MenuTop: MenuTop = new MenuTop()
  static project: Project
  // static loader: LoadingScreen = new KotOR.LoadingScreen();

  /** Optional host adapter (e.g. VS Code webview). When set, tabManager/modalManager/addRecentFile/save delegate to it. */
  static _hostAdapter: IForgeHostAdapter | null = null;

  // ---------------------------------------------------------------------------
  // Lazy-initialised singletons.
  //
  // These MUST be lazy (getter + backing field) instead of eager field
  // initialisers because their constructors transitively reference
  // `EditorFile` (via `instanceof` checks in `TabState`).  There are
  // multiple circular-import chains
  //   EditorFile → Project → ForgeState → EditorFile
  //   EditorFile → ProjectFileSystem → ForgeState → EditorFile
  // that cause ForgeState's class body to be evaluated while EditorFile
  // is still in the Temporal Dead Zone.  Deferring construction until
  // first access guarantees all modules have finished evaluating.
  // ---------------------------------------------------------------------------
  private static __defaultModalManager: ModalManagerState | null = null;
  private static __defaultTabManager: EditorTabManager | null = null;
  private static __explorerTabManager: EditorTabManager | null = null;
  private static __projectExplorerTab: TabProjectExplorerState | null = null;
  private static __resourceExplorerTab: TabResourceExplorerState | null = null;

  static get _defaultModalManager(): ModalManagerState {
    if (!ForgeState.__defaultModalManager) {
      log.trace('ForgeState._defaultModalManager lazy init');
      ForgeState.__defaultModalManager = new ModalManagerState();
    }
    return ForgeState.__defaultModalManager;
  }
  static get _defaultTabManager(): EditorTabManager {
    if (!ForgeState.__defaultTabManager) {
      log.trace('ForgeState._defaultTabManager lazy init');
      ForgeState.__defaultTabManager = new EditorTabManager();
    }
    return ForgeState.__defaultTabManager;
  }

  static get modalManager(): ModalManagerState {
    const out = ForgeState._hostAdapter ? ForgeState._hostAdapter.getModalManager() : ForgeState._defaultModalManager;
    log.trace('ForgeState.modalManager get', !!ForgeState._hostAdapter);
    return out;
  }
  static get tabManager(): EditorTabManager {
    const out = ForgeState._hostAdapter ? ForgeState._hostAdapter.getTabManager() : ForgeState._defaultTabManager;
    log.trace('ForgeState.tabManager get', !!ForgeState._hostAdapter);
    return out;
  }

  static setHostAdapter(adapter: IForgeHostAdapter | null): void {
    log.trace('ForgeState.setHostAdapter()', !!adapter);
    ForgeState._hostAdapter = adapter;
  }
  static getHostAdapter(): IForgeHostAdapter | null {
    return ForgeState._hostAdapter;
  }

  static get explorerTabManager(): EditorTabManager {
    if (!ForgeState.__explorerTabManager) {
      log.trace('ForgeState.explorerTabManager lazy init');
      ForgeState.__explorerTabManager = new EditorTabManager();
    }
    return ForgeState.__explorerTabManager;
  }
  static set explorerTabManager(value: EditorTabManager) {
    log.trace('ForgeState.explorerTabManager set');
    ForgeState.__explorerTabManager = value;
  }
  static get projectExplorerTab(): TabProjectExplorerState {
    if (!ForgeState.__projectExplorerTab) {
      log.trace('ForgeState.projectExplorerTab lazy init');
      ForgeState.__projectExplorerTab = new TabProjectExplorerState();
    }
    return ForgeState.__projectExplorerTab;
  }
  static set projectExplorerTab(value: TabProjectExplorerState) {
    log.trace('ForgeState.projectExplorerTab set');
    ForgeState.__projectExplorerTab = value;
  }
  static get resourceExplorerTab(): TabResourceExplorerState {
    if (!ForgeState.__resourceExplorerTab) {
      log.trace('ForgeState.resourceExplorerTab lazy init');
      ForgeState.__resourceExplorerTab = new TabResourceExplorerState();
    }
    return ForgeState.__resourceExplorerTab;
  }
  static set resourceExplorerTab(value: TabResourceExplorerState) {
    log.trace('ForgeState.resourceExplorerTab set');
    ForgeState.__resourceExplorerTab = value;
  }

  /** Current extract options (TPC/MDL decompile, etc.). Updated by Help → Extract Options. */
  static extractOptions: ExtractOptions = { ...DEFAULT_EXTRACT_OPTIONS };

  /** Current theme/appearance (loaded from ConfigClient, applied to app container) */
  static theme: string = 'dark';

  static recentFiles: EditorFile[] = [];
  static recentProjects: RecentProject[] = [];

  static #eventListeners: Record<string, ForgeStateListener[]> = {};

  static nwscript_nss: Uint8Array;
  static nwScriptParser: NWScriptParser;

  static addEventListener<T extends string>(type: T, cb: ForgeStateListener): void {
    log.trace('ForgeState.addEventListener()', type);
    const key = type as string;
    if(!Array.isArray(this.#eventListeners[key])){
      this.#eventListeners[key] = [] as ForgeStateListener[];
    }
    const ev: ForgeStateListener[] = this.#eventListeners[key];
    const index = ev.indexOf(cb);
    if(index === -1){
      ev.push(cb);
      log.debug('ForgeState.addEventListener() added', type, ev.length);
    }else{
      log.warn('Event Listener: Already added', type);
    }
  }

  static removeEventListener<T extends string>(type: T, cb: ForgeStateListener): void {
    log.trace('ForgeState.removeEventListener()', type);
    const key = type as string;
    if(Array.isArray(this.#eventListeners[key])){
      const ev: ForgeStateListener[] = this.#eventListeners[key];
      const index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
        log.debug('ForgeState.removeEventListener() removed', type);
      }else{
        log.warn('Event Listener: Already removed', type);
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  static processEventListener<T extends string>(type: T, args: unknown[] = []): void {
    const key = type as string;
    log.trace('ForgeState.processEventListener()', key);
    if(Array.isArray(this.#eventListeners[key])){
      const ev: ForgeStateListener[] = this.#eventListeners[key];
      log.trace('ForgeState.processEventListener() listeners', ev.length);
      for(let i = 0; i < ev.length; i++){
        const callback = ev[i];
        if(typeof callback === 'function'){
          callback(...args);
        }
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  static triggerEventListener<T>(type: T, args: unknown[] = []): void {
    this.processEventListener(type, args);
  }

  /**
   * Initializes the loading screen
   */
  static loaderInit(backgroundURL: string, logoURL: string): void {
    log.trace('ForgeState.loaderInit()');
    ForgeState.processEventListener('on-loader-init', [backgroundURL, logoURL]);
  }

  /**
   * Shows the loading screen
   */
  static loaderShow(): void {
    log.trace('ForgeState.loaderShow()');
    ForgeState.processEventListener('on-loader-show', []);
  }

  /**
   * Hides the loading screen
   */
  static loaderHide(): void {
    log.trace('ForgeState.loaderHide()');
    ForgeState.processEventListener('on-loader-hide', []);
  }

  /**
   * Sets the loading screen message
   */
  static loaderMessage(message: string): void {
    log.trace('ForgeState.loaderMessage()', message);
    ForgeState.processEventListener('on-loader-message', [message]);
  }

  static async InitializeApp(): Promise<void>{
    log.trace('ForgeState.InitializeApp() entry');
    return new Promise( (resolve, _reject) => {
      ForgeState.theme = KotOR.ConfigClient.get('Appearance.Theme', 'dark') as string;
      log.trace('ForgeState.InitializeApp() theme', ForgeState.theme);
      ForgeState.applyTheme(ForgeState.theme);

      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        KotOR.ApplicationProfile.directory = KotOR.ApplicationProfile.profile.directory;
        log.trace('ForgeState.InitializeApp() ELECTRON directory');
      }else{
        KotOR.ApplicationProfile.directoryHandle = KotOR.ApplicationProfile.profile.directory_handle;
        log.trace('ForgeState.InitializeApp() BROWSER directoryHandle');
      }
      log.debug('loading game...');
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
                const handle = await get(handleKey) as unknown;
                if(handle instanceof FileSystemDirectoryHandle){
                  proj.handle = handle;
                }
              } catch(e) {
                log.warn('Failed to restore handle for project:', proj.getDisplayName(), e);
              }
            }
          }
        }

        this.processEventListener('onRecentProjectsUpdated', []);
        this.processEventListener('onRecentFilesUpdated', []);

        const tabStates = KotOR.ConfigClient.get('open_tabs', []) as TabStoreState[];
        log.trace('ForgeState.InitializeApp() open_tabs count', Array.isArray(tabStates) ? tabStates.length : 0);
        if(Array.isArray(tabStates) && tabStates.length > 0){
          for(let i = 0; i < tabStates.length; i++){
            const tabState = tabStates[i];
            log.trace('ForgeState.InitializeApp() restoreTabState', i);
            this.tabManager.restoreTabState(tabState);
          }
        }else{
          log.trace('ForgeState.InitializeApp() add TabQuickStartState');
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

        TabResourceExplorerState.GenerateResourceList( ForgeState.resourceExplorerTab ).then( (_resourceList) => {
          log.trace('ForgeState.InitializeApp() resource list done');
          ForgeState.loaderHide();
          resolve();
        });
      });
    });
    log.trace('ForgeState.InitializeApp() promise returned');
  }

  static async VerifyGameDirectory(onVerified: () => void, onError: (err?: unknown) => void){
    log.trace('ForgeState.VerifyGameDirectory() entry');
    if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
      // let validated = await KotOR.GameFileSystem.validateDirectory(KotOR.ApplicationProfile.rootDirectory);
      if(await KotOR.GameFileSystem.exists('chitin.key')){
        log.trace('ForgeState.VerifyGameDirectory() chitin.key exists');
        onVerified();
      }else{
        log.trace('ForgeState.VerifyGameDirectory() chitin.key missing, locate dialog');
        try{
          const dir = await (window as Window & { dialog: { locateDirectoryDialog: () => Promise<string | null> } }).dialog.locateDirectoryDialog();
          if(dir){
            KotOR.ApplicationProfile.profile.directory = dir;
            log.debug('ForgeState.VerifyGameDirectory() directory set');
            onVerified();
          }else{
            log.error('no directory');
          }
        }catch(e: unknown){
          log.error(String(e), e);
        }
      }
    }else{
      if(KotOR.ApplicationProfile.directoryHandle){
        log.trace('ForgeState.VerifyGameDirectory() validate handle');
        const validated = await KotOR.GameFileSystem.validateDirectoryHandle(KotOR.ApplicationProfile.directoryHandle);
        if(validated){
          onVerified();
        }else{
          log.debug('ForgeState.VerifyGameDirectory() handle invalid');
          onError();
        }
      }else{
        log.trace('ForgeState.VerifyGameDirectory() no handle');
        onError();
      }
    }
    log.trace('ForgeState.VerifyGameDirectory() exit');
  }

  static InitManagers(){
    // ForgeState.tabManager = new EditorTabManager();
    // ForgeState.explorerTabManager = new EditorTabManager();
    // ForgeState.projectExplorerTab = new ProjectExplorerTab();
    // ForgeState.resourceExplorerTab = new ResourceExplorerTab();
  }

  static initNWScriptParser(){
    return new Promise<void>( (resolve, _reject) => {
      KotOR.ResourceLoader.loadResource( KotOR.ResourceTypes.nss, 'nwscript').then(
        (nss: Uint8Array) => {
          this.nwscript_nss = nss;
          const textDecoder = new TextDecoder();
          this.nwScriptParser = new NWScriptParser(textDecoder.decode(this.nwscript_nss));
          NWScriptLanguageService.initNWScriptLanguage();
          LYTLanguageService.initLYTLanguage();
          resolve();
        }
      ).catch( (e) => { log.error(String(e), e); });
    });
  }

  static getRecentProjects(): RecentProject[] {
    log.trace('ForgeState.getRecentProjects() entry');
    if(Array.isArray(KotOR.ConfigClient.options.recent_projects)){
      KotOR.ConfigClient.options.recent_projects = KotOR.ConfigClient.options.recent_projects
        .filter((proj: Record<string, unknown> & { path?: string; handle?: FileSystemDirectoryHandle; name?: string }) => proj && (proj.path || proj.handle || proj.name))
        .map((proj: Record<string, unknown> & { path?: string; handle?: FileSystemDirectoryHandle; name?: string }) => RecentProject.From(proj))
        .slice(0, 10);
      log.debug('ForgeState.getRecentProjects() count', KotOR.ConfigClient.options.recent_projects.length);
    }else{
      KotOR.ConfigClient.options.recent_projects = [];
      log.trace('ForgeState.getRecentProjects() init empty');
    }
    return KotOR.ConfigClient.options.recent_projects as RecentProject[];
  }

  static getRecentFiles(): EditorFile[] {
    log.trace('ForgeState.getRecentFiles() entry');
    if(Array.isArray(KotOR.ConfigClient.options.recent_files)){
      KotOR.ConfigClient.options.recent_files = KotOR.ConfigClient.options.recent_files.map( (file: Partial<EditorFile> & Record<string, unknown>) => {
        return Object.assign(new EditorFile(), file);
      });
      log.debug('ForgeState.getRecentFiles() count', KotOR.ConfigClient.options.recent_files.length);
    }else{
      KotOR.ConfigClient.options.recent_files = [];
      log.trace('ForgeState.getRecentFiles() init empty');
    }
    return KotOR.ConfigClient.options.recent_files as EditorFile[];
  }

  static addRecentFile(file: EditorFile){
    log.trace('ForgeState.addRecentFile()');
    try{
      if (ForgeState._hostAdapter?.addRecentFile) {
        log.trace('ForgeState.addRecentFile() delegate to host');
        ForgeState._hostAdapter.addRecentFile(file);
        return;
      }
      const file_path = file.getPath();
      log.trace('ForgeState.addRecentFile() path', file_path ?? '(empty)');
      if(file_path){
        this.removeRecentFile(file);

        ForgeState.recentFiles.unshift(file);
        const maxRecentFiles = 20;
        if (ForgeState.recentFiles.length > maxRecentFiles) {
          ForgeState.recentFiles = ForgeState.recentFiles.slice(0, maxRecentFiles);
          log.trace('ForgeState.addRecentFile() trimmed to', maxRecentFiles);
        }

        this.saveState();

        if(ForgeState.project instanceof Project){
          ForgeState.project.addToOpenFileList(file);
        }
        this.processEventListener('onRecentFilesUpdated', [file]);
        log.debug('ForgeState.addRecentFile() done', ForgeState.recentFiles.length);
      }
    }catch(e){
      log.error(String(e), e);
    }
  }

  static removeRecentFile(file: EditorFile){
    log.trace('ForgeState.removeRecentFile() entry');
    if(!file) {
      log.trace('ForgeState.removeRecentFile() no file, return');
      return;
    }
    const file_path = file.getPath();
    log.debug('ForgeState.removeRecentFile() path', file_path ?? '(empty)');
    if(file_path){
      const index = ForgeState.recentFiles.findIndex( (f: EditorFile) => f.getPath() === file_path);
      log.trace('ForgeState.removeRecentFile() index', index);
      if (index >= 0) {
        ForgeState.recentFiles.splice(index, 1);
        log.debug('ForgeState.removeRecentFile() removed', index);
      }
    }
    this.processEventListener('onRecentFilesUpdated', [file]);
    this.saveState();
    log.trace('ForgeState.removeRecentFile() exit');
  }

  static async addRecentProject(projectPathOrHandle: string | FileSystemDirectoryHandle, handle?: FileSystemDirectoryHandle){
    log.trace('ForgeState.addRecentProject()');
    try{
      let project: RecentProject | null = null;

      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(typeof projectPathOrHandle === 'string' && projectPathOrHandle){
          const normalizedPath = projectPathOrHandle.replace(/\\/g, '/');
          project = new RecentProject({ path: normalizedPath });
          log.trace('ForgeState.addRecentProject() ELECTRON path', normalizedPath);
        }
      } else {
        if(projectPathOrHandle instanceof FileSystemDirectoryHandle){
          project = new RecentProject({
            handle: projectPathOrHandle,
            name: projectPathOrHandle.name
          });
          log.trace('ForgeState.addRecentProject() BROWSER handle', projectPathOrHandle.name);
        } else if(handle instanceof FileSystemDirectoryHandle){
          project = new RecentProject({
            handle: handle,
            name: typeof projectPathOrHandle === 'string' ? projectPathOrHandle : handle.name
          });
          log.trace('ForgeState.addRecentProject() BROWSER handle (alt)');
        } else if(typeof projectPathOrHandle === 'string'){
          project = new RecentProject({ name: projectPathOrHandle });
          log.trace('ForgeState.addRecentProject() BROWSER name only');
        }
      }

      if(!project) {
        log.trace('ForgeState.addRecentProject() no project, return');
        return;
      }

      await this.removeRecentProject(project);

      ForgeState.recentProjects.unshift(project);

      if (ForgeState.recentProjects.length > RECENT_PROJECTS_MAX) {
        ForgeState.recentProjects = ForgeState.recentProjects.slice(0, RECENT_PROJECTS_MAX);
        log.trace('ForgeState.addRecentProject() trimmed to', RECENT_PROJECTS_MAX);
      }

      const { set } = await import('idb-keyval');
      KotOR.ConfigClient.options.recent_projects = ForgeState.recentProjects.map((proj: RecentProject) => {
        const serialized: { path?: string; name?: string; handleKey?: string } = {
          path: proj.path,
          name: proj.name
        };
        // Store handle separately in IndexedDB if available
        if(proj.handle){
          const handleKey = `project_handle_${proj.getIdentifier()}`;
          // Store handle in IndexedDB (idb-keyval handles FileSystemDirectoryHandle)
          set(handleKey, proj.handle).catch((e) => {
            log.warn('Failed to store handle in IndexedDB:', e);
          });
          serialized.handleKey = handleKey;
        }
        return serialized;
      });

      this.saveState();
      this.processEventListener('onRecentProjectsUpdated', [project]);
      log.debug('ForgeState.addRecentProject() done', ForgeState.recentProjects.length);
    }catch(e){
      log.error('Error adding recent project:', e);
    }
  }

  static async removeRecentProject(projectOrIdentifier: RecentProject | string){
    log.trace('ForgeState.removeRecentProject() entry');
    if(!projectOrIdentifier) {
      log.trace('ForgeState.removeRecentProject() no arg, return');
      return;
    }

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

    log.debug('ForgeState.removeRecentProject() index', index);
    if(index >= 0){
      const removed = ForgeState.recentProjects[index];
      log.trace('ForgeState.removeRecentProject() removing', index);
      if(removed.handle){
        const handleKey = `project_handle_${removed.getIdentifier()}`;
        const { del } = await import('idb-keyval');
        del(handleKey).catch((e) => {
          log.warn('Failed to delete handle from IndexedDB:', e);
        });
      }
      ForgeState.recentProjects.splice(index, 1);
      const { set } = await import('idb-keyval');
      KotOR.ConfigClient.options.recent_projects = ForgeState.recentProjects.map((proj: RecentProject) => {
        const serialized: { path?: string; name?: string; handleKey?: string } = {
          path: proj.path,
          name: proj.name
        };
        if(proj.handle){
          const handleKey = `project_handle_${proj.getIdentifier()}`;
          set(handleKey, proj.handle).catch((e) => {
            log.warn('Failed to store handle in IndexedDB:', e);
          });
          serialized.handleKey = handleKey;
        }
        return serialized;
      });
      this.saveState();
      this.processEventListener('onRecentProjectsUpdated', []);
      log.trace('ForgeState.removeRecentProject() done');
    }
    log.trace('ForgeState.removeRecentProject() exit');
  }

  /** Clear all recent projects from the list. */
  static async clearRecentProjects(): Promise<void> {
    log.trace('ForgeState.clearRecentProjects() entry');
    for (const proj of [...ForgeState.recentProjects]) {
      if (proj.handle) {
        const handleKey = `project_handle_${proj.getIdentifier()}`;
        const { del } = await import('idb-keyval');
        del(handleKey).catch((e) => log.warn('Failed to delete handle from IndexedDB:', e));
      }
    }
    ForgeState.recentProjects = [];
    KotOR.ConfigClient.options.recent_projects = [];
    this.saveState();
    this.processEventListener('onRecentProjectsUpdated', []);
    log.trace('ForgeState.clearRecentProjects() exit');
  }

  static saveState(){
    log.trace('ForgeState.saveState()');
    try{
      KotOR.ConfigClient.save(null as unknown, true);
    }catch(e){
      log.error(String(e), e);
    }
  }

  /**
   * Switch the active game profile (e.g. KOTOR vs TSL). Reloads the app with the new profile.
   * If any open tab has unsaved changes, prompts the user to confirm before switching.
   */
  static switchGame(profile: { key?: string } = {}){
    log.trace('ForgeState.switchGame()', profile?.key);
    if (!profile?.key) return;
    const currentKey = KotOR.ApplicationProfile.profile?.key;
    if (profile.key === currentKey) {
      log.trace('ForgeState.switchGame() same key, return');
      return;
    }

    const tabs = ForgeState.tabManager?.tabs ?? [];
    const hasUnsaved = tabs.some((t: { file?: EditorFile }) => t.file?.unsaved_changes);
    if (hasUnsaved) {
      const proceed = window.confirm(
        "You have tabs with unsaved changes. Switch game anyway? Changes will be lost."
      );
      if (!proceed) return;
    }

    try {
      KotOR.ConfigClient.save(null as unknown, true);
      log.trace('ForgeState.switchGame() config saved');
    } catch (e) {
      log.error(String(e), e);
    }
    log.info('ForgeState.switchGame() reloading', profile.key);
    window.location.search = `?key=${profile.key}`;
    window.location.reload();
  }

  static openFile(){
    log.trace('ForgeState.openFile()');
    ForgeFileSystem.OpenFile().then( async (response: ForgeFileSystemResponse) => {
      if(KotOR.ApplicationProfile.ENV == KotOR.ApplicationEnvironment.ELECTRON){
        if(Array.isArray(response.paths)){
          const file_path = response.paths[0];
          const parsed = pathParse(file_path);
          if(parsed.ext == 'mdl'){
            (window as Window & { dialog: { showOpenDialog: (opts: unknown) => Promise<{ filePaths: string[] }> } }).dialog.showOpenDialog({
              title: `Open MDX File (${parsed.name}.mdx)`,
              filters: [
                {name: 'Model File', extensions: ['mdx']},
                {name: 'All Formats', extensions: ['*']},
              ],
              properties: ['createDirectory'],
            }).then( (result: { filePaths: string[] }) => {
              const file_path2 = result.filePaths[0];
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
    log.trace('ForgeState.saveOpenTabsState()');
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
      log.error(String(e), e);
    }
  }

  /**
   * Apply theme to the app container.
   * Themes: 'dark' (default), 'light', 'auto' (system preference)
   */
  static applyTheme(theme: string) {
    log.trace('ForgeState.applyTheme()', theme);
    ForgeState.theme = theme;

    let effectiveTheme = theme;
    if(theme === 'auto'){
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
      log.debug('ForgeState.applyTheme() auto effective', effectiveTheme);
    }

    const appContainer = document.getElementById('app');
    if(appContainer){
      appContainer.setAttribute('data-theme', effectiveTheme);
      log.trace('ForgeState.applyTheme() app container set');
    }
    document.body.setAttribute('data-theme', effectiveTheme);
    ForgeState.processEventListener('onThemeChange', [effectiveTheme]);
    log.trace('ForgeState.applyTheme() done');
  }

}
(window as Window & { ForgeState?: typeof ForgeState; ProjectFileSystem?: typeof ProjectFileSystem }).ForgeState = ForgeState;
(window as Window & { ForgeState?: typeof ForgeState; ProjectFileSystem?: typeof ProjectFileSystem }).ProjectFileSystem = ProjectFileSystem;

window.addEventListener('beforeunload', (_event) => {
  log.debug('Saving Editor Config');
  ForgeState.saveOpenTabsState();
});
