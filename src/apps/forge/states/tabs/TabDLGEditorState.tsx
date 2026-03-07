import React from "react";
import { TabDLGEditor } from "../../components/tabs/tab-dlg-editor/TabDLGEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";

export class TabDLGEditorState extends TabState {
  tabName: string = 'DLG Editor';
  dlg?: KotOR.DLGObject;
  selectedNode?: KotOR.DLGNode;
  selectedNodeIndex: number = -1;
  selectedNodeType: 'starting' | 'entry' | 'reply' | null = null;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    if(this.file){
      this.tabName = this.file.getFilename();
    }

    this.saveTypes = [
      {
        description: 'Dialog File',
        accept: {
          'application/octet-stream': ['.dlg']
        }
      }
    ];

    this.setContentView(<TabDLGEditor tab={this}></TabDLGEditor>);
    this.openFile();
  }

  async openFile() {
    if(this.file){
      const response = await this.file.readFile();
      const gff = new KotOR.GFFObject(response.buffer);
      this.dlg = KotOR.DLGObject.FromGFFObject(gff);
      this.processEventListener('onEditorFileLoad', [this]);
    }
  }

  selectNode(node: KotOR.DLGNode | undefined, index: number, type: 'starting' | 'entry' | 'reply' | null) {
    this.selectedNode = node;
    this.selectedNodeIndex = index;
    this.selectedNodeType = type;
    this.processEventListener('onNodeSelected', [node, index, type]);
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(this.dlg && this.dlg.gff){
      return this.dlg.gff.getExportBuffer();
    }
    return new Uint8Array(0);
  }

  updateFile() {
    // Sync UI changes to dlg.gff if needed
    // For now, direct editing of gff fields in UI will already update the gff
  }

  getResourceID(): any {
    return this.file?.resref + this.file?.reskey;
  }
}
