import * as path from "path";
import { ERFObject } from "./resource/ERFObject";
import { AsyncLoop } from "./utility/AsyncLoop";
import { ResourceTypes } from "./resource/ResourceTypes";
import { ApplicationProfile } from "./utility/ApplicationProfile";
import { GameFileSystem } from "./utility/GameFileSystem";
import { ApplicationEnvironment } from "./enums/ApplicationEnvironment";
import { IERFKeyEntry } from "./interface/resource/IERFKeyEntry";

/**
 * CurrentGame class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CurrentGame.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
        const erf = new ERFObject(buffer);
        erf.load().then( (rim: ERFObject) => {
          // console.log('CurrentGame', 'GetModuleRim', name, rim);
          resolve(rim);
        });
      }catch(err){
        // console.error('CurrentGame', 'GetModuleRim', name, e);
        reject(err);
      }
      
    });
  }

  static async CleanGameInProgressFolder(create: boolean = true): Promise<boolean> {
    console.log(`CurrentGame.CleanGameInProgressFolder`, `Cleaning...`);
    try{
      if(ApplicationProfile.ENV == ApplicationEnvironment.ELECTRON){
        console.log(`CurrentGame.CleanGameInProgressFolder`, `Mode: ELECTRON`);
        let rm_response: boolean;
        if(await GameFileSystem.exists(CurrentGame.gameinprogress_dir)){
          rm_response = await GameFileSystem.rmdir(CurrentGame.gameinprogress_dir, { recursive: true });
          console.log(
            `CurrentGame.CleanGameInProgressFolder`, 
            `rmdir ${CurrentGame.gameinprogress_dir} - [${rm_response ? 'success' : 'fail'}]`
          );
        }
        
        if(create){
          let mkdir_response = await GameFileSystem.mkdir(CurrentGame.gameinprogress_dir);
          console.log(
            `CurrentGame.CleanGameInProgressFolder`, 
            `mkdir ${CurrentGame.gameinprogress_dir} - [${mkdir_response ? 'success' : 'fail'}]`
          );
          return rm_response && mkdir_response;
        }

        return rm_response;
      }else{
        console.log(`CurrentGame.CleanGameInProgressFolder`, `Mode: BROWSER`);
        try{
          const directory_handle = await GameFileSystem.opendir_web(CurrentGame.gameinprogress_dir);
          if(directory_handle instanceof FileSystemDirectoryHandle){
            for await(let handle of directory_handle.values()){
              if(handle.kind == 'file'){
                await directory_handle.removeEntry(handle.name);
              }
            }
          }else if(create){
            const directory_handle = await ApplicationProfile.directoryHandle.getDirectoryHandle(CurrentGame.gameinprogress_dir, { create: true });
            console.log('exists', directory_handle);
          }
        }catch(e){
          console.error(e);
          if(create){
            const directory_handle = await ApplicationProfile.directoryHandle.getDirectoryHandle(CurrentGame.gameinprogress_dir, { create: true });
            console.log('exists', directory_handle);
          }
        }
      }
    }catch(e){
      console.log(`CurrentGame.CleanGameInProgressFolder`, `Failed due to exception`);
      console.error(e);
      return false
    }
  }

  static async InitGameInProgressFolder(create: boolean = false): Promise<boolean> {
    try{ 
      await CurrentGame.CleanGameInProgressFolder(create); 
      return true;
    }catch(e){
      console.error(e);
      return false;
    }
  }

  static ExtractERFToGameInProgress( erf: ERFObject ){
    return new Promise<void>( (resolve, reject) => {
      if(erf instanceof ERFObject){
        let loop = new AsyncLoop({
          array: erf.keyList,
          onLoop: (erf_key: IERFKeyEntry, asyncLoop: AsyncLoop) => {
            erf.exportRawResource( CurrentGame.gameinprogress_dir, erf_key.resRef, erf_key.resType).then(() => {
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

  static async WriteFile( filename: string, buffer: Uint8Array){
    try{
      await GameFileSystem.writeFile(path.join(CurrentGame.gameinprogress_dir, filename), buffer);
    }catch(e){
      console.error(e);
    }
  }

  static ExportToSaveFolder( folder: string ){
    return new Promise( async (resolve, reject) => {
      let sav = new ERFObject();
      GameFileSystem.readdir(CurrentGame.gameinprogress_dir).then( (files) => {
        let loop = new AsyncLoop({
          array: files,
          onLoop: (file: string, asyncLoop: AsyncLoop) => {
            let file_path = path.join( file );
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
