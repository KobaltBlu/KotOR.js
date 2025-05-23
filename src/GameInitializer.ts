import * as path from "path";
import { GameState } from "./GameState";
import { LoadingScreen } from "./LoadingScreen";
import { ERFObject } from "./resource/ERFObject";
import { ResourceTypes } from "./resource/ResourceTypes";
import { RIMObject } from "./resource/RIMObject";
import { GameFileSystem } from "./utility/GameFileSystem";
import { GamePad, KeyMapper } from "./controls";
import { CurrentGame } from "./CurrentGame";
import { ConfigClient } from "./utility/ConfigClient";
import { 
  AppearanceManager, AutoPauseManager, TLKManager, CharGenManager, CheatConsoleManager, CameraShakeManager, ConfigManager, CursorManager, DialogMessageManager, 
  FadeOverlayManager, FeedbackMessageManager, GlobalVariableManager, InventoryManager, JournalManager, LightManager, MenuManager, ModuleObjectManager, PartyManager, 
  ResolutionManager, ShaderManager, TwoDAManager, FactionManager, KEYManager, RIMManager, ERFManager, VideoEffectManager, PazaakManager, UINotificationManager
} from "./managers";
import { SWRuleSet } from "./engine/rules/SWRuleSet";
import { ResourceLoader } from "./loaders";
import { GameEngineType } from "./enums/engine";
import { SaveGame } from "./SaveGame";
// import { Planetary } from "./Planetary";
import { Module } from "./module/Module";
import { NWScript } from "./nwscript/NWScript";

import { TalentObject, TalentFeat, TalentSkill, TalentSpell } from "./talents";
import { ActionMenuManager } from "./ActionMenuManager";
import { ActionFactory } from "./actions/ActionFactory";
import { GameEffectFactory } from "./effects/GameEffectFactory";
import { GameEventFactory } from "./events/GameEventFactory";
import { INIConfig } from "./INIConfig";
import { CacheScope } from "./enums";

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

  static async Init(game: GameEngineType){

    ResourceLoader.InitCache();

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

    await ConfigClient.Init();
    
    LoadingScreen.main.SetMessage("Loading Keys");
    await KEYManager.Load('chitin.key');
    await ResourceLoader.InitGlobalCache();
    LoadingScreen.main.SetMessage("Loading Game Resources");
    await GameInitializer.LoadGameResources();

    /**
     * Initialize Journal
     */
    LoadingScreen.main.SetMessage("Loading JRL File");
    await JournalManager.LoadJournal();

    /**
     * Initialize TLK
     */
    LoadingScreen.main.SetMessage("Loading TLK File");
    await TLKManager.LoadTalkTable();

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

    /**
     * Initialize SaveGame Folder
     */
    await SaveGame.GetSaveGames();

    VideoEffectManager.Init2DA(TwoDAManager.datatables.get('videoeffects') as any);
  }

  static async LoadGameResources(){
    LoadingScreen.main.SetMessage("Loading Override");
    await GameInitializer.LoadOverride();

    LoadingScreen.main.SetMessage("Loading BIF's");

    LoadingScreen.main.SetMessage("Loading RIM's");
    await GameInitializer.LoadRIMs();

    LoadingScreen.main.SetMessage("Loading Modules");
    await GameInitializer.LoadModules();

    LoadingScreen.main.SetMessage("Loading Lips");
    await GameInitializer.LoadLips();

    LoadingScreen.main.SetMessage('Loading: 2DA\'s');
    await GameInitializer.Load2DAs();

    LoadingScreen.main.SetMessage('Loading: Texture Packs');
    await GameInitializer.LoadTexturePacks();

    LoadingScreen.main.SetMessage('Loading: Stream Music');
    await GameInitializer.LoadGameAudioResources('streammusic');

    LoadingScreen.main.SetMessage('Loading: Stream Sounds');
    await GameInitializer.LoadGameAudioResources('streamsounds');

    if(GameState.GameKey != GameEngineType.TSL){
      LoadingScreen.main.SetMessage('Loading: Stream Waves');
      await GameInitializer.LoadGameAudioResources('streamwaves');
    }else{
      LoadingScreen.main.SetMessage('Loading: Stream Voice');
      await GameInitializer.LoadGameAudioResources('streamvoice');
    }
  }

  static async LoadRIMs(){
    if(GameState.GameKey == GameEngineType.TSL){
      return;
    }
    LoadingScreen.main.SetMessage('Loading: RIM Archives');
    await RIMManager.Load();
  }

  static async LoadLips(){
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
  }

  static async LoadModules(){
    let data_dir = 'modules';
    LoadingScreen.main.SetMessage('Loading: Module Archives');
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
  }

  static async Load2DAs(){
    LoadingScreen.main.SetMessage('Loading: 2DA\'s');
    await GameState.TwoDAManager.Load2DATables();
    GameState.AppearanceManager.Init();
  }

  static async LoadTexturePacks(){
    let data_dir = 'TexturePacks';
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

      for(let i = 0, len = erfs.length; i < len; i++){
        const erf = new ERFObject(path.join(data_dir, erfs[i].filename));
        await erf.load();
        if(erf instanceof ERFObject){
          erf.group = 'Textures';
          ERFManager.addERF(erfs[i].name, erf);
        }
      }
    }catch(e){
      console.warn('GameInitializer.LoadTexturePacks: Failed to load texture packs');
      console.error(e);
    }
  }

  static async LoadGameAudioResources( folder: string ){

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

  }

  static async LoadOverride(){
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
  }

}
