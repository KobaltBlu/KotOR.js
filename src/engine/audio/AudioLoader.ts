import { ResourceLoader } from "@engine/loaders";
import { ResourceTypes } from "@core/resource/ResourceTypes";
import { AudioFile } from "@engine/audio/AudioFile";
import * as path from "path";
import { GameFileSystem } from "@core/filesystem/GameFileSystem";
import { KEYManager } from "@core/managers/KEYManager";

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
        const fromDisk = await AudioLoader.loadWavFromGamePaths(resRef);
        if (fromDisk) {
          return fromDisk;
        }
        throw new Error(`LoadSound: could not resolve "${resRef}" (streamsounds / streamwaves / streamvoice / Override)`);
      }

    }

  }

  /**
   * Loose WAVs: SFX in streamsounds; creature VO often in streamwaves (K1) or streamvoice (TSL).
   * Also tries Override (mods / loose files).
   */
  static async loadWavFromGamePaths(resRef: string): Promise<Uint8Array | undefined> {
    const ref = (resRef || "").trim().toLowerCase();
    if (!ref) return undefined;

    const subdirs = ["streamsounds", "streamwaves", "streamvoice"];
    for (const sub of subdirs) {
      try {
        const file = path.join(sub, `${ref}.wav`);
        const buffer = await GameFileSystem.readFile(file);
        if (!buffer?.length) continue;
        const af = new AudioFile(buffer);
        return await af.getPlayableByteStream();
      } catch {
        /* try next */
      }
    }

    try {
      const fromOverride = await ResourceLoader.searchOverride(ResourceTypes["wav"], ref);
      if (fromOverride?.length) {
        const af = new AudioFile(fromOverride);
        return await af.getPlayableByteStream();
      }
    } catch {
      /* ignore */
    }

    return undefined;
  }

  static async LoadStreamSound (resRef: string) {
    const data = await AudioLoader.loadWavFromGamePaths(resRef);
    if (data) {
      return data;
    }
    throw new Error(`LoadStreamSound: could not read "${resRef}.wav" from streamsounds / streamwaves / streamvoice / Override`);
  }

  static async LoadStreamWave (resRef: string) {
    const snd = ResourceLoader.getResource(ResourceTypes['wav'], resRef);
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

  static async LoadAmbientSound (resRef: string): Promise<Uint8Array> {
    const key = String(resRef || '').toLowerCase();
    try{
      let pending = AudioLoader.streamCache.get(key);
      if(pending){
        // Most recently used goes last.
        AudioLoader.streamCache.delete(key);
        AudioLoader.streamCache.set(key, pending);
      }else{
        pending = AudioLoader.decodeStream(resRef);
        AudioLoader.rememberStream(key, pending);
      }
      // Callers hand the buffer to decodeAudioData, which detaches it.
      return (await pending).bytes.slice();
    }catch(e){
      console.log(`AudioLoader.LoadAmbientSound : read`);
      console.error(e);
      throw e;
    }
  }

  /**
   * Decoded (playable) streammusic files, most recently used last. ADPCM decode
   * is the expensive part of loading area music, and the same tracks come back
   * on reloads, area transitions, and day/night rows that share a file.
   */
  static streamCacheBudgetBytes = 64 * 1024 * 1024;
  private static streamCache = new Map<string, Promise<{ bytes: Uint8Array }>>();
  private static streamCacheSizes = new Map<string, number>();
  private static streamCacheBytes = 0;

  static clearStreamCache(): void {
    AudioLoader.streamCache.clear();
    AudioLoader.streamCacheSizes.clear();
    AudioLoader.streamCacheBytes = 0;
  }

  private static async decodeStream(resRef: string): Promise<{ bytes: Uint8Array }> {
    const file = path.join('streammusic', resRef+'.wav');
    const buffer = await GameFileSystem.readFile(file);
    const af = new AudioFile(buffer);
    const playable = await af.getPlayableByteStream();
    // Own the bytes exactly (the playable stream may be a view of a larger buffer).
    return { bytes: playable.slice() };
  }

  private static rememberStream(key: string, pending: Promise<{ bytes: Uint8Array }>): void {
    const cache = AudioLoader.streamCache;
    cache.set(key, pending);
    pending.then(({ bytes }) => {
      if(cache.get(key) !== pending){ return; }
      AudioLoader.streamCacheSizes.set(key, bytes.byteLength);
      AudioLoader.streamCacheBytes += bytes.byteLength;
      for(const oldKey of cache.keys()){
        if(AudioLoader.streamCacheBytes <= AudioLoader.streamCacheBudgetBytes || oldKey === key){ break; }
        AudioLoader.evictStream(oldKey);
      }
      if(AudioLoader.streamCacheBytes > AudioLoader.streamCacheBudgetBytes){
        AudioLoader.evictStream(key); // larger than the whole budget
      }
    }, () => {
      if(cache.get(key) === pending){ cache.delete(key); }
    });
  }

  private static evictStream(key: string): void {
    AudioLoader.streamCache.delete(key);
    const size = AudioLoader.streamCacheSizes.get(key);
    if(size !== undefined){
      AudioLoader.streamCacheSizes.delete(key);
      AudioLoader.streamCacheBytes -= size;
    }
  }

  static cache: any = {};

}
