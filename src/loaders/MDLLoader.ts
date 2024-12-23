import { BinaryReader } from "../BinaryReader";
import { OdysseyModel } from "../odyssey";
import { ResourceLoader } from "./ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";

export interface ModelCacheReference {
  model: OdysseyModel;
  // mdl: Uint8Array;
  // mdx: Uint8Array;
}

export interface ModelCacheInterface {
  models: Map<string, ModelCacheReference>
}

const ModelCache: ModelCacheInterface = {
  models: new Map<string, ModelCacheReference>()
};

/**
 * MDLLoader class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MDLLoader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MDLLoader {
  static loader = new MDLLoader();
  
	load (resref: string = ''): Promise<OdysseyModel> {
    resref = resref.toLocaleLowerCase();
    return new Promise<OdysseyModel>( (resolve, reject) => {
      try{
        if(ModelCache.models.has(resref)){
          const ref = ModelCache.models.get(resref);
          // const mdl = MDLLoader.MDLFromBuffer(ref.mdl, ref.mdx);
          resolve(ref.model);
        }else{
          ResourceLoader.loadResource(ResourceTypes['mdl'], resref).then((mdl_buffer: Uint8Array) => {
            ResourceLoader.loadResource(ResourceTypes['mdx'], resref).then((mdx_buffer: Uint8Array) => {
              const mdl = MDLLoader.MDLFromBuffer(mdl_buffer, mdx_buffer);

              ModelCache.models.set(resref, {
                model: mdl,
                // mdl: mdl_buffer,
                // mdx: mdx_buffer
              });

              resolve(mdl);
            }).catch( (e) => {
              console.error(e);
              console.error('MDX 404', resref);
              reject(e);
            });
          }).catch( (e) => {
            console.error(e);
            console.error('MDL 404', resref);
            reject(e);
          });
        }
      }catch(e: any){
        console.error('MDLLoader.load', resref, e);
        reject(e);
      }
    });
	}

  reset(){
    ModelCache.models.clear();
  }

  static MDLFromBuffer(mdl_buffer: Uint8Array, mdx_buffer: Uint8Array): OdysseyModel {
    let mdlReader = new BinaryReader(mdl_buffer);
    let mdxReader = new BinaryReader(mdx_buffer);
    return new OdysseyModel(mdlReader, mdxReader);
  }

}
