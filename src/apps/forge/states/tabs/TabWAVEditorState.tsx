import React from "react";

import { TabWAVEditor } from "../../components/tabs/tab-wav-editor/TabWAVEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

import * as KotOR from "../../KotOR";

import { TabState } from "./TabState";

export class TabWAVEditorState extends TabState {
  tabName: string = 'WAV Editor';
  wavObject?: KotOR.WAVObject;

  constructor(options: BaseTabStateOptions = {}) {
    super(options);

    if (this.file) {
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Wave Audio',
        accept: {
          'application/octet-stream': ['.wav']
        }
      }
    ];

    this.setContentView(<TabWAVEditor tab={this}></TabWAVEditor>);
    this.openFile();
  }

  async openFile() {
    if (!this.file) return;
    const response = await this.file.readFile();
    this.wavObject = new KotOR.WAVObject(response.buffer);
    this.processEventListener('onEditorFileLoad', [this]);
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    if (this.wavObject) {
      return this.wavObject.toBuffer();
    }
    if (this.file?.buffer) {
      return this.file.buffer;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // View-only metadata; getExportBuffer uses wavObject.toBuffer()
  }

  getResourceID(): string | undefined {
    return this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
  }
}
