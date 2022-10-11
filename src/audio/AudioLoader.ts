/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { ApplicationProfile } from "../utility/ApplicationProfile";
import { AudioFile } from "./AudioFile";

import * as path from "path";
import * as fs from "fs";
import { KEYManager } from "../managers/KEYManager";

/* @file
 * The AudioLoader class is used for finding and loading audio files by name and filetype.
 */

export class AudioLoader {

  constructor () { }

  static toArrayBuffer(buffer: Buffer) {
    let ab = new ArrayBuffer(buffer.length);
    let view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

  static LoadSound (ResRef: string, onLoad?: Function, onError?: Function){

    if(AudioLoader.cache.hasOwnProperty(ResRef)){
      if(onLoad != null)
        onLoad(AudioLoader.cache[ResRef]);
    }else{
      let visKey = KEYManager.Key.GetFileKey(ResRef, ResourceTypes['wav']);
      if(visKey != null){
        KEYManager.Key.GetFileData(visKey, (buffer: Buffer) => {
          //console.log(buffer);
          new AudioFile(buffer, (af: AudioFile)=> {
            //console.log(af, buffer)
            af.GetPlayableByteStream( (data: Uint8Array) => {

              if(data.byteLength){
                //AudioLoader.cache[ResRef] = data;
                if(onLoad != null)
                  onLoad(data);
              }else{
                //AudioLoader.cache[ResRef] = buffer;
                if(onLoad != null)
                  onLoad(buffer);
              }
              
            });
          });
        });
      }else{
        //console.log('LoadStreamSound', ResRef)
        this.LoadStreamSound( ResRef, onLoad, onError);
      }

    }

  }

  static LoadStreamSound (ResRef: string, onLoad?: Function, onError?: Function) {

    let file = path.join(ApplicationProfile.directory, 'streamsounds', ResRef+'.wav');

    //console.log('LoadStreamSound', ResRef, file);

    fs.readFile(file, (err, buffer) => {
      if (err) {
        //console.log('AudioLoader.LoadStreamSound : read', err);
        if(onError != null)
          onError(err);
      }else{
        new AudioFile(buffer, (af: AudioFile)=> {
          //console.log(af, buffer)
          af.GetPlayableByteStream( (data: any) => {
            if(onLoad != null)
              onLoad(data);
          });
        });
      }

    });

  }

  static LoadStreamWave (ResRef: string, onLoad?: Function, onError?: Function) {

    //let file = path.join(ApplicationProfile.directory, 'streamwaves', ResRef+'.wav');

    let snd = ResourceLoader.getResource(ResourceTypes['wav'], ResRef);
    if(snd){
      //console.log('LoadStreamSound', ResRef, snd);

      fs.readFile(snd.file, (err, buffer) => {
        if (err) {
          console.log('AudioLoader.LoadStreamWave : read', err);
          if(onError != null)
            onError(err);
        }else{
          new AudioFile(buffer, (af: AudioFile)=> {
            //console.log(af, buffer)
            af.GetPlayableByteStream( (data: any) => {
              if(onLoad != null)
                onLoad(data);
            });
          });
        }

      });
    }else{
      if(typeof onError === 'function')
        onError();
    }

  }

  static LoadMusic (ResRef?: string, onLoad?: Function, onError?: Function){
    AudioLoader.LoadAmbientSound(ResRef, onLoad, onError);
  }

  static LoadAmbientSound (ResRef: string, onLoad?: Function, onError?: Function) {

    let file = path.join(ApplicationProfile.directory, 'streammusic', ResRef+'.wav');
    fs.readFile(file, (err, buffer) => {
      if (err) {
        console.log('AudioLoader.LoadAmbientSound : read', err);
        if(onError != null)
          onError(err);
      }else{
        new AudioFile(buffer, (af: AudioFile)=> {
          //console.log(af, buffer)
          af.GetPlayableByteStream( (data: any) => {
            if(onLoad != null)
              onLoad(data);
          });
        });
      }

    });

  }

  static cache: any = {};

}
