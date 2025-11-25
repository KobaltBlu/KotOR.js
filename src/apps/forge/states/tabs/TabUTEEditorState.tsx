import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";
import React from "react";
import { EditorFile } from "../../EditorFile";
import { TabUTEEditor } from "../../components/tabs/tab-ute-editor/TabUTEEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { CreatureListEntry } from "../../interfaces/CreatureListEntry";
import { EncounterDifficulty } from "../../interfaces/EncounterDifficulty";

export class TabUTEEditorState extends TabState {

  tabName: string = `UTE`;
  blueprint: KotOR.GFFObject;
  active: boolean = false;
  comment: string = '';
  creatureList: CreatureListEntry[] = [];
  difficulty: number = 0;
  difficultyIndex: number = 0;
  faction: number = 0;
  localizedName: KotOR.CExoLocString = new KotOR.CExoLocString();
  maxCreatures: number = 0;
  onEntered: string = '';
  onExhausted: string = '';
  onExit: string = '';
  onHeartbeat: string = '';
  onUserDefined: string = '';
  paletteID: number = 0;
  playerOnly: boolean = false;
  recCreatures: number = 0;
  reset: boolean = false;
  resetTime: number = 0;
  respawns: number = 0;
  spawnOption: number = 0;
  tag: string = '';
  templateResRef: string = '';

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
        this.tabName = this.file.getFilename();
  
        file.readFile().then( (response) => {
          this.blueprint = new KotOR.GFFObject(response.buffer);
          this.setPropsFromBlueprint();
          this.processEventListener('onEditorFileLoad', [this]);
          resolve(this.blueprint);
        });
      }
    });
  }

  setPropsFromBlueprint(){
    this.active = this.blueprint.getFieldByLabel('Active').getValue();
    this.comment = this.blueprint.getFieldByLabel('Comment').getValue();
    this.creatureList = this.blueprint.getFieldByLabel('CreatureList').getChildStructs().map( (struct) => {
      return {
        appearance: struct.getFieldByLabel('Appearance').getValue(),
        resref: struct.getFieldByLabel('ResRef').getValue(),
        cr: struct.getFieldByLabel('CR').getValue(),
        singleSpawn: !!struct.getFieldByLabel('SingleSpawn').getValue()
      } as CreatureListEntry;
    });
    this.difficulty = this.blueprint.getFieldByLabel('Difficulty').getValue();
    this.difficultyIndex = this.blueprint.getFieldByLabel('DifficultyIndex').getValue() || 0;
    this.faction = this.blueprint.getFieldByLabel('Faction').getValue() || 0;
    this.localizedName = this.blueprint.getFieldByLabel('LocalizedName').getCExoLocString();
    this.maxCreatures = this.blueprint.getFieldByLabel('MaxCreatures').getValue() || 0;
    this.onEntered = this.blueprint.getFieldByLabel('OnEntered').getValue() || '';
    this.onExhausted = this.blueprint.getFieldByLabel('OnExhausted').getValue() || '';
    this.onExit = this.blueprint.getFieldByLabel('OnExit').getValue() || '';
    this.onHeartbeat = this.blueprint.getFieldByLabel('OnHeartbeat').getValue() || '';
    this.onUserDefined = this.blueprint.getFieldByLabel('OnUserDefined').getValue() || '';
    this.paletteID = this.blueprint.getFieldByLabel('PaletteID').getValue() || 0;
    this.playerOnly = this.blueprint.getFieldByLabel('PlayerOnly').getValue() || false;
    this.recCreatures = this.blueprint.getFieldByLabel('RecCreatures').getValue() || 0;
    this.reset = this.blueprint.getFieldByLabel('Reset').getValue() || false;
    this.resetTime = this.blueprint.getFieldByLabel('ResetTime').getValue() || 0;
    this.respawns = this.blueprint.getFieldByLabel('Respawns').getValue() || 0;
    this.spawnOption = this.blueprint.getFieldByLabel('SpawnOption').getValue() || 0;
    this.tag = this.blueprint.getFieldByLabel('Tag').getValue() || '';
    this.templateResRef = this.blueprint.getFieldByLabel('TemplateResRef').getValue() || '';
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'ute'){
      this.templateResRef = resref;
      this.updateFile();
      return this.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    const ute = new KotOR.GFFObject();
    ute.FileType = 'UTE ';
    ute.RootNode.type = -1;

    const root = ute.RootNode;
    if(!root) return;

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Active', this.active ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment ) );

    const creatureListField = root.addField( new KotOR.GFFField(KotOR.GFFDataType.LIST, 'CreatureList') );
    for(let i = 0; i < this.creatureList.length; i++){
      if(!creatureListField) continue;
      const creature = this.creatureList[i];
      const creatureStruct = new KotOR.GFFStruct();
      creatureStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Appearance', creature.appearance) );
      creatureStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ResRef', creature.resref) );
      creatureStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'CR', creature.cr) );
      creatureStruct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'SingleSpawn', creature.singleSpawn ? 1 : 0) );
      creatureListField.addChildStruct( creatureStruct );
    }
    
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Difficulty', this.difficulty) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'DifficultyIndex', this.difficultyIndex) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Faction', this.faction) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocalizedName', this.localizedName ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'MaxCreatures', this.maxCreatures) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnEntered', this.onEntered ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnExhausted', this.onExhausted ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnExit', this.onExit ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnHeartbeat', this.onHeartbeat ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnUserDefined', this.onUserDefined ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PlayerOnly', this.playerOnly ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'RecCreatures', this.recCreatures) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Reset', this.reset ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'ResetTime', this.resetTime) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Respawns', this.respawns) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'SpawnOption', this.spawnOption) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Tag', this.tag ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef ) );

    this.file.buffer = ute.getExportBuffer();
    this.processEventListener('onEditorFileChange', [this]);
  }

}