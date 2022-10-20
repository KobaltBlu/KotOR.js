/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { BinaryReader } from "../BinaryReader";
import { OdysseyModel } from "../odyssey";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";

/* @file
 * The MDLLoader is used for loading MDL/MDX files from the game archives
 */

const ModelCache: any = {
  models: {}
};

export class MDLLoader {

	load ( args: any ): any {

    args = Object.assign({
      file: null,
      options: null,
      onLoad: null,
      onError: null
    }, args);

    let isLocal = false;

    try{
      isLocal = false;//fs.lstatSync(args.file).isFile();
    }catch(e){}

    //Arg3 used to be isLocal this is included for backwards compatibility for charCode
    //that was using isLocal instead of args.onError
    if(args.onError === true)
      isLocal = false;

    if(ModelCache.models.hasOwnProperty(args.file)){
      if(typeof args.onLoad == 'function')
        args.onLoad(ModelCache.models[args.file]);

    }else{

      if(!isLocal){

        try{

          ResourceLoader.loadResource(ResourceTypes['mdl'], args.file, (mdlData: Buffer) => {
            ResourceLoader.loadResource(ResourceTypes['mdx'], args.file, (mdxData: Buffer) => {

              let mdlReader = new BinaryReader(mdlData);
              let mdxReader = new BinaryReader(mdxData);

              let odysseyModel = new OdysseyModel(mdlReader, mdxReader);
              ModelCache.models[args.file] = odysseyModel;
              if(typeof args.onLoad == 'function')
                args.onLoad(odysseyModel);
            }, (e: any) => {
              console.error('MDX 404', args.file);
              if(args.onError != null && typeof args.onError === 'function')
                args.onError(e)
            })
          }, (e: any) => {
            console.error('MDL 404', args.file);
            if(args.onError != null && typeof args.onError === 'function')
              args.onError(e)
          });

        }catch(e){
          console.error('MDLLoader.load', args.file, e);
          if(args.onError != null && typeof args.onError === 'function')
            args.onError(e)
        }

      }else{
        // this.loadLocal(args.file, args.onLoad, null, args.onError);
      }

    }

    return null;

	}

  loadAsync( resref: string ){
    return new Promise<OdysseyModel>( (resolve, reject) => {
      this.load({
        file: resref,
        onLoad: (model: OdysseyModel) => {
          resolve(model);
        },
        onError: () => {
          resolve(undefined);
        }
      })
    })
  }

}
