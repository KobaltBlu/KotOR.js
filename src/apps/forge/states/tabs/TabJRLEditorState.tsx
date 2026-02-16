import React from "react";
import { TabJRLEditor } from "../../components/tabs/tab-jrl-editor/TabJRLEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabJRLEditorState extends TabState {
  tabName: string = 'JRL Editor';
  jrl?: KotOR.GFFObject;
  selectedQuest?: KotOR.GFFStruct;
  selectedQuestIndex: number = -1;
  selectedEntry?: KotOR.GFFStruct;
  selectedEntryIndex: number = -1;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Journal File',
        accept: {
          'application/octet-stream': ['.jrl']
        }
      }
    ];

    this.setContentView(<TabJRLEditor tab={this}></TabJRLEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.jrl = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  selectQuest(quest: KotOR.GFFStruct | undefined, questIndex: number) {
    this.selectedQuest = quest;
    this.selectedQuestIndex = questIndex;
    this.selectedEntry = undefined;
    this.selectedEntryIndex = -1;
    this.processEventListener('onQuestSelected', [quest, questIndex]);
  }

  selectEntry(entry: KotOR.GFFStruct | undefined, entryIndex: number) {
    this.selectedEntry = entry;
    this.selectedEntryIndex = entryIndex;
    this.processEventListener('onEntrySelected', [entry, entryIndex]);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.jrl){
      return this.jrl.getExportBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // Sync UI changes to JRL GFF if needed
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
