import { TabState } from "./TabState";
import * as KotOR from "../../KotOR";
import React from "react";
import { EditorFile } from "../../EditorFile";
import { TabUTTEditor } from "../../components/tabs/tab-utt-editor/TabUTTEditor";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";

export class TabUTTEditorState extends TabState {

  tabName: string = `UTT`;
  blueprint: KotOR.GFFObject;
  autoRemoveKey: boolean = false;
  comment: string = '';
  cursor: number = 0;
  disarmDC: number = 0;
  faction: number = 0;
  localizedName: KotOR.CExoLocString = new KotOR.CExoLocString();
  maxCreatures: number = 0;
  onClick: string = '';
  onDisarm: string = '';
  onTrapTriggered: string = '';
  onHeartbeat: string = '';
  onUserDefined: string = '';
  onEnter: string = '';
  onExit: string = '';
  paletteID: number = 0;
  playerOnly: boolean = false;
  recCreatures: number = 0;
  reset: boolean = false;
  resetTime: number = 0;
  respawns: number = 0;
  spawnOption: number = 0;
  tag: string = '';
  templateResRef: string = '';
  highlightHeight: number = 0;
  keyName: string = '';
  loadScreenID: number = 0;
  portraitId: number;
  trapDetectDC: number;
  trapDetectable: boolean;
  trapDisarmable: boolean;
  trapFlag: boolean;
  trapOneShot: boolean;
  trapType: number;
  t_type: number;

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
    this.autoRemoveKey = this.blueprint.getFieldByLabel('AutoRemoveKey').getValue() || false;
    this.comment = this.blueprint.getFieldByLabel('Comment').getValue() || '';
    this.cursor = this.blueprint.getFieldByLabel('Cursor').getValue() || 0;
    this.disarmDC = this.blueprint.getFieldByLabel('DisarmDC').getValue() || 0;
    this.faction = this.blueprint.getFieldByLabel('Faction').getValue() || 0;
    this.highlightHeight = this.blueprint.getFieldByLabel('HighlightHeight').getValue() || 0;
    this.keyName = this.blueprint.getFieldByLabel('KeyName').getValue() || 0;
    this.loadScreenID = this.blueprint.getFieldByLabel('LoadScreenID').getValue() || 0;
    this.localizedName = this.blueprint.getFieldByLabel('LocalizedName').getCExoLocString();
    this.onClick = this.blueprint.getFieldByLabel('OnClick').getValue() || '';
    this.onDisarm = this.blueprint.getFieldByLabel('OnDisarm').getValue() || '';
    this.onTrapTriggered = this.blueprint.getFieldByLabel('OnTrapTriggered').getValue() || '';
    this.paletteID = this.blueprint.getFieldByLabel('PaletteID').getValue() || 0;
    this.portraitId = this.blueprint.getFieldByLabel('PortraitId').getValue() || 0;
    this.onHeartbeat = this.blueprint.getFieldByLabel('ScriptOnHeartbeat').getValue() || '';
    this.onEnter = this.blueprint.getFieldByLabel('ScriptOnEnter').getValue() || '';
    this.onExit = this.blueprint.getFieldByLabel('ScriptOnExit').getValue() || '';
    this.onUserDefined = this.blueprint.getFieldByLabel('ScriptOnUserDefine').getValue() || '';
    this.tag = this.blueprint.getFieldByLabel('Tag').getValue() || '';
    this.templateResRef = this.blueprint.getFieldByLabel('TemplateResRef').getValue() || '';
    this.trapDetectDC = this.blueprint.getFieldByLabel('TrapDetectDC').getValue() || 0;
    this.trapDetectable = this.blueprint.getFieldByLabel('TrapDetectable').getValue() || false;
    this.trapDisarmable = this.blueprint.getFieldByLabel('TrapDisarmable').getValue() || false;
    this.trapFlag = this.blueprint.getFieldByLabel('TrapFlag').getValue() || false;
    this.trapOneShot = this.blueprint.getFieldByLabel('TrapOneShot').getValue() || false;
    this.trapType = this.blueprint.getFieldByLabel('TrapType').getValue() || 0;
    this.t_type = this.blueprint.getFieldByLabel('Type').getValue() || 0;
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
    ute.FileType = 'UTT ';
    ute.RootNode.type = -1;

    const root = ute.RootNode;
    if(!root) return;

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'AutoRemoveKey', this.autoRemoveKey ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Cursor', this.cursor & 0xFF) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'DisarmDC', this.disarmDC & 0xFF) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Faction', this.faction) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'HighlightHeight', this.highlightHeight) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'KeyName', this.keyName) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'LoadScreenID', this.loadScreenID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocalizedName', this.localizedName ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnClick', this.onClick ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnDisarm', this.onDisarm ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'OnTrapTriggered', this.onTrapTriggered ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'PortraitId', this.portraitId) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnHeartbeat', this.onHeartbeat ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnEnter', this.onEnter ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnExit', this.onExit ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'ScriptOnUserDefine', this.onUserDefined ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'TrapDetectDC', this.trapDetectDC) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDetectable', this.trapDetectable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapDisarmable', this.trapDisarmable ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapFlag', this.trapFlag ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapOneShot', this.trapOneShot ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'TrapType', this.trapType) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'Type', this.t_type) );

    this.file.buffer = ute.getExportBuffer();
    this.processEventListener('onEditorFileChange', [this]);
  }

}