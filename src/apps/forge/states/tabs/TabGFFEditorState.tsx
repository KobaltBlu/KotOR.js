import React from "react";

import { TabGFFEditor } from "@/apps/forge/components/tabs/tab-gff-editor/TabGFFEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { TabState, TabStateEventListenerTypes, TabStateEventListeners } from "@/apps/forge/states/tabs";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export type TabGFFEditorStateEventListenerTypes =
TabStateEventListenerTypes &
  ''|'onEditorFileLoad'|'onNodeSelected';

export interface TabGFFEditorStateEventListeners extends TabStateEventListeners {
  onEditorFileLoad: (() => void)[];
  onNodeSelected: (() => void)[];
}

export class TabGFFEditorState extends TabState {

  tabName: string = `GFF`;
  gff: KotOR.GFFObject;

  selectedNode: KotOR.GFFField|KotOR.GFFStruct;

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabGFFEditorState constructor entry');
    super(options);
    this.setContentView(<TabGFFEditor tab={this}></TabGFFEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Generic File Format (GFF)',
        accept: {
          'application/octet-stream': ['.gff']
        }
      }
    ];
    log.trace('TabGFFEditorState constructor exit');
  }

  public openFile(file?: EditorFile){
    log.trace('TabGFFEditorState openFile entry', !!file);
    return new Promise<KotOR.GFFObject>( (resolve, _reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
        log.trace('TabGFFEditorState openFile use this.file');
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.tabName = this.file.getFilename();
        log.debug('TabGFFEditorState openFile tabName', this.tabName);

        file.readFile().then( (response) => {
          this.gff = new KotOR.GFFObject(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          log.trace('TabGFFEditorState openFile loaded');
          resolve(this.gff);
        });
      } else {
        log.trace('TabGFFEditorState openFile no file');
      }
    });
  }

  show(): void {
    log.trace('TabGFFEditorState show');
    super.show();
  }

  hide(): void {
    log.trace('TabGFFEditorState hide');
    super.hide();
  }

  setSelectedField(node: KotOR.GFFField|KotOR.GFFStruct){
    log.trace('TabGFFEditorState setSelectedField', !!node);
    if(node){
      this.selectedNode = node;
      this.processEventListener('onNodeSelected', [node]);
    }
  }
}
