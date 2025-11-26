import React from "react";
import { TabState } from "./TabState";
import { EditorFile } from "../../EditorFile";
import * as KotOR from "../../KotOR";
import BaseTabStateOptions from "../../interfaces/BaseTabStateOptions";
import { TabUTIEditor } from "../../components/tabs/tab-uti-editor/TabUTIEditor";
import { UI3DRenderer } from "../../UI3DRenderer";
import * as THREE from "three";

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
  modelVariation: number = 1;
  upgradeLevel: number = 0;

  ui3DRenderer: UI3DRenderer;
  model: KotOR.OdysseyModel3D;
  kBaseItem: any = {};

  constructor(options: BaseTabStateOptions = {}){
    super(options);

    this.ui3DRenderer = new UI3DRenderer();
    this.ui3DRenderer.addEventListener('onBeforeRender', this.animate.bind(this));
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
    
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: keyof TabUTIEditorState, newValue: any, oldValue: any){
    let modelNeedsUpdate = false;
    if(property === 'baseItem'){
      this.loadBaseItem();
      modelNeedsUpdate = true;
    }
    if(property === 'modelVariation'){
      modelNeedsUpdate = true;
    }
    if(modelNeedsUpdate){
      this.loadModel();
    }
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
          this.loadBaseItem();
          this.loadModel().then( () => {
            this.ui3DRenderer.scene.add(this.model);
            this.processEventListener('onEditorFileLoad', [this]);
          });
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
      this.modelVariation = this.blueprint.getFieldByLabel('ModelVariation').getValue() || 1;
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

  loadBaseItem(){
    if(!this.baseItem){ 
      this.kBaseItem = {};
      return this.kBaseItem;
    }
    const twodaObject = KotOR.TwoDAManager.datatables.get('baseitems');
    if(!twodaObject) return;
    return this.kBaseItem = twodaObject.getRowByIndex(this.baseItem);
  }

  async loadModel(){
    if(this.model){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch(e){}
    }

    if(!this.baseItem){ 
      this.model = new KotOR.OdysseyModel3D;
      return this.model;
    }

    const itemclass = this.stringCleaner(this.kBaseItem.itemclass);
    let defaultModel = this.stringCleaner(this.kBaseItem.defaultmodel);

    if(defaultModel != 'i_null'){
      defaultModel = this.nthStringConverter(defaultModel, this.modelVariation);
      if(!parseInt(defaultModel.substr(-3))){
        defaultModel = itemclass+'_'+(('000'+this.modelVariation).substr(-3));
      }
    }

    try{
      const mdl = await KotOR.MDLLoader.loader.load(defaultModel);
      const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
        context: this.ui3DRenderer,
        lighting: true
      });
      this.model = model;
      this.ui3DRenderer.scene.add(this.model);
      this.updateCameraFocus();
      return this.model;
    }catch(e){
      this.model = new KotOR.OdysseyModel3D;
      return this.model;
    }
  }

  stringCleaner(str: string = ''){
    return str.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
  }

  nthStringConverter(name = '', nth = 1){
    let value = nth.toString();
    name = name.substr(0, name.length - value.length);
    return name + value;
  }

  box3: THREE.Box3 = new THREE.Box3();
  center: THREE.Vector3 = new THREE.Vector3();
  size: THREE.Vector3 = new THREE.Vector3();
  origin: THREE.Vector3 = new THREE.Vector3();

  updateCameraFocus(){
    if(!this.model) return;

    this.model.position.set(0, 0, 0);
    this.box3.setFromObject(this.model);

    this.box3.getCenter(this.center);
    this.box3.getSize(this.size);

    //Center the object to 0
    this.model.position.set(-this.center.x, -this.center.y, -this.center.z);
    this.ui3DRenderer.camera.position.z = 0;
    this.ui3DRenderer.camera.position.y = this.size.x + this.size.y;
    this.ui3DRenderer.camera.lookAt(this.origin)
  }

  animate(delta: number){
    if(!this.model) return;
    this.model.update(delta);
    //rotate the object in the viewport
    this.model.rotation.z += delta;
  }

  async getExportBuffer(resref?: string, ext?: string): Promise<Uint8Array> {
    if(!!resref && ext == 'uti'){
      this.templateResRef = resref;
      this.updateFile();
      return this.blueprint.getExportBuffer();
    }
    return super.getExportBuffer(resref, ext);
  }

  show(): void {
    super.show();
    this.ui3DRenderer.enabled = true;
    this.updateCameraFocus();
    this.ui3DRenderer.render();
  }

  hide(): void {
    super.hide();
    this.ui3DRenderer.enabled = false;
    this.ui3DRenderer.render();
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

