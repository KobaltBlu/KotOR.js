import React from "react";

import { TabGITEditor } from "../../components/tabs/tab-git-editor/TabGITEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";

import { TabState } from "./TabState";

export class TabGITEditorState extends TabState {
  tabName: string = 'GIT Editor';
  git?: KotOR.GFFObject;
  selectedInstance?: KotOR.GFFStruct;
  selectedInstanceType: string = '';
  selectedInstanceIndex: number = -1;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Game Instance Template',
        accept: {
          'application/octet-stream': ['.git']
        }
      }
    ];

    this.setContentView(<TabGITEditor tab={this}></TabGITEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.git = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  selectInstance(instance: KotOR.GFFStruct | undefined, type: string, index: number) {
    this.selectedInstance = instance;
    this.selectedInstanceType = type;
    this.selectedInstanceIndex = index;
    this.processEventListener('onInstanceSelected', [instance, type, index]);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.git){
      return this.git.getExportBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // Sync UI changes to GIT GFF if needed
  }

  getResourceID(): string | undefined {
    return this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
  }
}
