import * as path from "path";
import * as fs from "fs";
import { ERFKeyEntry, ERFObject } from "./resource/ERFObject";
import { AsyncLoop } from "./utility/AsyncLoop";
import { ResourceTypes } from "./resource/ResourceTypes";
import { ApplicationProfile } from "./utility/ApplicationProfile";
import { GameFileSystem } from "./utility/GameFileSystem";

export class CurrentGame {
  static gameinprogress_dir = 'gameinprogress';

  static IsModuleSaved( name = '' ){
    return new Promise( (resolve, reject) => {
        GameFileSystem.readdir(CurrentGame.gameinprogress_dir).then( (files) => {
          for(let i = 0, len = files.length; i < len; i++){
            let file = files[i];
            let file_path = path.join( CurrentGame.gameinprogress_dir, file );
            let file_info = path.parse(file);
            let ext = file_info.ext.split('.').pop();
            if(file_info.name.toLowerCase() == name.toLowerCase()){
              resolve(true);
              return;
            }
          }
          resolve(false);
        }).catch( (e) => {
          resolve(false);
        });
    });  
  }

  static GetModuleRim( name = ''){

    return new Promise( async (resolve, reject) => {

      try{
        let buffer = await GameFileSystem.readFile( 
          path.join( CurrentGame.gameinprogress_dir, name.toLowerCase()+'.sav') 
        );
        new ERFObject(buffer, (rim: ERFObject) => {
          // console.log('CurrentGame', 'GetModuleRim', name, rim);
          resolve(rim);
        });
      }catch(err){
        // console.error('CurrentGame', 'GetModuleRim', name, e);
        reject(err);
      }
      
    });
  }

  static async ClearGameInProgressFolder(){
    return new Promise<void>( async (resolve, reject) => {
      if(await GameFileSystem.exists(CurrentGame.gameinprogress_dir)){
        GameFileSystem.rmdir(CurrentGame.gameinprogress_dir, { recursive: true }).then( () => {
          resolve();
        }).catch( (e) => {
          console.error(e);
          resolve();
        });
      }else{
        resolve();
      }
    });
  }

  static async InitGameInProgressFolder(){
    try{ 
      await CurrentGame.ClearGameInProgressFolder(); 
    }catch(e){
      console.error(e);
    }
    
    try{ 
      await GameFileSystem.mkdir(CurrentGame.gameinprogress_dir);
    }catch(e){
      console.error(e);
    }
  }

  static ExtractERFToGameInProgress( erf: ERFObject ){
    return new Promise<void>( (resolve, reject) => {
      if(erf instanceof ERFObject){
        let loop = new AsyncLoop({
          array: erf.KeyList,
          onLoop: (erf_key: ERFKeyEntry, asyncLoop: AsyncLoop) => {
            erf.exportRawResource( CurrentGame.gameinprogress_dir, erf_key.ResRef, erf_key.ResType, () => {
              asyncLoop.next();
            });
          }
        });
        loop.iterate(() => {
          resolve();
        });
      }else{
        resolve();
      }
    });
  }

  static ExportToSaveFolder( folder: string ){
    return new Promise( async (resolve, reject) => {
      let sav = new ERFObject();
      GameFileSystem.readdir(CurrentGame.gameinprogress_dir).then( (files) => {
        let loop = new AsyncLoop({
          array: files,
          onLoop: (file: string, asyncLoop: AsyncLoop) => {
            let file_path = path.join( CurrentGame.gameinprogress_dir, file );
            let file_info = path.parse(file);
            let ext = file_info.ext.split('.').pop();
            if(typeof ResourceTypes[ext] != 'undefined'){
              GameFileSystem.readFile( file_path).then( (data) => {
                sav.addResource(file_info.name, ResourceTypes[ext], data);
                asyncLoop.next();
              }).catch( (err) => {
                // console.log('ExportCurrentGameFolder', 'file open error', file, err);
                asyncLoop.next();
              });
            }else{
              // console.log('ExportCurrentGameFolder', 'Unhandled file', file);
              asyncLoop.next();
            }
          }
        });
        loop.iterate( async () => {
          await sav.export( path.join(folder, 'SAVEGAME.sav') );
          resolve(sav);
        });
      }).catch((e) => {
        console.error(e);
      });
    });
  }

}
