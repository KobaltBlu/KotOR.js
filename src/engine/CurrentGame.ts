import * as path from "path";
import { ERFObject } from "@/resource/ERFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { ApplicationProfile } from "@/utility/ApplicationProfile";
import { GameFileSystem } from "@/utility/GameFileSystem";
import { ApplicationEnvironment } from "@/enums/ApplicationEnvironment";
import { IERFKeyEntry } from "@/interface/resource/IERFKeyEntry";
import { GFFObject } from "@/resource/GFFObject";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { GFFField } from "@/resource/GFFField";
import { isUsableDirectoryHandle } from "@/utility/gameDirectoryAccess";

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
            let file_info = path.parse(file);
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
          if(isUsableDirectoryHandle(directory_handle)){
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
        return true;
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

  /**
   * Retail StallEventSaveGame packs GAMEINPROGRESS with Mod_IsSaveGame=1 on every module.
   * Mid-transition module.sav files may still have 0 — patch before packing SAVEGAME.sav.
   */
  static async markModulesAsSaveGame(){
    try{
      // readdir returns paths relative to ApplicationProfile.directory (e.g. gameinprogress/x.sav)
      const files = await GameFileSystem.readdir(CurrentGame.gameinprogress_dir);
      for(let i = 0; i < files.length; i++){
        const file_path = files[i];
        const file_info = path.parse(file_path);
        if((file_info.ext || '').toLowerCase() !== '.sav') continue;
        try{
          // Load full file into memory so resource payloads survive rebuild/export
          const data = await GameFileSystem.readFile(file_path);
          const moduleErf = new ERFObject(data);
          await moduleErf.load();
          await moduleErf.loadAllResourceData();
          const ifoBuf = await moduleErf.getResourceBufferByResRef('module', ResourceTypes.ifo);
          if(!ifoBuf?.byteLength) continue;
          const ifo = new GFFObject(ifoBuf);
          if(ifo.RootNode.hasField('Mod_IsSaveGame')){
            ifo.RootNode.getFieldByLabel('Mod_IsSaveGame').setValue(1);
          }else{
            ifo.RootNode.addField(new GFFField(GFFDataType.BYTE, 'Mod_IsSaveGame')).setValue(1);
          }
          // Replaces existing module.ifo in-place (does not duplicate the key)
          moduleErf.addResource('module', ResourceTypes.ifo, ifo.getExportBuffer());
          await moduleErf.export(file_path);
        }catch(e){
          console.warn('CurrentGame.markModulesAsSaveGame', file_path, e);
        }
      }
    }catch(e){
      console.error(e);
    }
  }

  static async ExportToSaveFolder( folder: string ){
    await CurrentGame.markModulesAsSaveGame();
    let sav = new ERFObject();
    // Retail CERFFile create path uses "MOD V1.0"
    sav.header.fileType = 'MOD ';
    sav.header.fileVersion = 'V1.0';
    try{
      // readdir returns paths relative to ApplicationProfile.directory (e.g. gameinprogress/x.sav)
      const files = await GameFileSystem.readdir(CurrentGame.gameinprogress_dir);
      for(let i = 0; i < files.length; i++){
        const file_path = files[i];
        const file_info = path.parse(file_path);
        const ext = (file_info.ext || '').replace(/^\./, '').toLowerCase();
        if(typeof ResourceTypes[ext] == 'undefined') continue;
        try{
          const data = await GameFileSystem.readFile(file_path);
          if(!data?.byteLength){
            console.warn('CurrentGame.ExportToSaveFolder: skipping empty file', file_path);
            continue;
          }
          // Retail inventory resource is lowercase inventory.res
          const resName = file_info.name.toLowerCase() === 'inventory' ? 'inventory' : file_info.name.toLowerCase();
          sav.addResource(resName, ResourceTypes[ext], data);
        }catch(e){
          console.error('CurrentGame.ExportToSaveFolder', file_path, e);
        }
      }
      if(!sav.keyList.length){
        console.error('CurrentGame.ExportToSaveFolder: gameinprogress produced 0 resources — SAVEGAME.sav would be empty');
      }else{
        console.log('CurrentGame.ExportToSaveFolder: packing', sav.keyList.length, 'resources into SAVEGAME.sav');
      }
      await sav.export( path.join(folder, 'SAVEGAME.sav') );
    }catch(e){
      console.error(e);
    }
  }

}
