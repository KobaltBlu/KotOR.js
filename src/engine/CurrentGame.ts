import * as path from "path";
import { ERFObject } from "../resource/ERFObject";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { GameFileSystem } from "../utility/GameFileSystem";
import { ApplicationEnvironment } from "../enums/ApplicationEnvironment";
import { IERFKeyEntry } from "../interface/resource/IERFKeyEntry";

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
            const file = files[i];
            const file_path = path.join( CurrentGame.gameinprogress_dir, file );
            const file_info = path.parse(file);
            const ext = file_info.ext.split('.').pop();
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
        const buffer = await GameFileSystem.readFile( 
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
          const mkdir_response = await GameFileSystem.mkdir(CurrentGame.gameinprogress_dir);
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
            for await(const handle of directory_handle.values()){
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

  static async ExtractERFToGameInProgress( erf: ERFObject ){
    if(!(erf instanceof ERFObject)) return;
    await Promise.all(erf.keyList.map(async (erf_key) => {
      await erf.exportRawResource( CurrentGame.gameinprogress_dir, erf_key.resRef, erf_key.resType);
    }));
  }

  static async WriteFile( filename: string, buffer: Uint8Array){
    try{
      await GameFileSystem.writeFile(path.join(CurrentGame.gameinprogress_dir, filename), buffer);
    }catch(e){
      console.error(e);
    }
  }

  static async ExportToSaveFolder( folder: string ){
    const sav = new ERFObject();
    try{
      const files = await GameFileSystem.readdir(CurrentGame.gameinprogress_dir);
      for(let i = 0; i < files.length; i++){
        const file = files[i];
        const file_path = path.join( file );
        const file_info = path.parse(file);
        const ext = file_info.ext.split('.').pop();
        if(typeof ResourceTypes[ext] != 'undefined'){
          try{
            const data = await GameFileSystem.readFile( file_path);
            sav.addResource(file_info.name, ResourceTypes[ext], data);
          }catch(e){
            console.error(e);
          }
        }
      }
      await sav.export( path.join(folder, 'SAVEGAME.sav') );
    }catch(e){
      console.error(e);
    }
  }

}
