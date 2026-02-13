import React from "react";

import { TabVISEditor } from "../../components/tabs/tab-vis-editor/TabVISEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";

import { TabState } from "./TabState";

export class TabVISEditorState extends TabState {
  tabName: string = 'VIS Editor';
  vis?: KotOR.VISObject;
  selectedRoomName?: string;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Visibility File',
        accept: {
          'text/plain': ['.vis']
        }
      }
    ];

    this.setContentView(<TabVISEditor tab={this}></TabVISEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.vis = new KotOR.VISObject(response.buffer);
      this.vis.read();
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  selectRoom(roomName: string | undefined) {
    this.selectedRoomName = roomName;
    this.processEventListener('onRoomSelected', [roomName]);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (this.vis) {
      return this.vis.toBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // VIS changes are in vis.rooms map
  }

  getResourceID(): string | undefined {
    return this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
  }
}
