import React from "react";

import { TabSSFEditor } from "../../components/tabs/tab-ssf-editor/TabSSFEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";

import { TabState } from "./TabState";

export class TabSSFEditorState extends TabState {
  tabName: string = 'SSF Editor';
  ssf?: KotOR.SSFObject;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Sound Set File',
        accept: {
          'application/octet-stream': ['.ssf']
        }
      }
    ];

    this.setContentView(<TabSSFEditor tab={this}></TabSSFEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.ssf = new KotOR.SSFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (this.ssf) {
      return this.ssf.toBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // SSF changes are already in ssf.sound_refs array
  }

  getResourceID(): string | undefined {
    return this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
  }
}
