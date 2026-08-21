import { TabState, UpdateFileOptions } from "@/apps/forge/states/tabs/TabState";
import * as KotOR from "@/apps/forge/KotOR";
import React from "react";
import { EditorFile } from "@/apps/forge/EditorFile";
import { snapshotGff } from "@/apps/forge/helpers/gffUndoSnapshot";
import { beginUtxFileUpdate, finishUtxUndoApply } from "@/apps/forge/helpers/UTxEditorHelpers";
import { TabUTEEditor } from "@/apps/forge/components/tabs/tab-ute-editor/TabUTEEditor";
import BaseTabStateOptions from "@/apps/forge/interfaces/BaseTabStateOptions";
import { EncounterDifficulty } from "@/apps/forge/interfaces/EncounterDifficulty";
import { ForgeEncounter } from "@/apps/forge/module-editor/ForgeEncounter";
import { encounterDifficultyValueAt } from "@/apps/forge/helpers/encounterDifficultyValue";

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
        this.encounter.difficulty = encounterDifficultyValueAt(value, this.encounterDifficulties);
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
          this.encounter = new ForgeEncounter(response.buffer, file.resref);
          this.clearUndoHistory();
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'ute'){
      this.encounter.templateResRef = resref;
      this.updateFile({ skipHistory: true });
      return this.encounter.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(options?: UpdateFileOptions){
    beginUtxFileUpdate(this, options);
    this.encounter.exportToBlueprint();
  }

  protected captureUndoState(): Uint8Array | undefined {
    return snapshotGff(this.blueprint);
  }

  protected applyUndoState(state: Uint8Array): void {
    this.encounter = new ForgeEncounter(state, this.file?.resref);
    finishUtxUndoApply(this);
  }

}