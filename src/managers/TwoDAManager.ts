import { ResourceLoader } from "../loaders/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TwoDAObject } from "../resource/TwoDAObject";
import { AsyncLoop } from "../utility/AsyncLoop";
import { KEYManager } from "./KEYManager";
import { IKEYEntry } from "../interface/resource/IKEYEntry";
import { IBIFResource } from "../interface/resource/IBIFResource";

/**
 * TwoDAManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TwoDAManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TwoDAManager {

  static datatables: Map<string, TwoDAObject> = new Map();

  static Load2DATables(onComplete?: Function){
    TwoDAManager.datatables = new Map();
    const resources: IBIFResource[] = KEYManager.Key.getFilesByResType(ResourceTypes['2da']);
    
    let key: IKEYEntry = undefined;
    let loop = new AsyncLoop({
      array: resources,
      onLoop: (resource: IBIFResource, asyncLoop: AsyncLoop) => {
        key = KEYManager.Key.getFileKeyByRes(resource);
        //Load 2da's with the resource loader so it can pick up ones in the override folder
        ResourceLoader.loadResource(ResourceTypes['2da'], key.resRef).then((d: Uint8Array) => {
          TwoDAManager.datatables.set(key.resRef, new TwoDAObject(d));
          asyncLoop.next();
        }).catch( (e) => {console.error(e); asyncLoop.next();});
      }
    });
    loop.iterate(() => {
      if(typeof onComplete === 'function')
        onComplete();
    });

  }

}