import React from "react";

import { TabLTREditor } from "../../components/tabs/tab-ltr-editor/TabLTREditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";

import { TabState } from "./TabState";

export class TabLTREditorState extends TabState {
  tabName: string = 'LTR Editor';
  ltr?: KotOR.LTRObject;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Letter/Name Generator File',
        accept: {
          'application/octet-stream': ['.ltr']
        }
      }
    ];

    this.setContentView(<TabLTREditor tab={this}></TabLTREditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.ltr = new KotOR.LTRObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (this.ltr) {
      return this.ltr.toBuffer();
    }
    if (this.file?.buffer) {
      return this.file.buffer;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // LTR edits are in-memory; getExportBuffer uses ltr.toBuffer()
  }

  getResourceID(): string | undefined {
    return this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
  }
}
