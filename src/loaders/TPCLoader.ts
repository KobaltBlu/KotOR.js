import { TPCObject } from "../resource/TPCObject";
import * as path from "path";
import { ResourceTypes } from "../resource/ResourceTypes";
import { GameFileSystem } from "../utility/GameFileSystem";
import { ERFManager } from "../managers/ERFManager";
import { KEYManager } from "../managers/KEYManager";
import { OdysseyCompressedTexture } from "../three/odyssey";
import { IFindTPCResult } from "../interface/graphics/IFindTPCResult";
import { TextureLoaderState } from "./TextureLoaderState";

/**
 * TPCLoader class.
 * 
 * TPCLoader class is used to decode the TPC image format found in the game archives.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file TPCLoader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class TPCLoader {
  
  async findTPC( resRef: string ): Promise<IFindTPCResult> {
    resRef = resRef.toLocaleLowerCase();
  
    let erfResource = ERFManager.ERFs.get('swpc_tex_gui').getResource(resRef, ResourceTypes['tpc']);
    if(erfResource){
      const buffer = await ERFManager.ERFs.get('swpc_tex_gui').getResourceBuffer(erfResource);
      return { pack: 0, buffer: buffer };
    }
  
    let activeTexturePack;
    switch(TextureLoaderState.TextureQuality){
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
  
    erfResource = activeTexturePack.getResource(resRef, ResourceTypes['tpc']);
    if(erfResource){
      const buffer = await activeTexturePack.getResourceBuffer(erfResource);
      return { pack: TextureLoaderState.TextureQuality || 2, buffer: buffer };
    }
  
    //Check in BIF files
    const resKey = KEYManager.Key.getFileKey(resRef, ResourceTypes['tpc']);
    if(resKey){
      const buffer = await KEYManager.Key.getFileBuffer( resKey);
      return { pack: TextureLoaderState.TextureQuality || 2, buffer: buffer };
    }
  
    throw new Error('TPC not found in game resources!');
  }
  
  async fetch(resRef: string = ''): Promise<OdysseyCompressedTexture>{
    try{
      const result = await this.findTPC(resRef);
      const tpc = new TPCObject({
        filename: resRef,
        file: result.buffer,
        pack: result.pack,
      });

      let texture = tpc.toCompressedTexture();
      //console.log("loaded texture", resRef);

      return texture;
    }catch(e){
      // console.error(e);
      return undefined;
    }
  }
  
  async fetchOverride(resRef: string = ''): Promise<OdysseyCompressedTexture> {
    const dir = path.join('Override');
  
    try{
      const buffer = await GameFileSystem.readFile(path.join(dir, resRef)+'.tpc');
      if(!buffer){
        throw new Error(`Failed to load ${resRef}.tpc from the override folder`);
      }
  
      const tpc = new TPCObject({
        filename: resRef,
        file: buffer
      });
  
      const texture = tpc.toCompressedTexture();

      return texture;
    }catch(e){

    }
  };
  
  /*fetchLocal( resRef = '', onLoad?: Function, onProgress?: Function, onError?: Function ) {
  
    let file_info = path.parse(resRef);
    if(file_info.ext == '.tpc'){
      GameFileSystem.readFile(resRef).then( (buffer) => {
        let tpc = new TPCObject({
          filename: file_info.name,
          file: buffer
        });
  
        let texture = tpc.toCompressedTexture();
        //console.log("loaded texture", texName);
  
        if ( typeof onLoad === 'function' ) onLoad( texture );
  
      }).catch( (err) => {
        throw err; // Fail if the file can't be read.
      })
    }else{
      onError('Unsupported File Format');
    }
  
  };

  loadFromArchive( archive: string, tex: string, onComplete?: Function, onError?: Function ){
    let resKey = ERFManager.ERFs.get(archive).getResource(tex, ResourceTypes['tpc']);
    if(resKey instanceof Object){
  
      if (typeof onComplete === 'function') {
        ERFManager.ERFs.get(archive).getResourceBufferByResRef(tex, ResourceTypes['tpc']).then((buffer: Uint8Array) => {
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
  
  async load( resRef: string, isLocal = false ): Promise<TPCObject> {
    if(!isLocal){
      try{
        const result = await this.findTPC(resRef);
        const tpc = new TPCObject({
          filename: resRef,
          file: result.buffer,
          pack: result.pack,
        });
  
        return tpc;
      }catch(e){
        console.error(e);
        return undefined;
      }
  
    }else{
      console.warn('Local files not implemented yet');
    }
    return undefined;
  };*/

}
