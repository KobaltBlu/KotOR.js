import { ResourceLoader } from "@/loaders/ResourceLoader";
import { ResourceTypes } from "@/resource/ResourceTypes";
import { TwoDAObject } from "@/resource/TwoDAObject";
import { KEYManager } from "@/managers/KEYManager";
import { IBIFResource } from "@/interface/resource/IBIFResource";

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

  static async Load2DATables(){
    TwoDAManager.datatables = new Map();
    const resources: IBIFResource[] = KEYManager.Key.getFilesByResType(ResourceTypes['2da']);
    
    await Promise.all(resources.map(async (res) => {
      const key = KEYManager.Key.getFileKeyByRes(res);
      if(!key) return;
      //Load 2da's with the resource loader so it can pick up ones in the override folder
      try{
        const d = await ResourceLoader.loadResource(ResourceTypes['2da'], key.resRef);
        TwoDAManager.datatables.set(key.resRef, new TwoDAObject(d));
      }catch(e){
        console.error(e);
      }
    }));

  }

}