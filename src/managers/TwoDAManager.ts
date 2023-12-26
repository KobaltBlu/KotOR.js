import { BIFResource } from "../resource/BIFObject";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TwoDAObject } from "../resource/TwoDAObject";
import { AsyncLoop } from "../utility/AsyncLoop";
import { KEYManager } from "./KEYManager";
import { KEY } from "../resource/KEYObject";

export class TwoDAManager {

  static datatables: Map<string, TwoDAObject> = new Map();

  static Load2DATables(onComplete?: Function){
    TwoDAManager.datatables = new Map();
    const resources: BIFResource[] = KEYManager.Key.getFilesByResType(ResourceTypes['2da']);
    
    let key: KEY = undefined;
    let loop = new AsyncLoop({
      array: resources,
      onLoop: (resource: BIFResource, asyncLoop: AsyncLoop) => {
        key = KEYManager.Key.getFileKeyByRes(resource);
        //Load 2da's with the resource loader so it can pick up ones in the override folder
        ResourceLoader.loadResource(ResourceTypes['2da'], key.resRef).then((d: Buffer) => {
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