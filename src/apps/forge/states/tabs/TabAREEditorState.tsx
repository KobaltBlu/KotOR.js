import React from "react";
import { TabAREEditor } from "../../components/tabs/tab-are-editor/TabAREEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabAREEditorState extends TabState {
  tabName: string = 'ARE Editor';
  are?: KotOR.GFFObject;
  activeTab: string = 'basic';

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Area File',
        accept: {
          'application/octet-stream': ['.are']
        }
      }
    ];

    this.setContentView(<TabAREEditor tab={this}></TabAREEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.are = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
    this.processEventListener('onTabChange', [tab]);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.are){
      return this.are.getExportBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // Sync UI changes to ARE GFF if needed
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
