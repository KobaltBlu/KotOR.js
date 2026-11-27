import { AsyncLoop } from "@core/utility/AsyncLoop";
import * as path from 'path';
import { ERFObject } from "@core/resource/ERFObject";

/**
 * ERFManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ERFManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ERFManager {

  static ERFs: Map<string, ERFObject> = new Map();

  static addERF(name: string, erf: ERFObject){
    ERFManager.ERFs.set(name, erf);
  }

  static FindByPath(archivePath: string): ERFObject | undefined {
    if(!archivePath){
      return undefined;
    }
    const normalized = String(archivePath).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
    const base = (normalized.split('/').pop() || normalized).replace(/\.[^.]+$/, '');
    const byName = ERFManager.ERFs.get(base) || ERFManager.ERFs.get(path.parse(archivePath).name);
    if(byName){
      return byName;
    }
    for(const erf of ERFManager.ERFs.values()){
      const p = String(erf.resource_path || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
      if(p === normalized || p.endsWith('/' + normalized) || normalized.endsWith('/' + p)){
        return erf;
      }
    }
    return undefined;
  }

}
