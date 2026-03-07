import { RIMObject } from "../resource/RIMObject";
import { GameFileSystem } from "../utility/GameFileSystem";
import * as path from "path";

interface IRIMObject {
  ext: string;
  name: string;
  filename: string;
}

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

  static async Load(){
    
    try{
      const filenames = await GameFileSystem.readdir('rims');

      const rims: IRIMObject[] = filenames.map(function(file: string) {
        const filename = file.split(path.sep).pop();
        const args = filename.split('.');
        return {
          ext: args[1].toLowerCase(), 
          name: args[0], 
          filename: path.join('rims', filename)
        } as IRIMObject;
      }).filter(function(file_obj: any){
        return file_obj.ext == 'rim';
      });

      for(let i = 0, len = rims.length; i < len; i++){
        try{
          const rim = await RIMManager.LoadRIMObject(rims[i]);
          rim.group = 'RIMs';
        }catch(e){ 
          console.error(e);
        }
      }
    }catch(err){
      console.warn('RIMManager.Load', err);
    }

  }

  static async LoadRIMObject( rimObj: IRIMObject ){
    const rim = new RIMObject(rimObj.filename);
    await rim.load();
    RIMManager.RIMs.set(rimObj.name, rim);
    return rim;
  }

  static addRIM( name: string, rim: RIMObject ){
    RIMManager.RIMs.set(name, rim);
  }

}