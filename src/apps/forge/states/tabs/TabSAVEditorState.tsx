import React from "react";
import { TabSAVEditor } from "../../components/tabs/tab-sav-editor/TabSAVEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabSAVEditorState extends TabState {
  tabName: string = 'Save Game Editor';
  erf?: KotOR.ERFObject;
  saveMeta?: { areaName?: string; lastModule?: string; gameTime?: number; resourceCount?: number };

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Save Game File',
        accept: {
          'application/octet-stream': ['.sav']
        }
      }
    ];

    this.setContentView(<TabSAVEditor tab={this}></TabSAVEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.erf = new KotOR.ERFObject(this.file.path);
      await this.erf.load();

      // Try to load save metadata
      this.saveMeta = this.extractSaveMetadata();

      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  extractSaveMetadata() {
    const meta: any = {
      areaName: 'Unknown',
      lastModule: 'Unknown',
      gameTime: 0,
      resourceCount: this.erf?.keyList.length ?? 0
    };

    return meta;
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.erf){
      return this.erf.getExportBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // SAV is ERF-based
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
