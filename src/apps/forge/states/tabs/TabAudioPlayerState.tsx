import React from "react";

import { TabAudioPlayer } from "@/apps/forge/components/tabs/tab-audio-player/TabAudioPlayer";
import type { EditorFile } from '@/apps/forge/EditorFile';
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from '@/apps/forge/states/tabs/TabState';



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

  public openFile(file?: any){
    return new Promise<any>( (resolve, reject) => {
      
    });
  }
}