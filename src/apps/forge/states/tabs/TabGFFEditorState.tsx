import React from "react";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import { EditorFile } from "@/apps/forge/EditorFile";
import * as KotOR from "@/apps/forge/KotOR";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { TabGFFEditor } from "@/apps/forge/components/tabs/tab-gff-editor/TabGFFEditor";
import { UTX_TEMPLATE_EXTENSIONS } from "@/apps/forge/commands/editorCommandGuards";

function gffSaveTypesForExt(ext?: string): FilePickerAcceptType[] {
  const key = (ext || "gff").replace(/^\./, "").toLowerCase() || "gff";
  return [
    {
      description: `${key.toUpperCase()} File`,
      accept: {
        "application/octet-stream": [`.${key}`],
      },
    },
  ];
}


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

  selectedNode: KotOR.GFFField|KotOR.GFFStruct;

  constructor(options: BaseTabStateOptions = {}){
    super(options);
    this.setContentView(<TabGFFEditor tab={this}></TabGFFEditor>);
    this.openFile();
    this.saveTypes = gffSaveTypesForExt(this.file?.ext);
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }
  
      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        const ext = String(this.file.ext || "").toLowerCase().replace(/^\./, "");
        if ((UTX_TEMPLATE_EXTENSIONS as readonly string[]).indexOf(ext) >= 0) {
          this.tabName = `${this.tabName} [GFF]`;
        }
        this.saveTypes = gffSaveTypesForExt(ext);
  
        file.readFile().then( (response) => {
          this.gff = new KotOR.GFFObject(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.gff);
        });
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if (this.gff) {
      return this.gff.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
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
