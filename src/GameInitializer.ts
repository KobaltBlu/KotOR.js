/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
*/

import * as path from "path";
import { GameState } from "./GameState";
import { LoadingScreen } from "./LoadingScreen";
import { ERFObject } from "./resource/ERFObject";
import { ResourceTypes } from "./resource/ResourceTypes";
import { RIMObject } from "./resource/RIMObject";
import { ApplicationProfile } from "./utility/ApplicationProfile";
import { AsyncLoop } from "./utility/AsyncLoop";
import { GameFileSystem } from "./utility/GameFileSystem";
import { GamePad, KeyMapper } from "./controls";
import { CurrentGame } from "./CurrentGame";
import { ConfigClient } from "./utility/ConfigClient";
import { KEYManager, JournalManager, TLKManager, RIMManager, ERFManager, TwoDAManager, AppearanceManager } from "./managers";
import { ResourceLoader } from "./loaders";

/* @file
* The GameInitializer class. Handles the loading of game archives for use later during runtime
*/

export class GameInitializer {

  static currentGame: any;
  static files: string[] = [];

  static Init(props: any){

    props = Object.assign({
      game: null,
      onLoad: null,
      onError: null
    }, props);

    ResourceLoader.InitCache();

    CurrentGame.CleanGameInProgressFolder().then( () => {
      if(GameInitializer.currentGame != props.game){
        GameInitializer.currentGame = props.game;

        ConfigClient.Init().then( () => {
        
          LoadingScreen.main.SetMessage("Loading Keys");
          KEYManager.Load('chitin.key', async () => {
            await ResourceLoader.InitGlobalCache();
            LoadingScreen.main.SetMessage("Loading Game Resources");
            GameInitializer.LoadGameResources( () => {
              //Load JRL File
              LoadingScreen.main.SetMessage("Loading JRL File");
              JournalManager.LoadJournal().then( () => {
                //Load TLK File
                LoadingScreen.main.SetMessage("Loading TLK File");
                TLKManager.LoadTalkTable().then( () => {
                  KeyMapper.Init();
                  GamePad.Init();
                  if(typeof props.onLoad === 'function'){
                    props.onLoad();
                  }
                })
              });
            });
          });

        });

      }else{
        if(props.onLoad != null)
          props.onLoad();
      }
    });

  }

  static LoadGameResources(onSuccess?: Function){

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
                    if(GameState.GameKey != 'TSL'){
                      GameInitializer.LoadGameAudioResources( {
                        folder: 'streamwaves',
                        name: 'StreamWaves',
                        onSuccess: () => {

                          if(onSuccess != null)
                            onSuccess();
                        }
                      });
                    }else{
                      GameInitializer.LoadGameAudioResources( {
                        folder: 'streamvoice',
                        name: 'StreamSounds',
                        onSuccess: () => {

                          if(onSuccess != null)
                            onSuccess();
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


  }

  static LoadRIMs(onSuccess?: Function){
    if(GameState.GameKey != 'TSL'){
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
                new ERFObject(path.join(data_dir, module_obj.filename), (mod: ERFObject) => {
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
              new RIMObject(path.join(data_dir, module_obj.filename), (rim: RIMObject) => {
                if(rim instanceof RIMObject){
                  rim.group = 'Module';
                  RIMManager.addRIM(module_obj.name, rim);
                }
                asyncLoop.next();
              });
            break;
            case 'mod':
              new ERFObject(path.join(data_dir, module_obj.filename), (mod: ERFObject) => {
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
          new ERFObject(path.join(data_dir, erf_obj.filename), (erf: ERFObject) => {
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

}
