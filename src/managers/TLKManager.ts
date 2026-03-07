import { TLKString } from "../resource/TLKString";
import { TLKObject } from "../resource/TLKObject";
import { GameFileSystem } from "../utility/GameFileSystem";

/**
 * TLKManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TLKManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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

  static Search(query: string) {
    return this.TLKStrings.filter( (str) => {
      return str.Value.indexOf(query) >= 0
    }).map( (str) => {
      return {
        index: this.TLKStrings.indexOf(str),
        text: str.Value
      };
    });
  }

}