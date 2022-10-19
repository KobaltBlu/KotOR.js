import { TLKString } from "../resource/TLKString";
import { TLKObject } from "../resource/TLKObject";
import { GameFileSystem } from "../utility/GameFileSystem";

export class TLKManager {

  static TLKStrings: TLKString[] = [];
  static TLKObject: TLKObject;

  static async LoadTalkTable(onProgress?: Function){
    return new Promise<TLKObject>((resolve, reject) => {
      GameFileSystem.readFile('dialog.tlk').then((buffer) => {
        TLKManager.TLKObject = new TLKObject(undefined);
        TLKManager.TLKObject.LoadFromBuffer(buffer, (index: number = 0, count: number = 0) => {
          if(typeof onProgress === 'function') onProgress(index, count)
        }).then( () => {
          TLKManager.TLKStrings = TLKManager.TLKObject.TLKStrings;
          resolve(TLKManager.TLKObject);
        }).catch(() => {
          TLKManager.TLKStrings = TLKManager.TLKObject.TLKStrings;
          resolve(TLKManager.TLKObject);
        })
      }).catch((err) => {
        if(err){
          reject(undefined);
          return;
        }
      });
    })
  }

  static GetStringById(index: number = 0){
    return TLKManager.TLKStrings[index];
  }

}