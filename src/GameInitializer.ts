import * as path from "path";
import { GameState } from "./GameState";
import { LoadingScreen } from "./LoadingScreen";
import { ERFObject } from "./resource/ERFObject";
import { ResourceTypes } from "./resource/ResourceTypes";
import { RIMObject } from "./resource/RIMObject";
import { AsyncLoop } from "./utility/AsyncLoop";
import { GameFileSystem } from "./utility/GameFileSystem";
import { GamePad, KeyMapper } from "./controls";
import { CurrentGame } from "./CurrentGame";
import { ConfigClient } from "./utility/ConfigClient";
import { 
  AppearanceManager, AutoPauseManager, TLKManager, CharGenManager, CheatConsoleManager, CameraShakeManager, ConfigManager, CursorManager, DialogMessageManager, 
  FadeOverlayManager, FeedbackMessageManager, GlobalVariableManager, InventoryManager, JournalManager, LightManager, MenuManager, ModuleObjectManager, PartyManager, 
  ResolutionManager, ShaderManager, TwoDAManager, FactionManager,   
  KEYManager,
  RIMManager,
  ERFManager, VideoEffectManager
} from "./managers";
import { ResourceLoader } from "./loaders";
import { GameEngineType } from "./enums/engine";
import { SaveGame } from "./SaveGame";
import { Planetary } from "./Planetary";
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

  static currentGame: any;
  static files: string[] = [];

  static async Init(props: any){

    props = Object.assign({
      game: null,
      onLoad: null,
      onError: null
    }, props);

    ResourceLoader.InitCache();

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
    if(GameInitializer.currentGame == props.game){
      if(props.onLoad != null)
        props.onLoad();

      return;
    }

    GameInitializer.currentGame = props.game;

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
     * Initialize INIConfig
     */
    if(GameState.GameKey == GameEngineType.TSL){
      GameState.iniConfig = new INIConfig('swkotor2.ini', INIConfig.defaultConfigs.swKotOR2);
    }else{
      GameState.iniConfig = new INIConfig('swkotor.ini', INIConfig.defaultConfigs.swKotOR);
    }
    await GameState.iniConfig.load();
    AutoPauseManager.INIConfig = GameState.iniConfig;

    /**
     * Initialize AutoPauseManager
     */
    AutoPauseManager.Init();

    /**
     * Initialize GLobal Variabled
     */
    GameState.GlobalVariableManager.Init();

    /**
     * Initialize Planetary
     */
    await Planetary.Init()

    /**
     * Initialize SaveGame Folder
     */
    await SaveGame.GetSaveGames();

    VideoEffectManager.Init2DA(TwoDAManager.datatables.get('videoeffects'));

    /**
     * Initialize Complete
     */
    if(typeof props.onLoad === 'function'){
      props.onLoad();
    }

  }

  static LoadGameResources(){
    return new Promise<void>(async (resolve, reject) => {
      LoadingScreen.main.SetMessage("Loading Override");
      await GameInitializer.LoadOverride();

      LoadingScreen.main.SetMessage("Loading BIF's");

      LoadingScreen.main.SetMessage("Loading RIM's");
      GameInitializer.LoadRIMs( () => {
        GameInitializer.LoadModules( () => {

          //Load all of the 2da files into memory
          GameInitializer.Load2DAs( () => {
            LoadingScreen.main.SetMessage('Loading: Texture Packs');
            GameInitializer.LoadTexturePacks( () => {
              GameInitializer.LoadGameAudioResources( {
                folder: 'streammusic',
                name: 'StreamMusic',
                onSuccess: () => {
                  GameInitializer.LoadGameAudioResources( {
                    folder: 'streamsounds',
                    name: 'StreamSounds',
                    onSuccess: () => {
                      if(GameState.GameKey != GameEngineType.TSL){
                        GameInitializer.LoadGameAudioResources( {
                          folder: 'streamwaves',
                          name: 'StreamWaves',
                          onSuccess: () => {

                            resolve();
                          }
                        });
                      }else{
                        GameInitializer.LoadGameAudioResources( {
                          folder: 'streamvoice',
                          name: 'StreamSounds',
                          onSuccess: () => {

                            resolve();
                          }
                        });
                      }
                    }
                  });
                }
              });
            });
          });
        });
      });
    });
  }

  static LoadRIMs(onSuccess?: Function){
    if(GameState.GameKey != GameEngineType.TSL){
      LoadingScreen.main.SetMessage('Loading: RIM Archives');

      RIMManager.Load().then( () => {
        if(typeof onSuccess === 'function')
          onSuccess();
      });
    }else{
      if(onSuccess != null)
        onSuccess();
    }
  }

  static LoadLips(){
    let data_dir = 'lips';
    return new Promise<void>( (resolve, reject) => {
      GameFileSystem.readdir(data_dir).then( (filenames: string[]) => {
        let modules = filenames.map(function(file) {
          let filename = file.split(path.sep).pop();
          let args = filename.split('.');
          return {ext: args[1].toLowerCase(), name: args[0], filename: filename};
        }).filter(function(file_obj){
          return file_obj.ext == 'mod';
        });
        let loop = new AsyncLoop({
          array: modules,
          onLoop: (module_obj: any, asyncLoop: AsyncLoop) => {
            switch(module_obj.ext){
              case 'mod':
                const mod = new ERFObject(path.join(data_dir, module_obj.filename));
                mod.load().then( (mod: ERFObject) => {
                  if(mod instanceof ERFObject){
                    mod.group = 'Lips';
                    ERFManager.addERF(module_obj.name, mod);
                  }
                  asyncLoop.next();
                });
              break;
              default:
                console.warn('GameInitializer.LoadLips', 'Encountered incorrect filetype', module_obj);
                asyncLoop.next();
              break;
            }
          }
        });
        loop.iterate(() => {
          resolve();
        });
      }).catch( (err) => {
        console.warn('GameInitializer.LoadLips', err);
        resolve();
      });
    });
  }

  static LoadModules(onSuccess?: Function){
    let data_dir = 'modules';
    LoadingScreen.main.SetMessage('Loading: Module Archives');

    GameFileSystem.readdir(data_dir).then( (filenames: string[]) => {
      let modules = filenames.map(function(file) {
        let filename = file.split(path.sep).pop();
        let args = filename.split('.');
        return {ext: args[1].toLowerCase(), name: args[0], filename: filename};
      }).filter(function(file_obj){
        return file_obj.ext == 'rim' || file_obj.ext == 'mod';
      });

      let loop = new AsyncLoop({
        array: modules,
        onLoop: (module_obj: any, asyncLoop: AsyncLoop) => {
          switch(module_obj.ext){
            case 'rim':
              const rim = new RIMObject(path.join(data_dir, module_obj.filename));
              rim.load().then((rim: RIMObject) => {
                if(rim instanceof RIMObject){
                  rim.group = 'Module';
                  RIMManager.addRIM(module_obj.name, rim);
                }
                asyncLoop.next();
              });
            break;
            case 'mod':
              const mod = new ERFObject(path.join(data_dir, module_obj.filename));
              mod.load().then((mod: ERFObject) => {
                if(mod instanceof ERFObject){
                  mod.group = 'Module';
                  ERFManager.addERF(module_obj.name, mod);
                }
                asyncLoop.next();
              });
            break;
            default:
              console.warn('GameInitializer.LoadModules', 'Encountered incorrect filetype', module_obj);
              asyncLoop.next();
            break;
          }
        }
      });
      loop.iterate(() => {
        GameInitializer.LoadLips().then( () => {
          if(typeof onSuccess === 'function')
            onSuccess();
        });
      });
    }).catch( (err) => {
      console.warn('GameInitializer.LoadModules', err);
      if(typeof onSuccess === 'function')
        onSuccess();
    });

  }

  static Load2DAs(onSuccess?: Function){
    LoadingScreen.main.SetMessage('Loading: 2DA\'s');
    TwoDAManager.Load2DATables(() => {
      AppearanceManager.Init();
      if(typeof onSuccess === 'function')
        onSuccess();
    });
  }

  static LoadTexturePacks(onSuccess?: Function){
    let data_dir = 'TexturePacks';

    GameFileSystem.readdir(data_dir).then( (filenames: string[]) => {
      let erfs = filenames.map(function(file) {
        let filename = file.split(path.sep).pop();
        let args = filename.split('.');
        return {ext: args[1].toLowerCase(), name: args[0], filename: filename};
      }).filter(function(file_obj){
        return file_obj.ext == 'erf';
      });

      let loop = new AsyncLoop({
        array: erfs,
        onLoop: (erf_obj: any, asyncLoop: AsyncLoop) => {
          const erf = new ERFObject(path.join(data_dir, erf_obj.filename));
          erf.load().then((erf: ERFObject) => {
            if(erf instanceof ERFObject){
              erf.group = 'Textures';
              ERFManager.addERF(erf_obj.name, erf);
            }
            asyncLoop.next();
          });
        }
      });
      loop.iterate(() => {
        if(typeof onSuccess === 'function')
          onSuccess();
      });
    }).catch( (err) => {
      if (err)
        console.warn('GameInitializer.LoadTexturePacks', err);

      if(typeof onSuccess === 'function')
        onSuccess();
    });
  }

  static LoadGameAudioResources( args: any = {} ){

    args = Object.assign({
      folder: null,
      name: null,
      onSuccess: null,
    }, args);

    //console.log('Searching For Audio Files', args);
    let dir: any = {name: args.folder, dirs: [], files: []};

    GameFileSystem.readdir(args.folder, {recursive: true}).then( (files) => {
      // Files is an array of filename
      GameInitializer.files = files;
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

      if(typeof args.onSuccess === 'function')
        args.onSuccess();
    }).catch( (e) => {
      if(typeof args.onSuccess === 'function')
        args.onSuccess();
    });
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
      if(!buffer && !buffer.length){ continue; }

      ResourceLoader.setCache(CacheScope.OVERRIDE, resId, _parsed.name.toLocaleLowerCase(), buffer);
    }
  }

}
