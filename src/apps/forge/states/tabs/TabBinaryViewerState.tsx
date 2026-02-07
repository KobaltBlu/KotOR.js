import React from "react";
import { TabBinaryViewer } from "../../components/tabs/tab-binary-viewer/TabBinaryViewer";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";

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
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.setContentView(<TabBinaryViewer tab={this}></TabBinaryViewer>);
    this.openFile();
  }

  openFile(file?: EditorFile){
    return new Promise<void>( (resolve, reject) => {
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
          resolve();
        });
      }
    });
  }

  setBytesPerRow(value: number){
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
