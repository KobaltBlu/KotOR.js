import React from "react";

import { TabAudioPlayer } from "../../components/tabs/tab-audio-player/TabAudioPlayer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from '../../KotOR';

import type { EditorFile } from '../../EditorFile';
import { TabState } from './TabState';



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

  public openFile(file?: EditorFile): Promise<void> {
    return new Promise<void>(() => {
      // Open file dialog / load file; resolve when done
    });
  }
}