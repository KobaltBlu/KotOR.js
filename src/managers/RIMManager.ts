import * as path from "path";

import { RIMObject } from "../resource/RIMObject";
import { GameFileSystem } from "../utility/GameFileSystem";
import { createScopedLogger, LogScope } from "../utility/Logger";

const log = createScopedLogger(LogScope.Manager);

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

  private constructor() {
    // Static-only class.
  }

  static RIMs: Map<string, RIMObject> = new Map();

  static async Load(){
    log.trace('RIMManager.Load() entered');
    try{
      const filenames = await GameFileSystem.readdir('rims');
      log.debug('RIMManager.Load() readdir rims count=%s', String(filenames?.length ?? 0));

      const rims: IRIMObject[] = filenames.map(function(file: string) {
        const filename = file.split(path.sep).pop() ?? file;
        const args = filename.split('.');
        return {
          ext: (args[1] ?? '').toLowerCase(),
          name: args[0] ?? '',
          filename: path.join('rims', filename)
        } as IRIMObject;
      }).filter((file_obj: IRIMObject) => file_obj.ext === 'rim');

      log.info('RIMManager.Load() loading %s RIM(s)', String(rims.length));
      for(let i = 0, len = rims.length; i < len; i++){
        try{
          log.trace('RIMManager.Load() loading RIM %s', rims[i].name ?? rims[i].filename);
          const rim = await RIMManager.LoadRIMObject(rims[i]);
          rim.group = 'RIMs';
        }catch(e){ 
          log.error('RIMManager.Load failed for %s', rims[i].name ?? rims[i].filename, e as Error);
        }
      }
    }catch(err){
      log.warn('RIMManager.Load failed', err);
    }
    log.trace('RIMManager.Load() completed');
  }

  static async LoadRIMObject( rimObj: IRIMObject ){
    log.trace('LoadRIMObject filename=%s', rimObj.filename);
    const rim = new RIMObject(rimObj.filename);
    await rim.load();
    RIMManager.RIMs.set(rimObj.name, rim);
    log.debug('LoadRIMObject loaded name=%s', rimObj.name);
    return rim;
  }

  static addRIM( name: string, rim: RIMObject ){
    log.trace('addRIM name=%s', name);
    RIMManager.RIMs.set(name, rim);
  }

}