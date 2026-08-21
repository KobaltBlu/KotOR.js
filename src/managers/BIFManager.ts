import { BIFObject } from "@/resource/BIFObject";
import { KEYObject } from "@/resource/KEYObject";
import { IBIFResource } from "@/interface/resource/IBIFResource";

/**
 * BIFManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BIFManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BIFManager {

  static bifs: Map<number, BIFObject> = new Map();
  static bifIndexes: Map<string, number> = new Map();

  static LoadBIFResource(resource: IBIFResource, onComplete?: Function){
    if(resource){
      const bif: BIFObject = BIFManager.bifs.get( KEYObject.getBIFIndex(resource.Id) )
      if(bif){
        bif.getResourceBuffer(resource).then( (buffer: Uint8Array) => {
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

  static Clear(): void {
    BIFManager.bifs.clear();
    BIFManager.bifIndexes.clear();
  }

  static FindByPath(archivePath: string): BIFObject | undefined {
    if(!archivePath){
      return undefined;
    }
    const normalized = String(archivePath).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
    const base = (normalized.split('/').pop() || normalized).replace(/\.[^.]+$/, '');
    const byName = BIFManager.GetBIFByName(base) || BIFManager.GetBIFByName(archivePath);
    if(byName){
      return byName;
    }
    for(const bif of BIFManager.bifs.values()){
      const p = String(bif.file || bif.resourceDiskInfo?.path || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
      if(p === normalized || p.endsWith('/' + normalized) || normalized.endsWith('/' + p)){
        return bif;
      }
    }
    return undefined;
  }

}