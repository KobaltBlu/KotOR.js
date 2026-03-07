import React from "react";
import { TabState } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";
import { TabAudioPlayer } from "../../components/tabs/tab-audio-player/TabAudioPlayer";

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