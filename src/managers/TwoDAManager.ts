import { BIFResource } from "../resource/BIFObject";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TwoDAObject } from "../resource/TwoDAObject";
import { AsyncLoop } from "../utility/AsyncLoop";
import { BIFManager } from "./BIFManager";
import { KEYManager } from "./KEYManager";

export class TwoDAManager {

  static datatables: Map<string, TwoDAObject> = new Map();

  static Load2DATables(onComplete: Function|undefined = undefined){
    TwoDAManager.datatables = new Map();
    const resources: BIFResource[] = KEYManager.Key.GetFilesByResType(ResourceTypes['2da']);
    
    let ResKey: any = undefined;
    let loop = new AsyncLoop({
      array: resources,
      onLoop: (resource: BIFResource, asyncLoop: AsyncLoop) => {
        ResKey = KEYManager.Key.GetFileKeyByRes(resource);
        //Load 2da's with the resource loader to it can pick up ones in the override folder
        ResourceLoader.loadResource(ResourceTypes['2da'], ResKey.ResRef, (d: Buffer) => {
          TwoDAManager.datatables.set(ResKey.ResRef, new TwoDAObject(d));
          asyncLoop.next();
        });
      }
    });
    loop.iterate(() => {
      if(typeof onComplete === 'function')
        onComplete();
    });

  }

}