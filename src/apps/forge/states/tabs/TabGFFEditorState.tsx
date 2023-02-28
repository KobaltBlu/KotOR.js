import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabGFFEditor } from "../../components/tabs/TabGFFEditor";


export type TabGFFEditorStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onEditorFileLoad'|'onNodeSelected';

export interface TabGFFEditorStateEventListeners extends TabStateEventListeners {
  onEditorFileLoad: Function[],
  onNodeSelected: Function[],
}

export class TabGFFEditorState extends TabState {

  protected eventListeners: TabGFFEditorStateEventListeners = {
    onTabDestroyed: [],
    onTabRemoved: [],
    onTabShow: [],
    onTabHide: [],
    onTabNameChange: [],
    onEditorFileLoad: [],
    onEditorFileChange: [],
    onEditorFileSaved: [],
    onNodeSelected: [],
  };

  tabName: string = `GFF`;
  gff: KotOR.GFFObject;

  selectedNode: KotOR.GFFField|KotOR.GFFStruct;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.tabContentView = <TabGFFEditor tab={this}></TabGFFEditor>
    this.openFile();
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.gff = new KotOR.GFFObject(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.gff);
        });
      }
    });
  }

  show(): void {
    super.show();
  }

  hide(): void {
    super.hide();
  }

  setSelectedField(node: KotOR.GFFField|KotOR.GFFStruct){
    if(node){
      this.selectedNode = node;
      this.processEventListener('onNodeSelected', [node]);
    }
  }

}
