import React from "react";

import { TabGITEditor } from "@/apps/forge/components/tabs/tab-git-editor/TabGITEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabGITEditorState extends TabState {
  tabName: string = 'GIT Editor';
  git?: KotOR.GFFObject;
  selectedInstance?: KotOR.GFFStruct;
  selectedInstanceType: string = '';
  selectedInstanceIndex: number = -1;

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabGITEditorState constructor entry');
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug('TabGITEditorState constructor tabName', this.tabName);
    }

    this.saveTypes = [
      {
        description: 'Game Instance Template',
        accept: {
          'application/octet-stream': ['.git']
        }
      }
    ];

    this.setContentView(<TabGITEditor tab={this}></TabGITEditor>);
    this.openFile();
    log.trace('TabGITEditorState constructor exit');
  }

  async openFile() {
    log.trace('TabGITEditorState openFile entry');
    if(this.file){
      const response = await this.file.readFile();
      log.debug('TabGITEditorState openFile readFile done', response.buffer?.length ?? 0);
      this.git = new KotOR.GFFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
      log.trace('TabGITEditorState openFile git loaded');
    } else {
      log.trace('TabGITEditorState openFile no file');
    }
    log.trace('TabGITEditorState openFile exit');
  }

  selectInstance(instance: KotOR.GFFStruct | undefined, type: string, index: number) {
    log.trace('TabGITEditorState selectInstance', type, index);
    this.selectedInstance = instance;
    this.selectedInstanceType = type;
    this.selectedInstanceIndex = index;
    this.processEventListener('onInstanceSelected', [instance, type, index]);
  }

  async getExportBuffer(_resref?: string, _ext?: string): Promise<Uint8Array> {
    log.trace('TabGITEditorState getExportBuffer');
    if(this.git){
      const buf = this.git.getExportBuffer();
      log.debug('TabGITEditorState getExportBuffer length', buf?.length ?? 0);
      return buf;
    }
    return new Uint8Array(0);
  }

  updateFile() {
    log.trace('TabGITEditorState updateFile');
  }

  getResourceID(): string | undefined {
    const id = this.file ? `${this.file.resref ?? ''}${this.file.reskey ?? ''}` : undefined;
    log.trace('TabGITEditorState getResourceID', id ?? '(none)');
    return id;
  }
}
