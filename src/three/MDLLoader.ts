/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as fs from "fs";
import * as path from "path";
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
      isLocal = fs.lstatSync(args.file).isFile();
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

  loadSync( args: any ) {

    args = Object.assign({
      file: null,
      options: null
    }, args);

    let name = args.file;

    let isLocal = false;

    if(ModelCache.models.hasOwnProperty(args.file)){
      //console.log('Loading model from cache');
      let cache = ModelCache.models[args.file];
      return cache;

    }else{

      if(!isLocal){

        try{

          let mdlBuffer = ResourceLoader.loadResourceSync(ResourceTypes['mdl'], args.file);
          let mdxBuffer = ResourceLoader.loadResourceSync(ResourceTypes['mdx'], args.file);

          if(mdlBuffer){
            if(mdxBuffer){

              let mdlData2 = Buffer.alloc(mdlBuffer.length);
              mdlBuffer.copy(mdlData2);

              let mdxData2 = Buffer.alloc(mdxBuffer.length);
              mdxBuffer.copy(mdxData2);
          
              let mdlReader = new BinaryReader(mdlData2);
              let mdxReader = new BinaryReader(mdxData2);

              let odysseyModel = new OdysseyModel(mdlReader, mdxReader);
              ModelCache.models[args.file] = {mdlData: mdlBuffer, mdxData: mdxBuffer};
              return odysseyModel;
            } else {
              console.error('MDX 404', args.file);
              throw 'Model MDX 404: '+args.file;
            }
          } else {
            console.error('MDL 404', args.file);
            throw 'Model MDL 404: '+args.file;
          }

        }catch(e){
          return e;
        }

      }else{
        throw 'Model 404 Local file not supported: '+args.file;
        return null;
      }

    }

    throw 'Model 404 nothing found: '+args.file;

    return null;

	}

}
