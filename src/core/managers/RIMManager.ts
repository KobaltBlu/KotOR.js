import { RIMObject } from "@core/resource/RIMObject";
import { GameFileSystem } from "@core/filesystem/GameFileSystem";
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

      await Promise.all(rims.map(async (rimObj) => {
        try{
          const rim = await RIMManager.LoadRIMObject(rimObj);
          rim.group = 'RIMs';
        }catch(e){
          console.error(e);
        }
      }));
    }catch(err){
      console.warn('RIMManager.Load', err);
    }

  }

  static async LoadRIMObject( rimObj: IRIMObject ){
    const rim = new RIMObject(rimObj.filename);
    await rim.load();
    RIMManager.addRIM(rimObj.name, rim);
    return rim;
  }

  static addRIM( name: string, rim: RIMObject ){
    RIMManager.RIMs.set(name, rim);
  }

  static FindByPath(archivePath: string): RIMObject | undefined {
    if(!archivePath){
      return undefined;
    }
    const normalized = String(archivePath).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
    const base = (normalized.split('/').pop() || normalized).replace(/\.[^.]+$/, '');
    const byName = RIMManager.RIMs.get(base) || RIMManager.RIMs.get(path.parse(archivePath).name);
    if(byName){
      return byName;
    }
    for(const rim of RIMManager.RIMs.values()){
      const p = String(rim.resource_path || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
      if(p === normalized || p.endsWith('/' + normalized) || normalized.endsWith('/' + p)){
        return rim;
      }
    }
    return undefined;
  }

}