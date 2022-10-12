import { AsyncLoop } from "../utility/AsyncLoop";
import * as path from 'path';
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { ERFObject } from "../resource/ERFObject";

export class ERFManager {

  static ERFs: Map<string, ERFObject> = new Map();

  static Load( keyPaths: any[], onComplete: Function|undefined = undefined  ){
    let data_dir = path.join(ApplicationProfile.directory, 'modules');
    new AsyncLoop({
      array: keyPaths,
      onLoop: (erf_obj: any, asyncLoop: AsyncLoop) => {
        new ERFObject(path.join(data_dir, erf_obj.filename), (erf: ERFObject) => {
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
