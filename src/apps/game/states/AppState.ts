import * as KotOR from "@/apps/game/KotOR";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Game);

/** Profile shape from ConfigClient.get - used by game app. */
export interface GameAppProfile {
  key?: string;
  full_name?: string;
  directory?: string;
  directory_handle?: FileSystemDirectoryHandle;
  background?: string;
  logo?: string;
  launch?: { args?: { gameChoice?: number } };
}

/** EULA config stored in localStorage. */
interface EULAConfig {
  key: KotOR.GameEngineType;
  version: string | null;
  date: string | null;
  accepted: boolean;
}

export class AppState {
  static eulaAccepted: boolean = false;
  static directoryLocated: boolean = false;
  static gameKey: KotOR.GameEngineType = KotOR.GameEngineType.KOTOR;
  static appProfile: GameAppProfile | undefined;
  static env: ApplicationEnvironment;
  static statsMode: number|undefined = undefined;

  /** Default profiles when game is opened directly (e.g. launch config) and launcher never ran. */
  private static getDefaultProfileForKey(key: string | null): GameAppProfile | undefined {
    if (!key) return undefined;
    const defaults: Record<string, GameAppProfile> = {
      kotor: {
        key: 'kotor',
        full_name: 'Star Wars: Knights of the Old Republic',
        launch: { args: { gameChoice: 1 } },
      },
      tsl: {
        key: 'tsl',
        full_name: 'Star Wars Knights of the Old Republic II: The Sith Lords',
        launch: { args: { gameChoice: 2 } },
      },
    };
    return defaults[key] ?? undefined;
  }

  /**
   * getProfile
   * - Loads from ConfigClient. If missing (e.g. game opened directly), uses default for kotor/tsl and persists it.
   */
  static async getProfile(): Promise<GameAppProfile | undefined> {
    const query = new URLSearchParams(window.location.search);
    const key = query.get('key');
    await KotOR.ConfigClient.Init();
    let profile = KotOR.ConfigClient.get(`Profiles.${key}`) as GameAppProfile | undefined;
    if (profile == null && key) {
      const fallback = AppState.getDefaultProfileForKey(key);
      if (fallback) {
        log.debug('No profile in config for key=%s; using default and persisting', key);
        profile = { ...fallback };
        KotOR.ConfigClient.set(`Profiles.${key}`, profile as unknown as KotOR.ConfigValue);
      }
    }
    // Ensure profile has .key when URL has key (e.g. stale config entry without key)
    if (profile && !profile.key && key) {
      profile = { ...profile, key };
      KotOR.ConfigClient.set(`Profiles.${key}`, profile as unknown as KotOR.ConfigValue);
    }
    return profile;
  }

  /**
   * initApp
   */
  static async initApp(){
    if(window.location.origin === 'file://'){
      AppState.env = ApplicationEnvironment.ELECTRON;
    }else{
      AppState.env = ApplicationEnvironment.BROWSER;
    }

    AppState.appProfile = (await AppState.getProfile()) as GameAppProfile | undefined;
    // If URL has ?key= but profile missing/key missing, ensure we have a usable profile (e.g. direct open)
    const urlKey = new URLSearchParams(window.location.search).get('key');
    if (!AppState.appProfile?.key && urlKey) {
      const fallback = AppState.getDefaultProfileForKey(urlKey);
      if (fallback) {
        log.debug('Ensuring appProfile from URL key=%s', urlKey);
        AppState.appProfile = { ...fallback };
        KotOR.ConfigClient.set(`Profiles.${urlKey}`, AppState.appProfile as unknown as KotOR.ConfigValue);
      }
    }
    KotOR.ApplicationProfile.InitEnvironment(AppState.appProfile as Record<string, unknown>);

    document.title = `${AppState.appProfile?.full_name ? AppState.appProfile?.full_name : 'N/A' }`;

    switch(AppState.appProfile?.launch?.args?.gameChoice){
      case 2:
        AppState.gameKey = KotOR.GameEngineType.TSL;
      break;
      default:
        AppState.gameKey = KotOR.GameEngineType.KOTOR;
      break;
    }

    const raw = window.localStorage.getItem('acceptEULA');
    const eulaState: Record<string, EULAConfig> = Object.assign({}, raw ? (JSON.parse(raw) as Record<string, EULAConfig>) : {});
    const gameEULAConfig = Object.assign({
      key: AppState.gameKey,
      version: null,
      date: null,
      accepted: false
    }, eulaState[AppState.gameKey]);
    eulaState[AppState.gameKey] = gameEULAConfig;
    AppState.eulaAccepted = !!gameEULAConfig.accepted;
    window.localStorage.setItem('acceptEULA', JSON.stringify(eulaState));

    AppState.loaderShow();

    log.debug('gameEULAConfig', gameEULAConfig);
    log.debug('eulaState', eulaState);
    AppState.directoryLocated = await AppState.checkGameDirectory();
    if(AppState.eulaAccepted){
      await AppState.loadGameDirectory();
    }
    AppState.processEventListener('on-ready', [AppState.eulaAccepted]);
  }

  /**
   * acceptEULA
   */
  static async acceptEULA(){
    AppState.eulaAccepted = true;
    await AppState.loadGameDirectory();
    AppState.processEventListener('on-preload', []);
  }

  /**
   * loadGameDirectory
   * - Used for Electron and Browser
   */
  static async loadGameDirectory(){
    AppState.loaderShow();
    KotOR.GameInitializer.SetLoadingMessage('Locating Game Directory...');

    if(AppState.env == ApplicationEnvironment.ELECTRON){
      if(await KotOR.GameFileSystem.exists('chitin.key')){
        AppState.directoryLocated = true;
        AppState.processEventListener('on-preload', []);
        AppState.beginGame();
        return;
      }
      alert('Unable to locate chitin.key in the selected directory. Please try again.');
    }else{
      if(KotOR.ApplicationProfile.directoryHandle){
        const validated = await AppState.validateDirectoryHandle(KotOR.ApplicationProfile.directoryHandle);
        if(validated && await KotOR.GameFileSystem.exists('chitin.key')){
          AppState.directoryLocated = true;
          AppState.processEventListener('on-preload', []);
          AppState.beginGame();
          return;
        }
        alert('Unable to locate chitin.key in the selected directory. Please try again.');
      }
    }
    AppState.directoryLocated = false;
    AppState.processEventListener('on-preload', []);
  }

  /**
   * checkGameDirectory
   * - Used for Electron and Browser
   */
  static async checkGameDirectory(){
    if(AppState.env == ApplicationEnvironment.ELECTRON){
      if(await KotOR.GameFileSystem.exists('chitin.key')){
        return true;
      }
    }else{
      if(KotOR.ApplicationProfile.directoryHandle){
        const validated = await AppState.validateDirectoryHandle(KotOR.ApplicationProfile.directoryHandle);
        if(validated && await KotOR.GameFileSystem.exists('chitin.key')){
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Initializes the loading screen
   */
  static loaderInit(backgroundURL: string, logoURL: string): void {
    AppState.processEventListener('on-loader-init', [backgroundURL, logoURL]);
  }

  /**
   * Shows the loading screen
   */
  static loaderShow(){
    AppState.processEventListener('on-loader-show', []);
  }

  /**
   * Hides the loading screen
   */
  static loaderHide(){
    AppState.processEventListener('on-loader-hide', []);
  }

  /**
   * Sets the loading screen message
   */
  static loaderMessage(message: string): void {
    AppState.processEventListener('on-loader-message', [message]);
  }

  /**
   * beginGame
   */
  static async beginGame(){
    KotOR.ApplicationProfile.ENV = AppState.env;
    if(AppState.env == ApplicationEnvironment.ELECTRON){
      KotOR.ApplicationProfile.directory = AppState.appProfile.directory;
    }else{
      KotOR.ApplicationProfile.directoryHandle = AppState.appProfile.directory_handle;
    }
    log.info('loading game...');
    AppState.loaderInit(AppState.appProfile?.background ?? '', AppState.appProfile?.logo ?? '');
    AppState.loaderShow();
    KotOR.GameState.GameKey = AppState.gameKey;
    KotOR.TextureLoader.GameKey = KotOR.GameState.GameKey;
    KotOR.GameInitializer.AddEventListener('on-loader-message', (message: string) => {
      AppState.loaderMessage(message);
    });
    KotOR.GameInitializer.AddEventListener('on-loader-show', () => {
      AppState.loaderShow();
    });
    KotOR.GameInitializer.AddEventListener('on-loader-hide', () => {
      AppState.loaderHide();
    });

    await KotOR.GameInitializer.Init(AppState.gameKey);

    console.log('loaded')
    KotOR.GUIListBox.InitTextures();
    KotOR.OdysseyWalkMesh.Init();
    KotOR.GameState.setDOMElement(document.getElementById('renderer-container') as HTMLElement);

    window.addEventListener('blur', () => {
      KotOR.AudioEngine.OnWindowFocusChange(false);
    });

    window.addEventListener('focus', () => {
      KotOR.AudioEngine.OnWindowFocusChange(true);
    });

    AppState.processEventListener('on-game-loaded', []);

    AppState.loaderMessage('GameState: Initializing...');
    await KotOR.GameState.Init();
    document.body.append((KotOR.GameState.stats as unknown as { domElement: HTMLElement }).domElement);
    log.info('init complete');
    AppState.loaderHide();
  }

  /**
   * attachDirectoryPath
   * - Used for Electron
   */
  static attachDirectoryPath(path: string): void {
    if (!AppState.appProfile) {
      log.error("attachDirectoryPath: appProfile is missing; cannot persist directory path");
      return;
    }
    KotOR.ConfigClient.set(`Profiles.${AppState.appProfile.key}.directory`, path);
    AppState.appProfile.directory = path;
    AppState.directoryLocated = true;
    AppState.loadGameDirectory();
  }

  /**
   * attachDirectoryHandle
   * - Used for Browser
   */
  static async attachDirectoryHandle(handle: FileSystemDirectoryHandle | undefined | null): Promise<void> {
    if (!handle) {
      log.warn("attachDirectoryHandle called with no handle");
      return;
    }
    const profileKey = AppState.appProfile?.key;
    if (!profileKey) {
      log.error("attachDirectoryHandle: appProfile is missing or has no key; cannot persist directory handle");
      KotOR.ApplicationProfile.directoryHandle = handle;
      AppState.directoryLocated = true;
      AppState.loadGameDirectory();
      return;
    }
    KotOR.ApplicationProfile.directoryHandle = handle;
    KotOR.ConfigClient.set(`Profiles.${profileKey}.directory_handle`, handle as unknown as KotOR.ConfigValue);
    AppState.directoryLocated = true;
    AppState.loadGameDirectory();
  }

  /**
   * validateDirectoryHandle
   * - Used for Browser
   */
  static async validateDirectoryHandle(handle: FileSystemDirectoryHandle){
    try{
      if ((await handle.requestPermission({ mode: 'readwrite' })) === 'granted') {
        return true;
      }
      return false;
    }catch(e){
      log.error('validateDirectoryHandle failed', e);
      return false;
    }
  }

  static consoleCommand(command: string){
    log.debug('consoleCommand', command);
    KotOR.GameState.CheatConsoleManager.processCommand(command);
  }

  static togglePerformanceMonitor(){
    let mode: number|undefined = AppState.statsMode;
    if(mode == undefined){
      mode = 0;
    }else{
      mode++;
    }
    if(mode > 2){
      mode = undefined;
    }
    AppState.statsMode = mode;
    KotOR.GameState.stats.showPanel(mode ?? undefined);
  }

  static toggleDebugger(){
    KotOR.GameState.Debugger.open();
  }

  static reloadLastSave(){
    const gameKey = KotOR.GameState.GameKey;
    const lastSaveId = parseInt(localStorage.getItem(`${gameKey}_last_save_id`) || '-1');
    const saveGame = KotOR.SaveGame.saves[lastSaveId];
    if(!saveGame){ return; }
    saveGame.load();
  }

  /**
   * Event Listeners
   */

  static #eventListeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  static addEventListener<T extends string>(type: T, cb: (...args: unknown[]) => void): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if(index == -1){
        ev.push(cb);
      }else{
        log.warn('Event Listener: Already added', type);
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  static removeEventListener<T extends string>(type: T, cb: (...args: unknown[]) => void): void {
    if(Array.isArray(this.#eventListeners[type])){
      const ev = this.#eventListeners[type];
      const index = ev.indexOf(cb);
      if(index >= 0){
        ev.splice(index, 1);
      }else{
        log.warn('Event Listener: Already removed', type);
      }
    }else{
      log.warn('Event Listener: Unsupported', type);
    }
  }

  static processEventListener<T>(type: T, args: (string | number | boolean | object | null)[] = []): void {
    if(Array.isArray(this.#eventListeners[type as string])){
      const ev = this.#eventListeners[type as string];
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

}
