import * as path from "path";
import { GameState } from "./GameState";
import { ERFObject } from "./resource/ERFObject";
import { ResourceTypes } from "./resource/ResourceTypes";
import { RIMObject } from "./resource/RIMObject";
import { GameFileSystem } from "./utility/GameFileSystem";
import { GamePad, KeyMapper } from "./controls";
import { CurrentGame } from "./engine/CurrentGame";
import { ConfigClient } from "./utility/ConfigClient";
import { 
  AppearanceManager, AutoPauseManager, TLKManager, CharGenManager, CheatConsoleManager, CameraShakeManager, ConfigManager, CursorManager, DialogMessageManager, 
  FadeOverlayManager, FeedbackMessageManager, GlobalVariableManager, InventoryManager, JournalManager, LightManager, MenuManager, ModuleObjectManager, PartyManager, 
  ResolutionManager, ShaderManager, TwoDAManager, FactionManager, KEYManager, RIMManager, ERFManager, VideoEffectManager, PazaakManager, UINotificationManager, CutsceneManager,
  VideoManager
} from "./managers";
import { SWRuleSet } from "./engine/rules/SWRuleSet";
import { ResourceLoader } from "./loaders";
import { GameEngineType } from "./enums/engine";
import { SaveGame } from "./engine/SaveGame";
import { Module } from "./module/Module";
import { NWScript } from "./nwscript/NWScript";

import { TalentObject, TalentFeat, TalentSkill, TalentSpell } from "./talents";
import { ActionMenuManager } from "./engine/menu/ActionMenuManager";
import { ActionFactory } from "./actions/ActionFactory";
import { GameEffectFactory } from "./effects/GameEffectFactory";
import { GameEventFactory } from "./events/GameEventFactory";
import { INIConfig } from "./engine/INIConfig";
import { CacheScope } from "./enums";
import { PerformanceMonitor } from "./utility/PerformanceMonitor";

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

  static currentGame: GameEngineType;

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

  static async Init(game: GameEngineType){

    ResourceLoader.InitCache();
    GameState.PerformanceMonitor = PerformanceMonitor;

    /**
     * Initialize Managers
     */
    GameState.AppearanceManager = AppearanceManager;
    GameState.AutoPauseManager = AutoPauseManager;
    GameState.CameraShakeManager = CameraShakeManager;
    GameState.CharGenManager = CharGenManager;
    GameState.CheatConsoleManager = CheatConsoleManager;
    GameState.ConfigManager = ConfigManager;
    GameState.CursorManager = CursorManager;
    GameState.DialogMessageManager = DialogMessageManager;
    GameState.FactionManager = FactionManager;
    GameState.FadeOverlayManager = FadeOverlayManager;
    GameState.FeedbackMessageManager = FeedbackMessageManager;
    GameState.GlobalVariableManager = GlobalVariableManager;
    GameState.InventoryManager = InventoryManager;
    GameState.JournalManager = JournalManager;
    GameState.LightManager = LightManager;
    GameState.MenuManager = MenuManager;
    GameState.ModuleObjectManager = ModuleObjectManager;
    GameState.PartyManager = PartyManager;
    GameState.ResolutionManager = ResolutionManager;
    GameState.ShaderManager = ShaderManager;
    GameState.TLKManager = TLKManager;
    GameState.TwoDAManager = TwoDAManager;
    GameState.PazaakManager = PazaakManager;  
    GameState.UINotificationManager = UINotificationManager;
    GameState.CutsceneManager = CutsceneManager;   
    GameState.VideoManager = VideoManager;

    GameState.SWRuleSet = SWRuleSet;

    GameState.Module = Module;
    GameState.NWScript = NWScript;

    GameState.TalentObject = TalentObject;
    GameState.TalentFeat = TalentFeat;
    GameState.TalentSkill = TalentSkill;
    GameState.TalentSpell = TalentSpell;

    GameState.ActionMenuManager = ActionMenuManager;
    GameState.ActionFactory = ActionFactory;
    GameState.GameEffectFactory = GameEffectFactory;
    GameState.GameEventFactory = GameEventFactory;
    GameState.VideoEffectManager = VideoEffectManager;

    await CurrentGame.CleanGameInProgressFolder();

    //Keeps the initializer from loading the same game twice if it's already loaded
    if(GameInitializer.currentGame == game){
      return;
    }

    GameInitializer.currentGame = game;

    PerformanceMonitor.start('configclient');
    await ConfigClient.Init();
    PerformanceMonitor.stop('configclient');
    
    GameInitializer.SetLoadingMessage("Loading Keys");
    PerformanceMonitor.start('keys');
    await KEYManager.Load('chitin.key');
    PerformanceMonitor.stop('keys');

    PerformanceMonitor.start('globalcache');
    await ResourceLoader.InitGlobalCache();
    PerformanceMonitor.stop('globalcache');

    GameInitializer.SetLoadingMessage("Loading Game Resources");
    PerformanceMonitor.start('gameresources');
    await GameInitializer.LoadGameResources();
    PerformanceMonitor.stop('gameresources');

    /**
     * Initialize Journal
     */
    GameInitializer.SetLoadingMessage("Loading JRL File");
    PerformanceMonitor.start('journal');
    await JournalManager.LoadJournal();
    PerformanceMonitor.stop('journal');

    /**
     * Initialize TLK
     */
    GameInitializer.SetLoadingMessage("Loading TLK File");
    PerformanceMonitor.start('tlk');
    await TLKManager.LoadTalkTable();
    PerformanceMonitor.stop('tlk');

    GameInitializer.SetLoadingMessage("Initializing Controls");
    /**
     * Initialize Controls
     */
    KeyMapper.Init();
    GamePad.Init();

    /**
     * Initialize SWRuleSet
     */
    GameState.SWRuleSet.Init();

    /**
     * Initialize AppearanceManager
     */
    GameState.AppearanceManager.Init();

    GameInitializer.SetLoadingMessage("Loading INI File");
    /**
     * Initialize INIConfig
     */
    if(GameState.GameKey == GameEngineType.TSL){
      GameState.iniConfig = new INIConfig('swkotor2.ini', INIConfig.defaultConfigs.swKotOR2);
    }else{
      GameState.iniConfig = new INIConfig('swkotor.ini', INIConfig.defaultConfigs.swKotOR);
    }
    await GameState.iniConfig.load();
    GameState.SWRuleSet.setIniConfig(GameState.iniConfig);
    GameState.AutoPauseManager.INIConfig = GameState.iniConfig;

    /**
     * Initialize AutoPauseManager
     */
    GameState.AutoPauseManager.Init();

    /**
     * Initialize GLobal Variabled
     */
    GameState.GlobalVariableManager.Init();

    /**
     * Initialize Planetary
     */
    await GameState.Planetary.Init()

    GameInitializer.SetLoadingMessage("Initializing SaveGame Folder");
    /**
     * Initialize SaveGame Folder
     */
    PerformanceMonitor.start('SaveGame.GetSaveGames');
    await SaveGame.GetSaveGames();
    PerformanceMonitor.stop('SaveGame.GetSaveGames');

    VideoEffectManager.Init2DA(TwoDAManager.datatables.get('videoeffects') as any);
  }

  static async LoadGameResources(){
    GameInitializer.SetLoadingMessage("Loading Assets");
    const promises = [
      GameInitializer.LoadOverride(), 
      GameInitializer.LoadRIMs(), 
      GameInitializer.LoadModules(), 
      GameInitializer.LoadLips(), 
      GameInitializer.Load2DAs(), 
      GameInitializer.LoadTexturePacks(), 
      GameInitializer.LoadGameAudioResources('streammusic'), 
      GameInitializer.LoadGameAudioResources('streamsounds'), 
      GameInitializer.LoadGameAudioResources(GameState.GameKey != GameEngineType.TSL ? 'streamwaves' : 'streamvoice')
    ];
    await Promise.all(promises);
  }

  static async LoadRIMs(){
    if(GameState.GameKey == GameEngineType.TSL){
      return;
    }
    PerformanceMonitor.start('RIMManager.Load');
    await RIMManager.Load();
    PerformanceMonitor.stop('RIMManager.Load');
  }

  static async LoadLips(){
    PerformanceMonitor.start('GameInitializer.LoadLips');
    const data_dir = 'lips';
    const filenames = await GameFileSystem.readdir(data_dir);
    const modules = filenames.map(function(file) {
      const filename = file.split(path.sep).pop() as string;
      const args = filename.split('.');
      return {
        ext: args[1].toLowerCase(), 
        name: args[0], 
        filename: filename
      };
    }).filter(function(file_obj){
      return file_obj.ext == 'mod';
    });
    for(let i = 0, len = modules.length; i < len; i++){
      const module_obj = modules[i];
      switch(module_obj.ext){
        case 'mod':
          const mod = new ERFObject(path.join(data_dir, module_obj.filename));
          await mod.load();
          if(mod instanceof ERFObject){
            mod.group = 'Lips';
            ERFManager.addERF(module_obj.name, mod);
          }
        break;
        default:
          console.warn('GameInitializer.LoadLips: Encountered incorrect filetype');
          console.log(module_obj);
        break;
      }
    }
    PerformanceMonitor.stop('GameInitializer.LoadLips');
  }

  static async LoadModules(){
    let data_dir = 'modules';
    PerformanceMonitor.start('GameInitializer.LoadModules');
    try{
      const filenames = await GameFileSystem.readdir(data_dir);
      const modules = filenames.map(function(file) {
        const filename = file.split(path.sep).pop() as string;
        const args = filename.split('.');
        return {
          ext: args[1].toLowerCase(), 
          name: args[0], 
          filename: filename
        };
      }).filter(function(file_obj){
        return file_obj.ext == 'rim' || file_obj.ext == 'mod';
      });

      for(let i = 0, len = modules.length; i < len; i++){
        const module_obj = modules[i];
        switch(module_obj.ext){
          case 'rim':
            const rim = new RIMObject(path.join(data_dir, module_obj.filename));
            await rim.load();
            if(rim instanceof RIMObject){
              rim.group = 'Module';
              RIMManager.addRIM(module_obj.name, rim);
            }
          break;
          case 'mod':
            const mod = new ERFObject(path.join(data_dir, module_obj.filename));
            await mod.load();
            if(mod instanceof ERFObject){
              mod.group = 'Module';
              ERFManager.addERF(module_obj.name, mod);
            }
          break;
          default:
            console.warn('GameInitializer.LoadModules: Encountered incorrect filetype');
            console.log(module_obj);
          break;
        }
      }
    }catch(e){
      console.warn('GameInitializer.LoadModules: Failed to load modules');
      console.error(e);
    }
    PerformanceMonitor.stop('GameInitializer.LoadModules');
  }

  static async Load2DAs(){
    PerformanceMonitor.start('GameInitializer.Load2DAs');
    await GameState.TwoDAManager.Load2DATables();
    PerformanceMonitor.stop('GameInitializer.Load2DAs');
  }

  static async LoadTexturePacks(){
    PerformanceMonitor.start('GameInitializer.LoadTexturePacks');
    const data_dir = 'TexturePacks';
    try{
      const filenames = await GameFileSystem.readdir(data_dir)
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
        const erf = new ERFObject(path.join(data_dir, _erf.filename));
        await erf.load();
        if(erf instanceof ERFObject){
          erf.group = 'Textures';
          ERFManager.addERF(_erf.name, erf);
        }
      }));
    }catch(e){
      console.warn('GameInitializer.LoadTexturePacks: Failed to load texture packs');
      console.error(e);
    }
    PerformanceMonitor.stop('GameInitializer.LoadTexturePacks');
  }

  static async LoadGameAudioResources( folder: string ){
    PerformanceMonitor.start(`GameInitializer.LoadGameAudioResources[${folder}]`);
    try{
      const files = await GameFileSystem.readdir(folder, {recursive: true})
      for(let i = 0, len = files.length; i < len; i++){
        let f = files[i];
        let _parsed = path.parse(f);
        let ext = _parsed.ext.substr(1,  _parsed.ext.length);

        if(typeof ResourceTypes[ext] != 'undefined'){
          ResourceLoader.setResource(ResourceTypes[ext], _parsed.name.toLowerCase(), {
            inArchive: false,
            file: f,
            resref: _parsed.name,
            resid: ResourceTypes[ext],
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
    PerformanceMonitor.stop(`GameInitializer.LoadGameAudioResources[${folder}]`);
  }

  static async LoadOverride(){
    PerformanceMonitor.start('GameInitializer.LoadOverride');
    try{
      const files = await GameFileSystem.readdir('Override', {recursive: false});
      for(let i = 0, len = files.length; i < len; i++){
        let f = files[i];
        let _parsed = path.parse(f);
        let ext = _parsed.ext.substr(1,  _parsed.ext.length)?.toLocaleLowerCase();
        const resId = ResourceTypes[ext];

        if(typeof resId === 'undefined'){
          continue;
        }

        const buffer = await GameFileSystem.readFile(f);
        if(!buffer || !buffer.length){ continue; }

        ResourceLoader.setCache(CacheScope.OVERRIDE, resId, _parsed.name.toLocaleLowerCase(), buffer);
      }
    }catch(e){
      console.warn('GameInitializer.LoadOverride: Failed to load override');
      console.error(e);
    }
    PerformanceMonitor.stop('GameInitializer.LoadOverride');
  }

}
