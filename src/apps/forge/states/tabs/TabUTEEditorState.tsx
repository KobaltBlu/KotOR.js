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

    this.addEventListener('onPropertyChange', (property: string, value: any) => {
      if(property === 'difficultyIndex'){
        // Difficulty should match the VALUE from encdifficulty.2da (obsolete but must match)
        this.encounter.difficulty = this.encounterDifficulties[value].value;
      }
    });

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
          this.encounter = new ForgeEncounter(response.buffer);
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'ute'){
      this.encounter.templateResRef = resref;
      this.updateFile();
      return this.encounter.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }
  
  updateFile(){
    this.encounter.exportToBlueprint();
  }

}