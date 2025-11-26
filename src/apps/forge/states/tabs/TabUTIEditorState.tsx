import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTIEditor } from "../../components/tabs/tab-uti-editor/TabUTIEditor";

export interface ItemPropertyEntry {
  chanceAppear: number;
  costTable: number;
  costValue: number;
  param1: number;
  param1Value: number;
  propertyName: number;
  subtype: number;
}

export class TabUTIEditorState extends TabState {
  tabName: string = `UTI`;
  blueprint: KotOR.GFFObject;

  addCost: number = 0;
  baseItem: number = 0;
  charges: number = 0;
  cost: number = 0;
  descIdentified: KotOR.CExoLocString = new KotOR.CExoLocString();
  description: KotOR.CExoLocString = new KotOR.CExoLocString();
  locName: KotOR.CExoLocString = new KotOR.CExoLocString();
  plot: boolean = false;
  stackSize: number = 1;
  stolen: boolean = false;
  tag: string = '';
  templateResRef: string = '';
  comment: string = '';
  paletteID: number = 0;
  properties: ItemPropertyEntry[] = [];
  identified: boolean = true;
  modelVariation: number = 0;
  upgradeLevel: number = 0;

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.setContentView(<TabUTIEditor tab={this}></TabUTIEditor>);
    this.openFile();
    this.saveTypes = [
      {
        description: 'Odyssey Item Blueprint',
        accept: {
          'application/octet-stream': ['.uti']
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

    if(root.hasField('AddCost')){
      this.addCost = this.blueprint.getFieldByLabel('AddCost').getValue() || 0;
    }

    if(root.hasField('BaseItem')){
      this.baseItem = this.blueprint.getFieldByLabel('BaseItem').getValue() || 0;
    }

    if(root.hasField('Charges')){
      this.charges = this.blueprint.getFieldByLabel('Charges').getValue() || 0;
    }

    if(root.hasField('Cost')){
      this.cost = this.blueprint.getFieldByLabel('Cost').getValue() || 0;
    }

    if(root.hasField('Plot')){
      this.plot = this.blueprint.getFieldByLabel('Plot').getValue() || false;
    }

    if(root.hasField('StackSize')){
      this.stackSize = this.blueprint.getFieldByLabel('StackSize').getValue() || 1;
    }

    if(root.hasField('Stolen')){
      this.stolen = this.blueprint.getFieldByLabel('Stolen').getValue() || false;
    }

    if(root.hasField('PaletteID')){
      this.paletteID = this.blueprint.getFieldByLabel('PaletteID').getValue() || 0;
    }

    if(root.hasField('Tag')){
      this.tag = this.blueprint.getFieldByLabel('Tag').getValue() || '';
    }

    if(root.hasField('TemplateResRef')){
      this.templateResRef = this.blueprint.getFieldByLabel('TemplateResRef').getValue() || '';
    }

    if(root.hasField('Comment')){
      this.comment = this.blueprint.getFieldByLabel('Comment').getValue() || '';
    }

    if(root.hasField('Identified')){
      this.identified = this.blueprint.getFieldByLabel('Identified').getValue() || true;
    }

    if(root.hasField('ModelVariation')){
      this.modelVariation = this.blueprint.getFieldByLabel('ModelVariation').getValue() || 0;
    }

    if(root.hasField('UpgradeLevel')){
      this.upgradeLevel = this.blueprint.getFieldByLabel('UpgradeLevel').getValue() || 0;
    }

    if(root.hasField('LocalizedName')){
      this.locName = this.blueprint.getFieldByLabel('LocalizedName').getCExoLocString() || new KotOR.CExoLocString();
    }

    if(root.hasField('Description')){
      this.description = this.blueprint.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    }

    if(root.hasField('DescIdentified')){
      this.descIdentified = this.blueprint.getFieldByLabel('DescIdentified').getCExoLocString() || new KotOR.CExoLocString();
    }

    this.properties = [];
    if(root.hasField('PropertiesList')){
      const propertiesField = this.blueprint.getFieldByLabel('PropertiesList');
      const structs = propertiesField?.getChildStructs() || [];
      this.properties = structs.map((struct: KotOR.GFFStruct) => {
        const getValue = (label: string, defaultValue = 0) => struct.hasField(label) ? struct.getFieldByLabel(label).getValue() ?? defaultValue : defaultValue;
        return {
          chanceAppear: getValue('ChanceAppear', 100),
          costTable: getValue('CostTable', 0),
          costValue: getValue('CostValue', 0),
          param1: getValue('Param1', 255),
          param1Value: getValue('Param1Value', 0),
          propertyName: getValue('PropertyName', 0),
          subtype: getValue('Subtype', 0),
        } as ItemPropertyEntry;
      });
    }
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'uti'){
      this.templateResRef = resref;
      this.updateFile();
      return this.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  updateFile(){
    const uti = new KotOR.GFFObject();
    uti.FileType = 'UTI ';
    uti.RootNode.type = -1;

    const root = uti.RootNode;
    if(!root) return;

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'AddCost', this.addCost) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'BaseItem', this.baseItem) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Charges', this.charges) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Cost', this.cost) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'DescIdentified', this.descIdentified ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Identified', this.identified ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocalizedName', this.locName ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'ModelVariation', this.modelVariation) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'PaletteID', this.paletteID) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Plot', this.plot ? 1 : 0) );

    const propertiesField = root.addField( new KotOR.GFFField(KotOR.GFFDataType.LIST, 'PropertiesList') );
    if(propertiesField){
      for(const property of this.properties){
        const struct = new KotOR.GFFStruct();
        struct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'ChanceAppear', property.chanceAppear) );
        struct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'CostTable', property.costTable) );
        struct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'CostValue', property.costValue) );
        struct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Param1', property.param1) );
        struct.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Param1Value', property.param1Value) );
        struct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'PropertyName', property.propertyName) );
        struct.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'Subtype', property.subtype) );
        propertiesField.addChildStruct(struct);
      }
    }

    root.addField( new KotOR.GFFField(KotOR.GFFDataType.WORD, 'StackSize', this.stackSize) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Stolen', this.stolen ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef ) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'UpgradeLevel', this.upgradeLevel || 0) );

    this.file.buffer = uti.getExportBuffer();
    this.processEventListener('onEditorFileChange', [this]);
  }
}

