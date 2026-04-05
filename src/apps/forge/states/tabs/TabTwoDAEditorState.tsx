import React from "react";
import { TabTwoDAEditor } from "@/apps/forge/components/tabs/tab-twoda-editor/TabTwoDAEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";

export class TabTwoDAEditorState extends TabState {
  tabName: string = `2DA`;
  twoDAObject: KotOR.TwoDAObject;
  constructor(options: BaseTabStateOptions = {}){
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
  }

  openFile(file?: EditorFile){
    return new Promise<KotOR.TwoDAObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.twoDAObject = new KotOR.TwoDAObject(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.twoDAObject);
        });
      }
    });

  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(ext == 'csv'){
      const textEncoder = new TextEncoder();
      return textEncoder.encode(this.twoDAObject.toCSV());
    }
    return this.twoDAObject.toExportBuffer();
  }


}