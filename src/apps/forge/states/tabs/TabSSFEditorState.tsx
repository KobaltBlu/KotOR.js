import React from "react";
import { TabSSFEditor } from "../../components/tabs/tab-ssf-editor/TabSSFEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";
import { BinaryWriter } from "../../../../utility/binary/BinaryWriter";

export class TabSSFEditorState extends TabState {
  tabName: string = 'SSF Editor';
  ssf?: KotOR.SSFObject;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Sound Set File',
        accept: {
          'application/octet-stream': ['.ssf']
        }
      }
    ];

    this.setContentView(<TabSSFEditor tab={this}></TabSSFEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      this.ssf = new KotOR.SSFObject(response.buffer);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.ssf){
      // Export SSF back to binary
      const writer = new BinaryWriter();
      writer.writeChars(this.ssf.FileType);
      writer.writeChars(this.ssf.FileVersion);
      writer.writeUInt32(12); // unknown constant

      for(const soundRef of this.ssf.sound_refs){
        writer.writeUInt32(soundRef);
      }

      return new Uint8Array(writer.buffer);
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // SSF changes are already in ssf.sound_refs array
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
