import React from "react";

import { EditorFile } from "@/apps/forge/EditorFile";
import { TabAudioPlayer } from "@/apps/forge/components/tabs/tab-audio-player/TabAudioPlayer";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { AudioPlayerState } from "@/apps/forge/states/AudioPlayerState";
import { TabState } from "@/apps/forge/states/tabs/TabState";


export class TabAudioPlayerState extends TabState {
  tabName: string = `Audio Player`;
  singleInstance: boolean = true;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabAudioPlayer tab={this}></TabAudioPlayer>);
    this.openFile();

    // this.saveTypes = [
    //   {
    //     description: 'Plain Text File',
    //     accept: {
    //       'text/plain': ['.txt']
    //     }
    //   },
    //   {
    //     description: 'NWScript File',
    //     accept: {
    //       'text/plain': ['.nss']
    //     }
    //   },
    //   {
    //     description: 'NWScript Compiled File',
    //     accept: {
    //       'application/octet-stream': ['.ncs']
    //     }
    //   }
    // ];
  }

  public openFile(file?: EditorFile){
    const editorFile = file || this.file;
    if (file) {
      this.setFile(file);
    }

    return new Promise<any>( (resolve, reject) => {
      if(!(editorFile instanceof EditorFile)){
        resolve(undefined);
        return;
      }

      editorFile.readFile()
        .then((response) => {
          if(!response?.buffer){
            throw new Error('Audio Buffer is undefined');
          }

          AudioPlayerState.Reset();
          AudioPlayerState.Stop();
          AudioPlayerState.file = editorFile;
          AudioPlayerState.audioFile = new KotOR.AudioFile(response.buffer);
          AudioPlayerState.audioFile.filename = editorFile.getFilename();
          AudioPlayerState.Play();
          AudioPlayerState.ProcessEventListener('onOpen', [AudioPlayerState.audioFile]);
          resolve(AudioPlayerState.audioFile);
        })
        .catch((e) => {
          console.error('TabAudioPlayerState.openFile error', e);
          reject(e);
        });
    });
  }
}