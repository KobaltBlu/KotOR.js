import React from "react";

import { TabUTMEditor } from "@/apps/forge/components/tabs/tab-utm-editor/TabUTMEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeStore, StoreItemEntry } from "@/apps/forge/module-editor/ForgeStore";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabUTMEditorState extends TabState {
  tabName: string = `UTM`;
  store: ForgeStore = new ForgeStore();

  get blueprint(): KotOR.GFFObject {
    return this.store.blueprint;
  }

  get itemList(): StoreItemEntry[] {
    return this.store.itemList;
  }

  set itemList(value: StoreItemEntry[]) {
    this.store.itemList = value;
  }

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabUTMEditorState constructor entry');
    super(options);

    this.setContentView(<TabUTMEditor tab={this}></TabUTMEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Store Blueprint',
        accept: {
          'application/octet-stream': ['.utm']
        }
      }
    ];
    log.trace('TabUTMEditorState constructor exit');
  }

  public openFile(file?: EditorFile){
    log.trace('TabUTMEditorState openFile entry', !!file);
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();
        log.debug('TabUTMEditorState openFile tabName', this.tabName);

        file.readFile().then( (response) => {
          this.store = new ForgeStore(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          log.trace('TabUTMEditorState openFile loaded');
          resolve(this.blueprint);
        });
      } else {
        log.trace('TabUTMEditorState openFile no file');
      }
    });
  }

  show(): void {
    log.trace('TabUTMEditorState show');
    super.show();
  }

  hide(): void {
    log.trace('TabUTMEditorState hide');
    super.hide();
  }

  animate(delta: number = 0){
    // Store editor has no continuous animation; override for future 3D preview if needed.
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    log.trace('TabUTMEditorState getExportBuffer', resref, ext);
    if(!!resref && ext == 'utm'){
      this.store.templateResRef = resref;
      this.store.resref = resref;
      this.updateFile();
      return this.store.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    log.trace('TabUTMEditorState updateFile');
    this.store.exportToBlueprint();
    if(this.file){
      this.file.buffer = this.store.blueprint.getExportBuffer();
      this.processEventListener('onEditorFileChange', [this]);
    }
  }
}

