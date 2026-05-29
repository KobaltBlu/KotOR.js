import * as path from "path";
import * as KotOR from "@/apps/game/KotOR";
import pLimit from "p-limit";
import { ILoaderProgress, LoaderProgressTracker } from "@/apps/common/loader/LoaderProgress";

const fsLimit = pLimit(16);

/**
 * GameInitializer class.
 * 
 * Handles the loading of game archives for use later during runtime
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameInitializer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GameInitializer {

  static currentGame: KotOR.GameEngineType;

  /**
   * Event listeners
   */
  static #eventListeners: Record<string, Function[]> = {};

  /**
   * Add an event listener
   * @param type 
   * @param cb 
   */
  static AddEventListener<T extends string>(type: T, cb: Function): void {
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

  /**
   * Remove an event listener
   * @param type 
   * @param cb 
   */
  static RemoveEventListener<T extends string>(type: T, cb: Function): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
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

  /**
   * Process an event listener
   * @param type 
   * @param args 
   */
  static ProcessEventListener<T extends string>(type: T, args: any[] = []): void {
    if(!Array.isArray(this.#eventListeners[type])){
      this.#eventListeners[type] = [];
    }
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

  static SetLoadingMessage(message: string){
    GameInitializer.ProcessEventListener('on-loader-message', [message]);
    GameInitializer.ProcessEventListener('on-loader-progress', [null]);
  }

  static SetLoadingProgress(progress: ILoaderProgress){
    GameInitializer.ProcessEventListener('on-loader-progress', [progress]);
  }

  static async Init(game: KotOR.GameEngineType){

    KotOR.ResourceLoader.InitCache();
    KotOR.GameState.PerformanceMonitor = KotOR.PerformanceMonitor;

    /**
     * Initialize Managers
     */
    KotOR.GameState.AppearanceManager = KotOR.AppearanceManager;
    KotOR.GameState.AutoPauseManager = KotOR.AutoPauseManager;
    KotOR.GameState.CameraShakeManager = KotOR.CameraShakeManager;
    KotOR.GameState.CharGenManager = KotOR.CharGenManager;
    KotOR.GameState.CheatConsoleManager = KotOR.CheatConsoleManager;
    KotOR.GameState.ConfigManager = KotOR.ConfigManager;
    KotOR.GameState.CursorManager = KotOR.CursorManager;
    KotOR.GameState.DialogMessageManager = KotOR.DialogMessageManager;
    KotOR.GameState.FactionManager = KotOR.FactionManager;
    KotOR.GameState.FadeOverlayManager = KotOR.FadeOverlayManager;
    KotOR.GameState.FeedbackMessageManager = KotOR.FeedbackMessageManager;
    KotOR.GameState.GlobalVariableManager = KotOR.GlobalVariableManager;
    KotOR.GameState.InventoryManager = KotOR.InventoryManager;
    KotOR.GameState.JournalManager = KotOR.JournalManager;
    KotOR.GameState.LightManager = KotOR.LightManager;
    KotOR.GameState.MenuManager = KotOR.MenuManager;
    KotOR.GameState.ModuleObjectManager = KotOR.ModuleObjectManager;
    KotOR.GameState.PartyManager = KotOR.PartyManager;
    KotOR.GameState.ResolutionManager = KotOR.ResolutionManager;
    KotOR.GameState.ShaderManager = KotOR.ShaderManager;
    KotOR.GameState.TLKManager = KotOR.TLKManager;
    KotOR.GameState.TwoDAManager = KotOR.TwoDAManager;
    KotOR.GameState.PazaakManager = KotOR.PazaakManager;
    KotOR.GameState.UINotificationManager = KotOR.UINotificationManager;
    KotOR.GameState.CutsceneManager = KotOR.CutsceneManager;
    KotOR.GameState.VideoManager = KotOR.VideoManager;
    KotOR.GameState.LegalScreenManager = KotOR.LegalScreenManager;

    KotOR.GameState.SWRuleSet = KotOR.SWRuleSet;

    KotOR.GameState.Module = KotOR.Module;
    KotOR.GameState.NWScript = KotOR.NWScript;

    KotOR.GameState.TalentObject = KotOR.TalentObject;
    KotOR.GameState.TalentFeat = KotOR.TalentFeat;
    KotOR.GameState.TalentSkill = KotOR.TalentSkill;
    KotOR.GameState.TalentSpell = KotOR.TalentSpell;

    KotOR.GameState.ActionMenuManager = KotOR.ActionMenuManager;
    KotOR.GameState.ActionFactory = KotOR.ActionFactory;
    KotOR.GameState.GameEffectFactory = KotOR.GameEffectFactory;
    KotOR.GameState.GameEventFactory = KotOR.GameEventFactory;
    KotOR.GameState.VideoEffectManager = KotOR.VideoEffectManager;

    await KotOR.CurrentGame.CleanGameInProgressFolder();

    //Keeps the initializer from loading the same game twice if it's already loaded
    if(GameInitializer.currentGame == game){
      return;
    }

    GameInitializer.currentGame = game;

    KotOR.PerformanceMonitor.start('configclient');
    await KotOR.ConfigClient.Init();
    KotOR.PerformanceMonitor.stop('configclient');
    
    GameInitializer.SetLoadingMessage("Loading Keys");
    KotOR.PerformanceMonitor.start('keys');
    await KotOR.KEYManager.Load('chitin.key');
    KotOR.PerformanceMonitor.stop('keys');

    // KotOR.PerformanceMonitor.start('globalcache');
    KotOR.ResourceLoader.InitGlobalCache();
    // KotOR.PerformanceMonitor.stop('globalcache');

    GameInitializer.SetLoadingMessage("Loading Game Resources");
    KotOR.PerformanceMonitor.start('gameresources');
    await GameInitializer.LoadGameResources();
    KotOR.PerformanceMonitor.stop('gameresources');

    /**
     * Initialize Journal
     */
    GameInitializer.SetLoadingMessage("Loading JRL File");
    KotOR.PerformanceMonitor.start('journal');
    await KotOR.JournalManager.LoadJournal();
    KotOR.PerformanceMonitor.stop('journal');

    /**
     * Initialize TLK
     */
    GameInitializer.SetLoadingMessage("Loading TLK File");
    KotOR.PerformanceMonitor.start('tlk');
    await KotOR.TLKManager.LoadTalkTable();
    KotOR.PerformanceMonitor.stop('tlk');

    GameInitializer.SetLoadingMessage("Initializing Controls");
    /**
     * Initialize Controls
     */
    KotOR.KeyMapper.Init();
    KotOR.GamePad.Init();

    /**
     * Initialize SWRuleSet
     */
    KotOR.GameState.SWRuleSet.Init();

    /**
     * Initialize AppearanceManager
     */
    KotOR.GameState.AppearanceManager.Init();

    GameInitializer.SetLoadingMessage("Loading INI File");
    /**
     * Initialize INIConfig
     */
    if(KotOR.GameState.GameKey == KotOR.GameEngineType.TSL){
      KotOR.GameState.iniConfig = new KotOR.INIConfig('swkotor2.ini', KotOR.INIConfig.defaultConfigs.swKotOR2);
    }else{
      KotOR.GameState.iniConfig = new KotOR.INIConfig('swkotor.ini', KotOR.INIConfig.defaultConfigs.swKotOR);
    }
    await KotOR.GameState.iniConfig.load();
    KotOR.GameState.SWRuleSet.setIniConfig(KotOR.GameState.iniConfig);
    KotOR.GameState.AutoPauseManager.INIConfig = KotOR.GameState.iniConfig;

    /**
     * Initialize AutoPauseManager
     */
    KotOR.GameState.AutoPauseManager.Init();

    /**
     * Initialize GLobal Variabled
     */
    KotOR.GameState.GlobalVariableManager.Init();

    /**
     * Initialize Planetary
     */
    await KotOR.GameState.Planetary.Init()

    GameInitializer.SetLoadingMessage("Initializing SaveGame Folder");
    /**
     * Initialize SaveGame Folder
     */
    KotOR.PerformanceMonitor.start('SaveGame.GetSaveGames');
    await KotOR.SaveGame.GetSaveGames();
    KotOR.PerformanceMonitor.stop('SaveGame.GetSaveGames');

    KotOR.VideoEffectManager.Init2DA(KotOR.TwoDAManager.datatables.get('videoeffects') as any);
  }

  static async LoadGameResources(){
    const tracker = new LoaderProgressTracker(
      (progress) => GameInitializer.SetLoadingProgress(progress),
      'Loading Assets',
    );

    const overrideFiles = await GameInitializer.listOverrideFiles();
    const rimFiles = await GameInitializer.listRimFiles();
    const twoDAResources = KotOR.KEYManager.Key.getFilesByResType(KotOR.ResourceTypes['2da']);
    const texturePackErfs = await GameInitializer.listTexturePackErfs();

    tracker.begin(
      overrideFiles.length + rimFiles.length + twoDAResources.length + texturePackErfs.length,
      'Loading Assets',
    );

    const promises = [
      GameInitializer.LoadOverride(tracker, overrideFiles),
      GameInitializer.LoadRIMs(tracker, rimFiles),
      GameInitializer.Load2DAs(tracker, twoDAResources),
      GameInitializer.LoadTexturePacks(tracker, texturePackErfs),
    ];
    await Promise.all(promises);
    const nonBlockingPromises = [
      GameInitializer.LoadGameAudioResources('streammusic'), 
      GameInitializer.LoadGameAudioResources('streamsounds'), 
      GameInitializer.LoadGameAudioResources(KotOR.GameState.GameKey != KotOR.GameEngineType.TSL ? 'streamwaves' : 'streamvoice')
    ];
    Promise.all(nonBlockingPromises);
  }

  static async listOverrideFiles(){
    try{
      const files = await KotOR.GameFileSystem.readdir('Override', {recursive: false});
      return files
        .map((f) => {
          const _parsed = path.parse(f);
          const ext = _parsed.ext.substr(1, _parsed.ext.length)?.toLocaleLowerCase();
          return { f, _parsed, resId: KotOR.ResourceTypes[ext] };
        })
        .filter(({ resId }) => typeof resId !== 'undefined');
    }catch(e){
      return [];
    }
  }

  static async listRimFiles(){
    if(KotOR.GameState.GameKey == KotOR.GameEngineType.TSL){
      return [] as { ext: string; name: string; filename: string }[];
    }
    try{
      const filenames = await KotOR.GameFileSystem.readdir('rims');
      return filenames.map(function(file: string) {
        const filename = file.split(path.sep).pop() as string;
        const args = filename.split('.');
        return {
          ext: args[1].toLowerCase(),
          name: args[0],
          filename: path.join('rims', filename),
        };
      }).filter(function(file_obj){
        return file_obj.ext == 'rim';
      });
    }catch(e){
      return [];
    }
  }

  static async listTexturePackErfs(){
    const data_dir = 'TexturePacks';
    try{
      const filenames = await KotOR.GameFileSystem.readdir(data_dir);
      return filenames.map(function(file) {
        const filename = file.split(path.sep).pop() as string;
        const args = filename.split('.');
        return {
          ext: args[1].toLowerCase(),
          name: args[0],
          filename: filename,
        };
      }).filter(function(file_obj){
        return file_obj.ext == 'erf';
      });
    }catch(e){
      return [];
    }
  }

  static async LoadRIMs(tracker?: LoaderProgressTracker, rims?: { ext: string; name: string; filename: string }[]){
    const rimFiles = rims ?? await GameInitializer.listRimFiles();
    if(!rimFiles.length){
      return;
    }
    KotOR.PerformanceMonitor.start('RIMManager.Load');
    await Promise.all(rimFiles.map((rimObj) => fsLimit(async () => {
      tracker?.itemStart(path.basename(rimObj.filename));
      try{
        const rim = await KotOR.RIMManager.LoadRIMObject(rimObj);
        rim.group = 'RIMs';
      }catch(e){
        console.error(e);
      }finally{
        tracker?.itemComplete();
      }
    })));
    KotOR.PerformanceMonitor.stop('RIMManager.Load');
  }

  static async Load2DAs(tracker?: LoaderProgressTracker, resources?: ReturnType<typeof KotOR.KEYManager.Key.getFilesByResType>){
    const twoDAResources = resources ?? KotOR.KEYManager.Key.getFilesByResType(KotOR.ResourceTypes['2da']);
    KotOR.PerformanceMonitor.start('GameInitializer.Load2DAs');
    KotOR.TwoDAManager.datatables = new Map();
    await Promise.all(twoDAResources.map((res) => fsLimit(async () => {
      const key = KotOR.KEYManager.Key.getFileKeyByRes(res);
      if(!key){
        tracker?.itemComplete();
        return;
      }
      tracker?.itemStart(`${key.resRef}.2da`);
      try{
        const d = await KotOR.ResourceLoader.loadResource(KotOR.ResourceTypes['2da'], key.resRef);
        KotOR.TwoDAManager.datatables.set(key.resRef, new KotOR.TwoDAObject(d));
      }catch(e){
        console.error(e);
      }finally{
        tracker?.itemComplete();
      }
    })));
    KotOR.PerformanceMonitor.stop('GameInitializer.Load2DAs');
  }

  static async LoadTexturePacks(tracker?: LoaderProgressTracker, erfs?: { ext: string; name: string; filename: string }[]){
    const texturePackErfs = erfs ?? await GameInitializer.listTexturePackErfs();
    KotOR.PerformanceMonitor.start('GameInitializer.LoadTexturePacks');
    const data_dir = 'TexturePacks';
    try{
      await Promise.all(texturePackErfs.map((_erf) => fsLimit(async () => {
        tracker?.itemStart(_erf.filename);
        try{
          const erf = new KotOR.ERFObject(path.join(data_dir, _erf.filename));
          await erf.load();
          if(erf instanceof KotOR.ERFObject){
            erf.group = 'Textures';
            KotOR.ERFManager.addERF(_erf.name, erf);
          }
        }catch(e){
          console.error(e);
        }finally{
          tracker?.itemComplete();
        }
      })));
    }catch(e){
      console.warn('GameInitializer.LoadTexturePacks: Failed to load texture packs');
      console.error(e);
    }
    KotOR.PerformanceMonitor.stop('GameInitializer.LoadTexturePacks');
  }

  static async LoadGameAudioResources( folder: string ){
    KotOR.PerformanceMonitor.start(`GameInitializer.LoadGameAudioResources[${folder}]`);
    try{
      const files = await KotOR.GameFileSystem.readdir(folder, {recursive: true})
      for(let i = 0, len = files.length; i < len; i++){
        let f = files[i];
        let _parsed = path.parse(f);
        let ext = _parsed.ext.substr(1,  _parsed.ext.length);

        if(typeof KotOR.ResourceTypes[ext] != 'undefined'){
          KotOR.ResourceLoader.setResource(KotOR.ResourceTypes[ext], _parsed.name.toLowerCase(), {
            inArchive: false,
            file: f,
            resref: _parsed.name,
            resid: KotOR.ResourceTypes[ext],
            ext: ext,
            offset: 0,
            length: 0
          });
        }
      }
    }catch(e){
      console.warn(`GameInitializer.LoadGameAudioResources[${folder}]: Failed to load game audio resources`);
      console.error(e);
    }
    KotOR.PerformanceMonitor.stop(`GameInitializer.LoadGameAudioResources[${folder}]`);
  }

  static async LoadOverride(tracker?: LoaderProgressTracker, validOverrideFiles?: Awaited<ReturnType<typeof GameInitializer.listOverrideFiles>>){
    const overrideFiles = validOverrideFiles ?? await GameInitializer.listOverrideFiles();
    KotOR.PerformanceMonitor.start('GameInitializer.LoadOverride');
    try{
      await Promise.all(overrideFiles.map(({ f, _parsed, resId }) => fsLimit(async () => {
        tracker?.itemStart(path.basename(f));
        try{
          const buffer = await KotOR.GameFileSystem.readFile(f);
          if(buffer && buffer.length){
            KotOR.ResourceLoader.setCache(KotOR.CacheScope.OVERRIDE, resId, _parsed.name.toLocaleLowerCase(), buffer);
          }
        }catch(e){
          console.error(e);
        }finally{
          tracker?.itemComplete();
        }
      })));
    }catch(e){
      console.warn('GameInitializer.LoadOverride: Failed to load override');
      console.error(e);
    }
    KotOR.PerformanceMonitor.stop('GameInitializer.LoadOverride');
  }

}
