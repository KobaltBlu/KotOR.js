import React from "react";
import { TabTwoDAEditor } from "../../components/tabs/TabTwoDAEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";

export class TabTwoDAEditorState extends TabState {
  tabName: string = `2DA`;
  twoDAObject: KotOR.TwoDAObject;
  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabTwoDAEditor tab={this}></TabTwoDAEditor>);
    this.openFile();
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


}