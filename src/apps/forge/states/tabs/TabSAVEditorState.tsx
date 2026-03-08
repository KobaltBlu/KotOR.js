import React from "react";

import { TabSAVEditor } from "@/apps/forge/components/tabs/tab-sav-editor/TabSAVEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabSAVEditorState extends TabState {
  tabName: string = 'Save Game Editor';
  erf?: KotOR.ERFObject;
  saveMeta?: { areaName?: string; lastModule?: string; gameTime?: number; resourceCount?: number };

  constructor(options: BaseTabStateOptions = {}){
    log.trace("TabSAVEditorState constructor entry");
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug("TabSAVEditorState constructor tabName", this.tabName);
    } else {
      log.trace("TabSAVEditorState constructor no file");
    }

    this.saveTypes = [
      {
        description: 'Save Game File',
        accept: {
          'application/octet-stream': ['.sav']
        }
      }
    ];
    log.trace("TabSAVEditorState constructor saveTypes set");

    this.setContentView(<TabSAVEditor tab={this}></TabSAVEditor>);
    log.trace("TabSAVEditorState constructor setContentView");
    this.openFile();
    log.trace("TabSAVEditorState constructor exit");
  }

  async openFile() {
    log.trace("TabSAVEditorState openFile entry");
    if(this.file){
      log.trace("TabSAVEditorState openFile readFile");
      await this.file.readFile();
      log.debug("TabSAVEditorState openFile path", this.file.path);
      this.erf = new KotOR.ERFObject(this.file.path);
      log.trace("TabSAVEditorState openFile ERFObject created, load");
      await this.erf.load();
      log.trace("TabSAVEditorState openFile erf.load done");

      this.saveMeta = this.extractSaveMetadata();
      log.debug("TabSAVEditorState openFile saveMeta resourceCount", this.saveMeta?.resourceCount);

      this.processEventListener('onEditorFileLoad', [this]);
      log.info("TabSAVEditorState openFile loaded");
    } else {
      log.trace("TabSAVEditorState openFile no file");
    }
    log.trace("TabSAVEditorState openFile exit");
  }

  extractSaveMetadata(): { areaName: string; lastModule: string; gameTime: number; resourceCount: number } {
    log.trace("TabSAVEditorState extractSaveMetadata entry");
    const meta = {
      areaName: 'Unknown',
      lastModule: 'Unknown',
      gameTime: 0,
      resourceCount: this.erf?.keyList.length ?? 0
    };
    log.trace("TabSAVEditorState extractSaveMetadata resourceCount", meta.resourceCount);
    return meta;
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace("TabSAVEditorState getExportBuffer entry");
    if(this.erf){
      const buf = this.erf.getExportBuffer();
      log.trace("TabSAVEditorState getExportBuffer length", buf?.length);
      return buf;
    }
    log.trace("TabSAVEditorState getExportBuffer no erf return empty");
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace("TabSAVEditorState updateFile (no-op)");
  }

  getResourceID(): string | undefined {
    log.trace("TabSAVEditorState getResourceID");
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace("TabSAVEditorState getResourceID", id);
    return id;
  }
}
