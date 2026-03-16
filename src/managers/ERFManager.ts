import * as path from 'path';

import { ERFObject } from "@/resource/ERFObject";
import { AsyncLoop } from "@/utility/AsyncLoop";

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

  static Load( keyPaths: any[], onComplete?: Function  ){
    let data_dir = 'modules';
    new AsyncLoop({
      array: keyPaths,
      onLoop: (erf_obj: any, asyncLoop: AsyncLoop) => {
        const erf = new ERFObject(path.join(data_dir, erf_obj.filename));
        erf.load().then((erf: ERFObject) => {
          if(erf instanceof ERFObject){
            erf.group = 'Modules';
            ERFManager.ERFs.set(erf_obj.name, erf);
          }
          asyncLoop.next();
        });
      }
    }).iterate(() => {
      if(typeof onComplete === 'function')
        onComplete();
    });
  }

  static addERF(name: string, erf: ERFObject){
    ERFManager.ERFs.set(name, erf);
  }

}
