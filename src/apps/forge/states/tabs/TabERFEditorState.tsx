import React from "react";
import { TabState } from "./TabState";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabERFEditor } from "../../components/tabs/TabERFEditor";
import { EditorFile } from "../../EditorFile";

import * as KotOR from "../../KotOR";

export class TabERFEditorState extends TabState {
  tabName: string = `ERF`;
  erf: KotOR.ERFObject;

  selectedNode: KotOR.GFFField|KotOR.GFFStruct;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabERFEditor tab={this}></TabERFEditor>);
    this.openFile();
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.ERFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( async (response) => {
          this.erf = new KotOR.ERFObject(response.buffer);
          await this.erf.load();
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.erf);
        });
      }
    });
  }
}
