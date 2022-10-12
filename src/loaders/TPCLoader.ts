/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import * as THREE from "three";
import { TPCObject } from "../resource/TPCObject";
import * as path from "path";
import * as fs from "fs";
import { TextureLoader } from "./TextureLoader";
import { KEYManager } from "../managers/KEYManager";
import { ERFManager } from "../managers/ERFManager";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ApplicationProfile } from "../utility/ApplicationProfile";

/* @file
 * The THREE.TPCLoader class is used to decode the TPC image format found in the game archives.
 */

export const PixelFormat = {
  R8G8B8 : 1,
  B8G8R8 : 2,
  R8G8B8A8 : 3,
  B8G8R8A8 : 4,
  A1R5G5B5 : 5,
  R5G6B5 : 6,
  Depth16 : 7,
  DXT1 : 8,
  DXT3 : 9,
  DXT5 : 10
};

export const encodingGray = 0x01;
export const encodingRGB = 0x02;
export const encodingRGBA = 0x04;
export const encodingBGRA = 0x0C;

export const TPCHeaderLength = 128;

//THREE.CompressedTextureLoader
export class TPCLoader {
	manager: THREE.LoadingManager;

	constructor( manager: THREE.LoadingManager = undefined ){
		this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
	}

  loadFromArchive( archive: string, tex: string, onComplete?: Function, onError?: Function ){
    let resKey = ERFManager.ERFs.get(archive).getResourceByKey(tex, ResourceTypes['tpc']);
    if(resKey instanceof Object){
  
      if (typeof onComplete === 'function') {
        ERFManager.ERFs.get(archive).getRawResource(tex, ResourceTypes['tpc'], (buffer: Buffer) => {
          onComplete(
            new TPCObject({
              filename: tex,
              file: buffer
            })
          );
        });
      }
  
      return;
    }
  
    if (typeof onError === 'function') {
      onError('TPC not found in game archive '+archive+'.erf!');
    }
  
  }
  
  findTPC( tex: string, onComplete?: Function, onError?: Function ){
  
    tex = tex.toLocaleLowerCase();
  
    let erfResource = ERFManager.ERFs.get('swpc_tex_gui').getResourceByKey(tex, ResourceTypes['tpc']);
    if(erfResource){
      if (typeof onComplete === 'function') {
        ERFManager.ERFs.get('swpc_tex_gui').getRawResource(tex, ResourceTypes['tpc'], (buffer: Buffer) => {
          onComplete(buffer, 0);
        });
      }
      return;
    }
  
    let activeTexturePack;
    switch(TextureLoader.TextureQuality){
      case 2:
        activeTexturePack = ERFManager.ERFs.get('swpc_tex_tpa');
      break;
      case 1:
        activeTexturePack = ERFManager.ERFs.get('swpc_tex_tpb');
      break;
      case 0:
        activeTexturePack = ERFManager.ERFs.get('swpc_tex_tpc');
      break;
      default:
        activeTexturePack = ERFManager.ERFs.get('swpc_tex_tpa');
      break;
    }
  
    erfResource = activeTexturePack.getResourceByKey(tex, ResourceTypes['tpc']);
    if(erfResource){
  
      if (typeof onComplete === 'function') {
        activeTexturePack.getRawResource(tex, ResourceTypes['tpc'], (buffer: Buffer) => {
          onComplete(buffer, TextureLoader.TextureQuality || 2);
        });
      }
  
      return;
    }
  
    /*resKey = Global.kotorERF.swpc_tex_tpb.getResourceByKey(tex, ResourceTypes['tpc']);
    if(resKey){
  
      if (typeof onComplete === 'function') {
        Global.kotorERF.swpc_tex_tpb.getRawResource(resKey, (buffer) => {
          onComplete(buffer, 2);
        });
      }
  
      return;
    }
  
    resKey = Global.kotorERF.swpc_tex_tpc.getResourceByKey(tex, ResourceTypes['tpc']);
    if(resKey){
  
      if (typeof onComplete === 'function') {
        Global.kotorERF.swpc_tex_tpc.getRawResource(resKey, (buffer) => {
          onComplete(buffer, 3);
        });
      }
  
      return;
    }*/
  
    //Check in BIF files
  
    let resKey = KEYManager.Key.GetFileKey(tex, ResourceTypes['tpc']);
    if(resKey){
  
      if (typeof onComplete === 'function') {
        KEYManager.Key.GetFileData( resKey, (buffer: Buffer) => {
          onComplete(buffer);
        });
      }
  
      return;
    }
  
  
    if (typeof onError === 'function') {
      onError('TPC not found in game resources!');
    }
  
  }
  
  fetch( url = '', onLoad?: Function, onProgress?: Function, onError?: Function ) {
  
    if ( Array.isArray( url ) ) {
      let loaded = 0;
      for ( let i = 0, il = url.length; i < il; i++ )
        this.loadTexture(url[i], onLoad = onLoad, onProgress = onProgress, onError = onError);
    } else {
      this.loadTexture(url, onLoad = onLoad, onProgress = onProgress, onError = onError);
    }
  
    //return this.texture;
  
  };
  
  loadTexture = function(texName: string, onLoad?: Function, onProgress?: Function, onError?: Function ){
    // compressed cubemap texture stored in a single DDS file
    //console.log('Texture', texName);
  
    this.findTPC(texName, (buffer: Buffer, pack: number) => {
  
      let tpc = new TPCObject({
        filename: texName,
        file: buffer,
        pack: pack,
      });
  
      let texture = tpc.toCompressedTexture();
      //console.log("loaded texture", texName);
  
      if ( typeof onLoad === 'function' ) onLoad( texture );
    }, () => {
      if ( typeof onLoad === 'function' ) onLoad( null );
    });
  }
  
  fetch_override( name = '', onLoad?: Function, onProgress?: Function, onError?: Function ) {
    
    let dir = path.join(ApplicationProfile.directory, 'Override');
  
    fs.readFile(path.join(dir, name)+'.tpc', (err, buffer) => {
      if (err) throw err; // Fail if the file can't be read.
  
      let tpc = new TPCObject({
        filename: name,
        file: buffer
      });
  
      let texture = tpc.toCompressedTexture();

      if ( typeof onLoad === 'function' ) onLoad( texture );
  
    });
  
  };
  
  fetch_local( name = '', onLoad?: Function, onProgress?: Function, onError?: Function ) {
  
    let file_info = path.parse(name);
    if(file_info.ext == '.tpc'){
      fs.readFile(name, (err, buffer) => {
        if (err) throw err; // Fail if the file can't be read.
  
        let tpc = new TPCObject({
          filename: file_info.name,
          file: buffer
        });
  
        let texture = tpc.toCompressedTexture();
        //console.log("loaded texture", texName);
  
        if ( typeof onLoad === 'function' ) onLoad( texture );
  
      });
    }else{
      onError('Unsupported File Format');
    }
  
  };
  
  load( name: string, isLocal = false, onLoad?: Function, onError?: Function ) {
    if(!isLocal){
      //console.log('Image searching');
  
      this.findTPC(name, (buffer: Buffer, pack: number) => {
  
        if ( typeof onLoad === 'function' ){
          onLoad(
            new TPCObject({
              filename: name,
              file: buffer,
              pack: pack,
            })
          );
        }
  
      }, (error: any) => {
        console.error(error);
      });
  
    }else{
      console.warn('Local files not implemented yet');
    }
  };

}
