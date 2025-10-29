import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import * as THREE from 'three';
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTWEditor } from "../../components/tabs/tab-utw-editor/TabUTWEditor";

export class TabUTWEditorState extends TabState {
  tabName: string = `UTW`;
  blueprint: KotOR.GFFObject;
  templateResRef: string = '';
  appearance: number = 0;
  comment: string = '';
  description: KotOR.CExoLocString = new KotOR.CExoLocString();
  hasMapNote: boolean = false;
  linkedTo: string = '';
  localizedName: KotOR.CExoLocString = new KotOR.CExoLocString();
  mapNote: KotOR.CExoLocString = new KotOR.CExoLocString();
  mapNoteEnabled: boolean = false;
  paletteID: number = 0;
  tag: string = '';

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabUTWEditor tab={this}></TabUTWEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Waypoint Blueprint',
        accept: {
          'application/octet-stream': ['.utw']
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
    if(!this.blueprint) return;
    const root = this.blueprint.RootNode;
    if(!root) return;

    if(root.hasField('Appearance'))
      this.appearance = this.blueprint.getFieldByLabel('Appearance').getValue();

    if(root.hasField('Comment'))
      this.comment = this.blueprint.getFieldByLabel('Comment').getValue();

    if(root.hasField('Description'))
      this.description = this.blueprint.getFieldByLabel('Description').getCExoLocString();

    if(root.hasField('HasMapNote'))
      this.hasMapNote = !!this.blueprint.getFieldByLabel('HasMapNote').getValue();

    if(root.hasField('LinkedTo'))
      this.linkedTo = this.blueprint.getFieldByLabel('LinkedTo').getValue();

    if(root.hasField('LocalizedName'))
      this.localizedName = this.blueprint.getFieldByLabel('LocalizedName').getCExoLocString();

    if(root.hasField('MapNote'))
      this.mapNote = this.blueprint.getFieldByLabel('MapNote').getCExoLocString();

    if(root.hasField('MapNoteEnabled'))
      this.mapNoteEnabled = !!this.blueprint.getFieldByLabel('MapNoteEnabled').getValue();

    if(root.hasField('PaletteID'))
      this.paletteID = this.blueprint.getFieldByLabel('PaletteID').getValue();

    if(root.hasField('Tag'))
      this.tag = this.blueprint.getFieldByLabel('Tag').getValue();

    if(root.hasField('TemplateResRef'))
      this.templateResRef = this.blueprint.getFieldByLabel('TemplateResRef').getValue();
  }

  show(): void {
    super.show();
  }

  hide(): void {
    super.hide();
  }

  animate(delta: number = 0){
    //todo
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'uts'){
      this.templateResRef = resref;
      this.updateFile();
      return this.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    const utw = new KotOR.GFFObject();
    utw.FileType = 'UTW ';
    utw.RootNode.type = -1;
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Appearance', this.appearance) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment ) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description ) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'HasMapNote', this.hasMapNote ? 1 : 0) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'LinkedTo', this.linkedTo ) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocalizedName', this.localizedName ) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'MapNote', this.mapNote ) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'MapNoteEnabled', this.mapNoteEnabled ? 1 : 0) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'Tag', this.tag ) );
    utw.RootNode.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef ) );

    this.file.buffer = utw.getExportBuffer();
    this.processEventListener('onEditorFileChange', [this]);
  }

}
