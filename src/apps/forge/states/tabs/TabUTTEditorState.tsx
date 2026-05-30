import { TabState } from "@/apps/forge/states/tabs/TabState";
import * as KotOR from "@/apps/forge/KotOR";
import React from "react";
import { EditorFile } from "@/apps/forge/EditorFile";
import { TabUTTEditor } from "@/apps/forge/components/tabs/tab-utt-editor/TabUTTEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { ForgeTrigger } from "@/apps/forge/module-editor/ForgeTrigger";

export class TabUTTEditorState extends TabState {
  tabName: string = `UTT`;
  trigger: ForgeTrigger = new ForgeTrigger();
  
  get blueprint(): KotOR.GFFObject {
    return this.trigger.blueprint;
  }

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabUTTEditor tab={this}></TabUTTEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Trigger Blueprint',
        accept: {
          'application/octet-stream': ['.utt']
        }
      }
    ];

    this.addEventListener('onTabRemoved', (tab: TabState) => {
      
    });
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
          this.trigger = new ForgeTrigger(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'utt'){
      this.trigger.templateResRef = resref;
      this.updateFile();
      return this.trigger.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }
  
  updateFile(){
    this.trigger.exportToBlueprint();
  }

}