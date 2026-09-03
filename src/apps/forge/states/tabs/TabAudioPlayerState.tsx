import React from "react";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabAudioPlayer } from "@/apps/forge/components/tabs/tab-audio-player/TabAudioPlayer";

export class TabAudioPlayerState extends TabState {
  tabName: string = `Audio Player`;
  singleInstance: boolean = true;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);
    this.setContentView(<TabAudioPlayer tab={this}></TabAudioPlayer>);
  }

  public openFile(_file?: any) {
    return Promise.resolve();
  }
}
