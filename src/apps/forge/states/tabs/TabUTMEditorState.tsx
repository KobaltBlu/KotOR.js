import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTMEditor } from "../../components/tabs/tab-utm-editor/TabUTMEditor";
import { ForgeStore, StoreItemEntry } from "../../module-editor/ForgeStore";

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
  }

  public openFile(file?: EditorFile){
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();

        file.readFile().then( (response) => {
          this.store = new ForgeStore(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
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

  animate(delta: number = 0){
    // Store editor has no continuous animation; override for future 3D preview if needed.
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'utm'){
      this.store.templateResRef = resref;
      this.store.resref = resref;
      this.updateFile();
      return this.store.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    this.store.exportToBlueprint();
    if(this.file){
      this.file.buffer = this.store.blueprint.getExportBuffer();
      this.processEventListener('onEditorFileChange', [this]);
    }
  }
}

