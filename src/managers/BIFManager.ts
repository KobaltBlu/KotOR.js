import { BIFObject, BIFResource } from "../resource/BIFObject";
import { KEYObject } from "../resource/KEYObject";
import { KEYManager } from "./KEYManager";

export class BIFManager {

  static bifs: Map<number, BIFObject> = new Map();
  static bifIndexes: Map<string, number> = new Map();

  static Load(onComplete?: Function){

  }

  static LoadBIFResource(resource: BIFResource, onComplete: Function|undefined = undefined){
    if(resource){
      const bif: BIFObject = BIFManager.bifs.get( KEYObject.GetBIFIndex(resource.ID) )
      if(bif){
        bif.GetResourceData(resource, onComplete);
        return;
      }
    }

    if(typeof onComplete === 'function')
      onComplete(undefined);
  }

  static GetBIFByName(name: string): BIFObject{
    return BIFManager.bifs.get(BIFManager.bifIndexes.get(name));
  }

}