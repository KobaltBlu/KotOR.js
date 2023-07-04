/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { BinaryReader } from "../BinaryReader";
import { OdysseyModel } from "../odyssey";
import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";

/* @file
 * The MDLLoader is used for loading MDL/MDX files from the game archives
 */

export interface ModelCacheReference {
  model: OdysseyModel;
  // mdl: Buffer;
  // mdx: Buffer;
}

export interface ModelCacheInterface {
  models: Map<string, ModelCacheReference>
}

const ModelCache: ModelCacheInterface = {
  models: new Map<string, ModelCacheReference>()
};

export class MDLLoader {
	load (resref: string = ''): Promise<OdysseyModel> {
    resref = resref.toLocaleLowerCase();
    return new Promise<OdysseyModel>( (resolve, reject) => {
      try{
        if(ModelCache.models.has(resref)){
          const ref = ModelCache.models.get(resref);
          // const mdl = MDLLoader.MDLFromBuffer(ref.mdl, ref.mdx);
          resolve(ref.model);
        }else{
          ResourceLoader.loadResource(ResourceTypes['mdl'], resref, (mdl_buffer: Buffer) => {
            ResourceLoader.loadResource(ResourceTypes['mdx'], resref, (mdx_buffer: Buffer) => {
              const mdl = MDLLoader.MDLFromBuffer(mdl_buffer, mdx_buffer);

              ModelCache.models.set(resref, {
                model: mdl,
                // mdl: mdl_buffer,
                // mdx: mdx_buffer
              });

              resolve(mdl);
            }, (e: any) => {
              console.error('MDX 404', resref);
              reject(e);
            })
          }, (e: any) => {
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

  static MDLFromBuffer(mdl_buffer: Buffer, mdx_buffer: Buffer): OdysseyModel {
    let mdlReader = new BinaryReader(mdl_buffer);
    let mdxReader = new BinaryReader(mdx_buffer);
    return new OdysseyModel(mdlReader, mdxReader);
  }

}
