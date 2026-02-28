import React from "react";

import { TabUTTEditor } from "@/apps/forge/components/tabs/tab-utt-editor/TabUTTEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeTrigger } from "@/apps/forge/module-editor/ForgeTrigger";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabUTTEditorState extends TabState {
  tabName: string = `UTT`;
  trigger: ForgeTrigger = new ForgeTrigger();

  get blueprint(): KotOR.GFFObject {
    return this.trigger.blueprint;
  }

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabUTTEditorState constructor entry');
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

    this.addEventListener('onTabRemoved', (_tab: TabState) => {});
    log.trace('TabUTTEditorState constructor exit');
  }

  public openFile(file?: EditorFile){
    log.trace('TabUTTEditorState openFile entry', !!file);
    return new Promise<KotOR.GFFObject>( (resolve, _reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();
        log.debug('TabUTTEditorState openFile tabName', this.tabName);

        file.readFile().then( (response) => {
          this.trigger = new ForgeTrigger(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          log.trace('TabUTTEditorState openFile loaded');
          resolve(this.blueprint);
        });
      } else {
        log.trace('TabUTTEditorState openFile no file');
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    log.trace('TabUTTEditorState getExportBuffer', resref, ext);
    if(!!resref && ext == 'utt'){
      this.trigger.templateResRef = resref;
      this.updateFile();
      return this.trigger.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    log.trace('TabUTTEditorState updateFile');
    this.trigger.exportToBlueprint();
  }
}
