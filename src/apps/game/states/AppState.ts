import * as KotOR from "../KotOR";
import { ApplicationEnvironment } from "../../../enums/ApplicationEnvironment";

export class AppState {
  static eulaAccepted: boolean = false;
  static directoryLocated: boolean = false;
  static gameKey: KotOR.GameEngineType = KotOR.GameEngineType.KOTOR;
  static appProfile: any;
  static env: ApplicationEnvironment;
  static statsMode: number|undefined = undefined;

  /**
   * getProfile
   */
  static async getProfile(){
    const query = new URLSearchParams(window.location.search);
    await KotOR.ConfigClient.Init();
    return KotOR.ConfigClient.get(`Profiles.${query.get('key')}`);
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

    AppState.appProfile = await AppState.getProfile();
    KotOR.ApplicationProfile.InitEnvironment(AppState.appProfile);

    document.title = `${AppState.appProfile?.full_name ? AppState.appProfile?.full_name : 'N/A' }`;
    
    switch(AppState.appProfile.launch.args.gameChoice){
      case 2:
        AppState.gameKey = KotOR.GameEngineType.TSL;
      break;
      default:
        AppState.gameKey = KotOR.GameEngineType.KOTOR;
      break;
    }

    const eulaState: any = Object.assign({}, JSON.parse(window.localStorage.getItem('acceptEULA') as string));
    const gameEULAConfig = Object.assign({
      key: AppState.gameKey,
      version: null,
      date: null,
      accepted: false
    }, eulaState[AppState.gameKey]);
    eulaState[AppState.gameKey] = gameEULAConfig;
    AppState.eulaAccepted = !!gameEULAConfig.accepted;
    window.localStorage.setItem('acceptEULA', JSON.stringify(eulaState));

    AppState.showLoader();

    console.log('gameEULAConfig', gameEULAConfig);
    console.log('eulaState', eulaState);
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
    AppState.showLoader();
    KotOR.GameInitializer.SetLoadingMessage('Locating Game Directory...');
    // KotOR.LoadingScreen.main.SetMessage('Locating Game Directory...');
  
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
   * showLoader
   */
  static showLoader(){
    // KotOR.LoadingScreen.main.SetLogo(AppState.appProfile.logo);
    // KotOR.LoadingScreen.main.SetBackgroundImage(AppState.appProfile.background);
    // KotOR.LoadingScreen.main.Show();
    AppState.processEventListener('on-loader-init', [AppState.appProfile.background, AppState.appProfile.logo]);
    AppState.processEventListener('on-loader-show', []);
  }

  /**
   * hideLoader
   */
  static hideLoader(){
    // KotOR.LoadingScreen.main.Hide();
    AppState.processEventListener('on-loader-hide', []);
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
    console.log('loading game...');
    AppState.showLoader();
    KotOR.GameState.GameKey = AppState.gameKey;
    KotOR.TextureLoader.GameKey = KotOR.GameState.GameKey;
    KotOR.GameInitializer.AddEventListener('on-loader-message', (message: string) => {
      console.log('on-loader-message', message);
      AppState.processEventListener('on-loader-message', [message]);
    });
    KotOR.GameInitializer.AddEventListener('on-loader-show', () => {
      console.log('on-loader-show');
      AppState.processEventListener('on-loader-show', []);
    });
    KotOR.GameInitializer.AddEventListener('on-loader-hide', () => {
      console.log('on-loader-hide');
      AppState.processEventListener('on-loader-hide', []);
    });
    await KotOR.GameInitializer.Init(AppState.gameKey);

    console.log('loaded')
    KotOR.GameState.OpeningMoviesComplete = true;
    KotOR.GUIListBox.InitTextures();
    KotOR.OdysseyWalkMesh.Init();
    KotOR.GameState.setDOMElement(document.getElementById('renderer-container') as HTMLElement);

    KotOR.AudioEngine.GetAudioEngine().musicGain.gain.value = 0;
    if(AppState.env == ApplicationEnvironment.ELECTRON){
      // KotOR.GameState.Debugger.open();
    }
    window.addEventListener('blur', (e) => {
      KotOR.AudioEngine.GetAudioEngine().musicGain.gain.value = 0;
      KotOR.AudioEngine.GetAudioEngine().voGain.gain.value = 0;
      KotOR.AudioEngine.GetAudioEngine().sfxGain.gain.value = 0;
      KotOR.AudioEngine.GetAudioEngine().movieGain.gain.value = 0;
    });
    window.addEventListener('focus', (e) => {
      KotOR.AudioEngine.GetAudioEngine().musicGain.gain.value = KotOR.AudioEngine.GAIN_MUSIC;
      KotOR.AudioEngine.GetAudioEngine().voGain.gain.value = KotOR.AudioEngine.GAIN_VO;
      KotOR.AudioEngine.GetAudioEngine().sfxGain.gain.value = KotOR.AudioEngine.GAIN_SFX;
      KotOR.AudioEngine.GetAudioEngine().movieGain.gain.value = KotOR.AudioEngine.GAIN_MOVIE;
    });
    AppState.processEventListener('on-game-loaded', []);
    
    await KotOR.GameState.Init();
    document.body.append(KotOR.GameState.stats.domElement);
    console.log('init complete');
    AppState.processEventListener('on-loader-hide', []);
    // KotOR.LoadingScreen.main.Hide();
  }

  /**
   * attachDirectoryPath
   * - Used for Electron
   */
  static attachDirectoryPath(path: string){
    KotOR.ConfigClient.set(`Profiles.${AppState.appProfile.key}.directory`, path);
    AppState.appProfile.directory = path;
    AppState.directoryLocated = true;
    AppState.loadGameDirectory();
  }

  /**
   * attachDirectoryHandle
   * - Used for Browser
   */
  static async attachDirectoryHandle(handle: FileSystemDirectoryHandle){
    KotOR.ApplicationProfile.directoryHandle = handle;
    KotOR.ConfigClient.set(`Profiles.${AppState.appProfile.key}.directory_handle`, handle);
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
      console.error(e);
      return false;
    }
  }

  static consoleCommand(command: string){
    console.log('consoleCommand', command);
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
    KotOR.GameState.stats.showPanel(mode as any);
  }

  static toggleDebugger(){
    KotOR.GameState.Debugger.open();
  }

  /**
   * Event Listeners
   */

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

}
