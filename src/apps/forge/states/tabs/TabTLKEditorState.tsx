import React from "react";
import { TabTLKEditor } from "../../components/tabs/tab-tlk-editor/TabTLKEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabTLKEditorState extends TabState {
  tabName: string = 'TLK Editor';
  tlk?: KotOR.TLKObject;
  selectedStringIndex: number = -1;
  searchFilter: string = '';
  currentPage: number = 0;
  pageSize: number = 50;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Talk Table File',
        accept: {
          'application/octet-stream': ['.tlk']
        }
      }
    ];

    this.setContentView(<TabTLKEditor tab={this}></TabTLKEditor>);
    this.openFile();
  }

  async openFile() {
    if(!this.file) return;
    const response = await this.file.readFile();
    await new Promise<void>((resolve, reject) => {
      this.tlk = new KotOR.TLKObject(response.buffer, () => resolve(), undefined);
    });
    this.processEventListener('onEditorFileLoad', [this]);
  }

  selectString(index: number) {
    this.selectedStringIndex = index;
    this.processEventListener('onStringSelected', [index]);
  }

  setSearchFilter(filter: string) {
    this.searchFilter = filter;
    this.currentPage = 0;
    this.processEventListener('onSearchFilterChanged', [filter]);
  }

  setPage(page: number) {
    this.currentPage = page;
    this.processEventListener('onPageChanged', [page]);
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    if(this.tlk){
      return this.tlk.toBuffer();
    }
    if(this.file?.buffer){
      return this.file.buffer;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // UI edits TLKStrings in place; getExportBuffer uses this.tlk.toBuffer()
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
