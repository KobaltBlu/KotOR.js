import React from "react";
import { TabState } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";
import { TabAudioPlayer } from "../../components/tabs/TabAudioPlayer";

export class TabAudioPlayerState extends TabState {
  tabName: string = `Audio Player`;
  singleInstance: boolean = true;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabAudioPlayer tab={this}></TabAudioPlayer>);
    this.openFile();
  }

  public openFile(file?: any){
    return new Promise<any>( (resolve, reject) => {
      
    });
  }
}