import { BIFObject, BIFResource } from "../resource/BIFObject";
import { KEYObject } from "../resource/KEYObject";

export class BIFManager {

  static bifs: Map<number, BIFObject> = new Map();
  static bifIndexes: Map<string, number> = new Map();

  static Load(onComplete?: Function){

  }

  static LoadBIFResource(resource: BIFResource, onComplete?: Function){
    if(resource){
      const bif: BIFObject = BIFManager.bifs.get( KEYObject.getBIFIndex(resource.Id) )
      if(bif){
        bif.getResourceBuffer(resource).then( (buffer: Buffer) => {
          if(typeof onComplete === 'function'){
            onComplete(buffer);
          }
        });
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