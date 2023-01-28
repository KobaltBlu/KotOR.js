import React from "react";
import { TabTwoDAEditor } from "../../components/tabs/TabTwoDAEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import { TwoDAObject } from "../../../../resource/TwoDAObject";

declare const KotOR: any;

export class TabTwoDAEditorState extends TabState {
  tabName: string = `2DA`;
  twoDAObject: TwoDAObject;
  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.tabContentView = <TabTwoDAEditor tab={this}></TabTwoDAEditor>
    this.openFile();
  }

  openFile(file?: EditorFile){
    return new Promise<TwoDAObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile( (buffer: Buffer) => {
          this.twoDAObject = new KotOR.TwoDAObject(buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.twoDAObject);
        });
      }
    });

  }


}