import * as path from "path";
import * as KotOR from "@/apps/game/KotOR";

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

    KotOR.PerformanceMonitor.start('globalcache');
    await KotOR.ResourceLoader.InitGlobalCache();
    KotOR.PerformanceMonitor.stop('globalcache');

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
    GameInitializer.SetLoadingMessage("Loading Assets");
    const promises = [
      GameInitializer.LoadOverride(), 
      GameInitializer.LoadRIMs(), 
      GameInitializer.Load2DAs(), 
      GameInitializer.LoadTexturePacks(), 
      GameInitializer.LoadGameAudioResources('streammusic'), 
      GameInitializer.LoadGameAudioResources('streamsounds'), 
      GameInitializer.LoadGameAudioResources(KotOR.GameState.GameKey != KotOR.GameEngineType.TSL ? 'streamwaves' : 'streamvoice')
    ];
    await Promise.all(promises);
  }

  static async LoadRIMs(){
    if(KotOR.GameState.GameKey == KotOR.GameEngineType.TSL){
      return;
    }
    KotOR.PerformanceMonitor.start('RIMManager.Load');
    await KotOR.RIMManager.Load();
    KotOR.PerformanceMonitor.stop('RIMManager.Load');
  }

  static async Load2DAs(){
    KotOR.PerformanceMonitor.start('GameInitializer.Load2DAs');
    await KotOR.GameState.TwoDAManager.Load2DATables();
    KotOR.PerformanceMonitor.stop('GameInitializer.Load2DAs');
  }

  static async LoadTexturePacks(){
    KotOR.PerformanceMonitor.start('GameInitializer.LoadTexturePacks');
    const data_dir = 'TexturePacks';
    try{
      const filenames = await KotOR.GameFileSystem.readdir(data_dir)
      const erfs = filenames.map(function(file) {
        const filename = file.split(path.sep).pop() as string;
        const args = filename.split('.');
        return {
          ext: args[1].toLowerCase(), 
          name: args[0], 
          filename: filename
        };
      }).filter(function(file_obj){
        return file_obj.ext == 'erf';
      });

      await Promise.all(erfs.map(async (_erf) => {
        const erf = new KotOR.ERFObject(path.join(data_dir, _erf.filename));
        await erf.load();
        if(erf instanceof KotOR.ERFObject){
          erf.group = 'Textures';
          KotOR.ERFManager.addERF(_erf.name, erf);
        }
      }));
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

  static async LoadOverride(){
    KotOR.PerformanceMonitor.start('GameInitializer.LoadOverride');
    try{
      const files = await KotOR.GameFileSystem.readdir('Override', {recursive: false});
      const validOverrideFiles = files
        .map(f => {
          const _parsed = path.parse(f);
          const ext = _parsed.ext.substr(1, _parsed.ext.length)?.toLocaleLowerCase();
          return { f, _parsed, resId: KotOR.ResourceTypes[ext] };
        })
        .filter(({ resId }) => typeof resId !== 'undefined');

      await Promise.all(validOverrideFiles.map(async ({ f, _parsed, resId }) => {
        const buffer = await KotOR.GameFileSystem.readFile(f);
        if(!buffer || !buffer.length) return;
        KotOR.ResourceLoader.setCache(KotOR.CacheScope.OVERRIDE, resId, _parsed.name.toLocaleLowerCase(), buffer);
      }));
    }catch(e){
      console.warn('GameInitializer.LoadOverride: Failed to load override');
      console.error(e);
    }
    KotOR.PerformanceMonitor.stop('GameInitializer.LoadOverride');
  }

}
