import React from "react";
import { TabIFOEditor } from "../../components/tabs/tab-ifo-editor/TabIFOEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabIFOEditorState extends TabState {
  tabName: string = 'IFO Editor';
  ifo?: KotOR.GFFObject;
  activeTab: string = 'basic';

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Module Info File',
        accept: {
          'application/octet-stream': ['.ifo']
        }
      }
    ];

    this.setContentView(<TabIFOEditor tab={this}></TabIFOEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.ifo = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.processEventListener('onTabChange', [tab]);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.ifo){
      return this.ifo.getExportBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // Sync UI changes to IFO GFF if needed
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
