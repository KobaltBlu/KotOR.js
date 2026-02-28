import React from "react";

import { TabTwoDAEditor } from "@/apps/forge/components/tabs/tab-twoda-editor/TabTwoDAEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabTwoDAEditorState extends TabState {
  tabName: string = `2DA`;
  twoDAObject: KotOR.TwoDAObject;
  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabTwoDAEditorState constructor entry');
    super(options);

    this.setContentView(<TabTwoDAEditor tab={this}></TabTwoDAEditor>);
    this.openFile();

    this.saveTypes = [
      {
        description: '2-Dimensional Array',
        accept: {
          'application/octet-stream': ['.2da']
        }
      },
      {
        description: 'Comma-separated values',
        accept: {
          'text/csv': ['.csv']
        }
      }
    ];
    log.trace('TabTwoDAEditorState constructor exit');
  }

  openFile(file?: EditorFile){
    log.trace('TabTwoDAEditorState openFile entry', !!file);
    return new Promise<KotOR.TwoDAObject>( (resolve, _reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
        log.trace('TabTwoDAEditorState openFile use this.file');
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        log.debug('TabTwoDAEditorState openFile tabName', this.tabName);

        file.readFile().then( (response) => {
          this.twoDAObject = new KotOR.TwoDAObject(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          log.trace('TabTwoDAEditorState openFile loaded');
          resolve(this.twoDAObject);
        });
      } else {
        log.trace('TabTwoDAEditorState openFile no file');
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    log.trace('TabTwoDAEditorState getExportBuffer', ext);
    if (!this.twoDAObject) {
      const fallback = this.file?.buffer ? this.file.buffer.slice(0) : new Uint8Array(0);
      log.debug('TabTwoDAEditorState getExportBuffer no twoDAObject, fallback length', fallback.length);
      return fallback;
    }
    if (ext === 'csv') {
      const textEncoder = new TextEncoder();
      const buf = textEncoder.encode(this.twoDAObject.toCSV());
      log.debug('TabTwoDAEditorState getExportBuffer csv length', buf.length);
      return buf;
    }
    const buf = this.twoDAObject.toExportBuffer();
    log.debug('TabTwoDAEditorState getExportBuffer length', buf?.length ?? 0);
    return buf;
  }
}
