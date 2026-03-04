import React from "react";

import { TabIFOEditor } from "@/apps/forge/components/tabs/tab-ifo-editor/TabIFOEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabIFOEditorState extends TabState {
  tabName: string = 'IFO Editor';
  ifo?: KotOR.GFFObject;
  activeTab: string = 'basic';

  constructor(options: BaseTabStateOptions = {}){
    log.trace("TabIFOEditorState constructor entry");
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug("TabIFOEditorState constructor tabName", this.tabName);
    } else {
      log.trace("TabIFOEditorState constructor no file");
    }

    this.saveTypes = [
      {
        description: 'Module Info File',
        accept: {
          'application/octet-stream': ['.ifo']
        }
      }
    ];
    log.trace("TabIFOEditorState constructor saveTypes set");

    this.setContentView(<TabIFOEditor tab={this}></TabIFOEditor>);
    log.trace("TabIFOEditorState constructor setContentView");
    this.openFile();
    log.trace("TabIFOEditorState constructor exit");
  }

  async openFile() {
    log.trace("TabIFOEditorState openFile entry");
    if(this.file){
      log.trace("TabIFOEditorState openFile readFile");
      const response = await this.file.readFile();
      log.debug("TabIFOEditorState openFile buffer length", response?.buffer?.length);
      this.ifo = new KotOR.GFFObject(response.buffer);
      log.trace("TabIFOEditorState openFile GFFObject created");
      this.processEventListener('onEditorFileLoad', [this]);
      log.info("TabIFOEditorState openFile loaded");
    } else {
      log.trace("TabIFOEditorState openFile no file");
    }
    log.trace("TabIFOEditorState openFile exit");
  }

  setActiveTab(tab: string) {
    log.trace("TabIFOEditorState setActiveTab entry", tab);
    this.activeTab = tab;
    this.processEventListener('onTabChange', [tab]);
    log.trace("TabIFOEditorState setActiveTab exit");
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace("TabIFOEditorState getExportBuffer entry");
    if(this.ifo){
      const buf = this.ifo.getExportBuffer();
      log.trace("TabIFOEditorState getExportBuffer length", buf?.length);
      return buf;
    }
    log.trace("TabIFOEditorState getExportBuffer no ifo return empty");
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace("TabIFOEditorState updateFile (no-op)");
  }

  getResourceID(): string | undefined {
    log.trace("TabIFOEditorState getResourceID");
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace("TabIFOEditorState getResourceID", id);
    return id;
  }
}
