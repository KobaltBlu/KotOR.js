import React from "react";
import { TabState } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabERFEditor } from "../../components/tabs/TabERFEditor";
import { EditorFile } from "../../EditorFile";

import * as KotOR from "../../KotOR";

export class TabERFEditorState extends TabState {
  tabName: string = `ERF`;
  erf: KotOR.ERFObject;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabERFEditor tab={this}></TabERFEditor>);
    this.openFile();
  }

  public async openFile(file?: EditorFile){
    if(!file && this.file instanceof EditorFile){
      file = this.file;
    }

    if(!(file instanceof EditorFile)){ return undefined; }
    if(this.file != file){
      this.file = file; 
    }

    this.tabName = this.file.getFilename();

    const response = await file.readFile();
    this.erf = new KotOR.ERFObject(response.buffer);
    await this.erf.load();
    this.processEventListener('onEditorFileLoad', [this]);
    return this.erf;
  }
}
