import { ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { AudioFile } from "./AudioFile";
import * as path from "path";
import { GameFileSystem } from "../utility/GameFileSystem";
import { KEYManager } from "../managers/KEYManager";

/**
 * AudioLoader class.
 * 
 * The AudioLoader class is used for finding and loading audio files by name and filetype.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AudioLoader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AudioLoader {

  constructor () { }

  static toArrayBuffer(buffer: Uint8Array) {
    let ab = new ArrayBuffer(buffer.length);
    let view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

  static async LoadSound (resRef: string){

    if(AudioLoader.cache.hasOwnProperty(resRef)){
      return AudioLoader.cache[resRef];
    }else{
      const visKey = KEYManager.Key.getFileKey(resRef, ResourceTypes['wav']);
      if(!!visKey){
        try{
          const buffer = await KEYManager.Key.getFileBuffer(visKey);
          if(!buffer){ return; }
        
          const af = new AudioFile(buffer);
          const data = await af.getPlayableByteStream();

          if(data.byteLength){
            return data;
          }else{
            return buffer;
          }
        }catch(e){
          console.error(e);
          throw e;
        }
      }else{
        await this.LoadStreamSound( resRef);
      }

    }

  }

  static async LoadStreamSound (resRef: string) {
    try{
      const file = path.join('streamsounds', resRef+'.wav');
      const buffer = await GameFileSystem.readFile(file);
      const af = new AudioFile(buffer);
      const data = await af.getPlayableByteStream();
      return data;
    }catch(e){
      console.log(`AudioLoader.LoadStreamSound : read`);
      console.error(e);
      throw e;
    }
  }

  static async LoadStreamWave (ResRef: string) {
    const snd = ResourceLoader.getResource(ResourceTypes['wav'], ResRef);
    if(!!snd){
      try{
        const buffer = await GameFileSystem.readFile(snd.file);
        const af = new AudioFile(buffer);
        const data = await af.getPlayableByteStream();
        return data;
      }catch(e){
        console.log(`AudioLoader.LoadStreamWave : read`);
        console.error(e);
        throw e;
      }
    }else{
      throw new Error(`LoadSteamWave: failed to locate playable resource`);
    }
  }

  static async LoadMusic (resRef?: string){
    return await AudioLoader.LoadAmbientSound(resRef);
  }

  static async LoadAmbientSound (resRef: string): Promise<ArrayBuffer> {
    try{
      const file = path.join('streammusic', resRef+'.wav');
      const buffer = await GameFileSystem.readFile(file);
      const af = new AudioFile(buffer);
      const data = await af.getPlayableByteStream();
      return data;
    }catch(e){
      console.log(`AudioLoader.LoadAmbientSound : read`);
      console.error(e);
      throw e;
    }
  }

  static cache: any = {};

}
