import * as path from "path";
import * as fs from "fs";
import { ERFKeyEntry, ERFObject } from "./resource/ERFObject";
import { AsyncLoop } from "./utility/AsyncLoop";
import { ResourceTypes } from "./resource/ResourceTypes";
import { ApplicationProfile } from "./utility/ApplicationProfile";

export class CurrentGame {
  static gameinprogress_dir = path.join(ApplicationProfile.directory, 'gameinprogress');

  static IsModuleSaved( name = '' ){
    return new Promise( (resolve, reject) => {
      try{
        fs.readdir(CurrentGame.gameinprogress_dir, (err: any, files: any[] = []) => {
          for(let i = 0; i < files.length; i++){
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
        });
      }catch(e){
        resolve(false);
      }
    });  
  }

  static GetModuleRim( name = ''){

    return new Promise( (resolve, reject) => {
      fs.readFile( path.join( CurrentGame.gameinprogress_dir, name.toLowerCase()+'.sav'), (error, data) => {
        if(!error){
          new ERFObject(data, (rim: ERFObject) => {
            // console.log('CurrentGame', 'GetModuleRim', name, rim);
            resolve(rim);
          });
        }else{
          // console.error('CurrentGame', 'GetModuleRim', name, e);
          reject(error);
        }
      });
    });
  }

  static ClearGameInProgressFolder(){
    if(fs.existsSync(CurrentGame.gameinprogress_dir)){
      fs.rmdirSync(CurrentGame.gameinprogress_dir, { recursive: true });
    }
  }

  static InitGameInProgressFolder(){
    CurrentGame.ClearGameInProgressFolder();
    fs.mkdirSync(CurrentGame.gameinprogress_dir);
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
      fs.readdir(CurrentGame.gameinprogress_dir, async (err: any, files: string[]) => {
        let loop = new AsyncLoop({
          array: files,
          onLoop: (file: string, asyncLoop: AsyncLoop) => {
            let file_path = path.join( CurrentGame.gameinprogress_dir, file );
            let file_info = path.parse(file);
            let ext = file_info.ext.split('.').pop();
            if(typeof ResourceTypes[ext] != 'undefined'){
              fs.readFile( file_path, (error, data) => {
                if(!error){
                  sav.addResource(file_info.name, ResourceTypes[ext], data);
                  asyncLoop.next();
                }else{
                  // console.log('ExportCurrentGameFolder', 'file open error', file, error);
                  asyncLoop.next();
                }
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
      });
    });
  }

}

CurrentGame.ClearGameInProgressFolder();
