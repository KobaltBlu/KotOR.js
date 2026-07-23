import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabGFFEditor } from "@/apps/forge/components/tabs/tab-gff-editor/TabGFFEditor";


export type TabGFFEditorStateEventListenerTypes =
TabStateEventListenerTypes & 
  ''|'onEditorFileLoad'|'onNodeSelected';

export interface TabGFFEditorStateEventListeners extends TabStateEventListeners {
  onEditorFileLoad: Function[],
  onNodeSelected: Function[],
}

export class TabGFFEditorState extends TabState {

  tabName: string = `GFF`;
  gff: KotOR.GFFObject;
  private forcedExportExt?: 'json';

  selectedNode: KotOR.GFFField|KotOR.GFFStruct;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabGFFEditor tab={this}></TabGFFEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Generic File Format (GFF)',
        accept: {
          'application/octet-stream': ['.gff']
        }
      },
      {
        description: 'JSON',
        accept: {
          'application/json': ['.json']
        }
      }
    ];
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

  async exportAsJson(){
    const jsonSaveType = {
      description: 'JSON',
      accept: {
        'application/json': ['.json']
      }
    };
    const previousSaveTypes = this.saveTypes;
    const previousForcedExportExt = this.forcedExportExt;
    const previousFileExt = this.file?.ext;
    this.saveTypes = [jsonSaveType];
    this.forcedExportExt = 'json';
    if(this.file){
      this.file.ext = 'json';
    }
    try{
      return await this.saveAs();
    }finally{
      this.forcedExportExt = previousForcedExportExt;
      this.saveTypes = previousSaveTypes;
      if(this.file){
        this.file.ext = previousFileExt;
      }
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    const normalizedExt = (this.forcedExportExt || ext || '').replace(/^\./, '').toLowerCase();
    if(normalizedExt === 'json'){
      const textEncoder = new TextEncoder();
      return textEncoder.encode(this.gff.toJSONString());
    }
    return this.gff.getExportBuffer();
  }

}
