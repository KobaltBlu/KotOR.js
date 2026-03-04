import React from "react";

import { TabBinaryViewer } from "@/apps/forge/components/tabs/tab-binary-viewer/TabBinaryViewer";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

interface BinaryRow {
  offset: string;
  hex: string;
  ascii: string;
}

export class TabBinaryViewerState extends TabState {
  tabName: string = 'Binary Viewer';
  bytesPerRow: number = 16;
  rows: BinaryRow[] = [];
  data: Uint8Array = new Uint8Array(0);
  dataLength: number = 0;

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabBinaryViewerState constructor entry');
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
      log.debug('TabBinaryViewerState constructor tabName', this.tabName);
    }

    this.setContentView(<TabBinaryViewer tab={this}></TabBinaryViewer>);
    this.openFile();
    log.trace('TabBinaryViewerState constructor exit');
  }

  openFile(file?: EditorFile){
    log.trace('TabBinaryViewerState openFile entry', !!file);
    return new Promise<void>( (resolve, _reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        file.readFile().then( (response) => {
          this.data = response.buffer;
          this.dataLength = this.data.length;
          this.rows = this.buildRows();
          this.processEventListener('onEditorFileLoad');
          log.trace('TabBinaryViewerState openFile loaded', this.dataLength);
          resolve();
        });
      } else {
        log.trace('TabBinaryViewerState openFile no file');
      }
    });
  }

  setBytesPerRow(value: number){
    log.trace('TabBinaryViewerState setBytesPerRow', value);
    this.bytesPerRow = value;
    this.rows = this.buildRows();
    this.processEventListener('onEditorFileLoad');
  }

  buildRows(): BinaryRow[] {
    const rows: BinaryRow[] = [];
    const bytes = this.data;
    const rowSize = this.bytesPerRow;

    for(let offset = 0; offset < bytes.length; offset += rowSize){
      const slice = bytes.slice(offset, offset + rowSize);
      const hex = Array.from(slice)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')
        .toUpperCase();
      const ascii = Array.from(slice)
        .map((b) => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.')
        .join('');
      rows.push({
        offset: `0x${offset.toString(16).padStart(8, '0').toUpperCase()}`,
        hex,
        ascii
      });
    }

    return rows;
  }
}
