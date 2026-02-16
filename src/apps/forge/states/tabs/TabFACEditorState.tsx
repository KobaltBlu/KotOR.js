import React from "react";
import { TabFACEditor } from "../../components/tabs/tab-fac-editor/TabFACEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabFACEditorState extends TabState {
  tabName: string = 'FAC Editor';
  fac?: KotOR.GFFObject;
  selectedFaction?: KotOR.GFFStruct;
  selectedFactionIndex: number = -1;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Faction File',
        accept: {
          'application/octet-stream': ['.fac']
        }
      }
    ];

    this.setContentView(<TabFACEditor tab={this}></TabFACEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.fac = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  selectFaction(faction: KotOR.GFFStruct | undefined, index: number) {
    this.selectedFaction = faction;
    this.selectedFactionIndex = index;
    this.processEventListener('onFactionSelected', [faction, index]);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.fac){
      return this.fac.getExportBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // Sync UI changes to FAC GFF if needed
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
