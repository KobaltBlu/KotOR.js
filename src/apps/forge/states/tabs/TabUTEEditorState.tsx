import React from "react";

import { TabUTEEditor } from "@/apps/forge/components/tabs/tab-ute-editor/TabUTEEditor";
import { EditorFile } from "@/apps/forge/EditorFile";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { EncounterDifficulty } from "@/apps/forge/interfaces/EncounterDifficulty";
import * as KotOR from "@/apps/forge/KotOR";
import { ForgeEncounter } from "@/apps/forge/module-editor/ForgeEncounter";
import { TabState } from "@/apps/forge/states/tabs/TabState";
import { createScopedLogger, LogScope } from "@/utility/Logger";

const log = createScopedLogger(LogScope.Forge);

export class TabUTEEditorState extends TabState {
  tabName: string = `UTE`;
  encounter: ForgeEncounter = new ForgeEncounter();
  
  get blueprint(): KotOR.GFFObject {
    return this.encounter.blueprint;
  }

  get creatureList() {
    return this.encounter.creatureList;
  }

  set creatureList(value) {
    this.encounter.creatureList = value;
  }

  encounterDifficulties: EncounterDifficulty[] = [];

  constructor(options: BaseTabStateOptions = {}){
    log.trace('TabUTEEditorState constructor entry');
    super(options);

    this.setContentView(<TabUTEEditor tab={this}></TabUTEEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Encounter Blueprint',
        accept: {
          'application/octet-stream': ['.ute']
        }
      }
    ];

    this.encounterDifficulties = KotOR.SWRuleSet.encounterDifficulties;

    this.addEventListener('onPropertyChange', (property: string, value: string | number | boolean | object | undefined) => {
      if(property === 'difficultyIndex'){
        this.encounter.difficulty = this.encounterDifficulties[value as number].value;
      }
    });

    this.addEventListener('onTabRemoved', (_tab: TabState) => {});
    log.trace('TabUTEEditorState constructor exit');
  }

  public openFile(file?: EditorFile){
    log.trace('TabUTEEditorState openFile entry', !!file);
    return new Promise<KotOR.GFFObject>( (resolve, reject) => {
      if(!file && this.file instanceof EditorFile){
        file = this.file;
      }

      if(file instanceof EditorFile){
        if(this.file != file) this.file = file;
        this.file.isBlueprint = true;
        this.tabName = this.file.getFilename();
        log.debug('TabUTEEditorState openFile tabName', this.tabName);

        file.readFile().then( (response) => {
          this.encounter = new ForgeEncounter(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          log.trace('TabUTEEditorState openFile loaded');
          resolve(this.blueprint);
        });
      } else {
        log.trace('TabUTEEditorState openFile no file');
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    log.trace('TabUTEEditorState getExportBuffer', resref, ext);
    if(!!resref && ext == 'ute'){
      this.encounter.templateResRef = resref;
      this.updateFile();
      return this.encounter.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }
  
  updateFile(){
    log.trace('TabUTEEditorState updateFile');
    this.encounter.exportToBlueprint();
  }
}