import React from "react";

import { TabJRLEditor } from "@/apps/forge/components/tabs/tab-jrl-editor/TabJRLEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabJRLEditorState extends TabState {
  tabName: string = 'JRL Editor';
  jrl?: KotOR.GFFObject;
  selectedQuest?: KotOR.GFFStruct;
  selectedQuestIndex: number = -1;
  selectedEntry?: KotOR.GFFStruct;
  selectedEntryIndex: number = -1;

  constructor(options: BaseTabStateOptions = {}){
    log.trace("TabJRLEditorState constructor entry");
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug("TabJRLEditorState constructor tabName", this.tabName);
    } else {
      log.trace("TabJRLEditorState constructor no file");
    }

    this.saveTypes = [
      {
        description: 'Journal File',
        accept: {
          'application/octet-stream': ['.jrl']
        }
      }
    ];
    log.trace("TabJRLEditorState constructor saveTypes set");

    this.setContentView(<TabJRLEditor tab={this}></TabJRLEditor>);
    log.trace("TabJRLEditorState constructor setContentView");
    this.openFile();
    log.trace("TabJRLEditorState constructor exit");
  }

  async openFile() {
    log.trace("TabJRLEditorState openFile entry");
    if(this.file){
      log.trace("TabJRLEditorState openFile readFile");
      const response = await this.file.readFile();
      log.debug("TabJRLEditorState openFile buffer length", response?.buffer?.length);
      this.jrl = new KotOR.GFFObject(response.buffer);
      log.trace("TabJRLEditorState openFile GFFObject created");
      this.processEventListener('onEditorFileLoad', [this]);
      log.info("TabJRLEditorState openFile loaded");
    } else {
      log.trace("TabJRLEditorState openFile no file");
    }
    log.trace("TabJRLEditorState openFile exit");
  }

  selectQuest(quest: KotOR.GFFStruct | undefined, questIndex: number) {
    log.trace("TabJRLEditorState selectQuest entry", questIndex);
    this.selectedQuest = quest;
    this.selectedQuestIndex = questIndex;
    this.selectedEntry = undefined;
    this.selectedEntryIndex = -1;
    this.processEventListener('onQuestSelected', [quest, questIndex]);
    log.trace("TabJRLEditorState selectQuest exit");
  }

  selectEntry(entry: KotOR.GFFStruct | undefined, entryIndex: number) {
    log.trace("TabJRLEditorState selectEntry entry", entryIndex);
    this.selectedEntry = entry;
    this.selectedEntryIndex = entryIndex;
    this.processEventListener('onEntrySelected', [entry, entryIndex]);
    log.trace("TabJRLEditorState selectEntry exit");
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace("TabJRLEditorState getExportBuffer entry");
    if(this.jrl){
      const buf = this.jrl.getExportBuffer();
      log.trace("TabJRLEditorState getExportBuffer length", buf?.length);
      return buf;
    }
    log.trace("TabJRLEditorState getExportBuffer no jrl return empty");
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace("TabJRLEditorState updateFile (no-op)");
  }

  getResourceID(): string | undefined {
    log.trace("TabJRLEditorState getResourceID");
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace("TabJRLEditorState getResourceID", id);
    return id;
  }
}
