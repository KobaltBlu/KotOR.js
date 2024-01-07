import { RIMObject } from "../resource/RIMObject";
import { GameFileSystem } from "../utility/GameFileSystem";
import * as path from "path";

/**
 * RIMManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file RIMManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class RIMManager {

  static RIMs: Map<string, RIMObject> = new Map();

  static Load( ){
    
    return new Promise<void>( async (resolve, reject) => {

      try{
        const filenames = await GameFileSystem.readdir('rims');

        let rims: any[] = filenames.map(function(file: string) {
          let filename = file.split(path.sep).pop();
          let args = filename.split('.');
          return {
            ext: args[1].toLowerCase(), 
            name: args[0], 
            filename: path.join('rims', filename)
          } as any;
        }).filter(function(file_obj: any){
          return file_obj.ext == 'rim';
        });

        for(let i = 0, len = rims.length; i < len; i++){
          try{
            let rim = await RIMManager.LoadRIMObject(rims[i]);
            rim.group = 'RIMs';
          }catch(e){ 
            console.error(e);
          }
        }
        resolve();
      }catch(err){
        console.warn('GameInitializer.LoadRIMs', err);
        resolve();
      }
      
    });

  }

  static LoadRIMObject( rimObj: any ){
    //{ext: args[1].toLowerCase(), name: args[0], filename: filename}
    return new Promise<RIMObject>( async (resolve, reject) => {
      const rim = new RIMObject(rimObj.filename);
      rim.load().then( (rim: RIMObject) => {
        RIMManager.RIMs.set(rimObj.name, rim);
        resolve(rim);
      }, (err: any) => {
        reject(err);
      })
    });
  }

  static addRIM( name: string, rim: RIMObject ){
    RIMManager.RIMs.set(name, rim);
  }

}