import { ForgeGameObject } from "./ForgeGameObject";
import * as KotOR from "../KotOR";
import { ItemPropertyEntry } from "../states/tabs/TabUTIEditorState";

export class ForgeItem extends ForgeGameObject {
  //GIT Instance Properties
  templateResType: typeof KotOR.ResourceTypes = KotOR.ResourceTypes.uti;

  //Blueprint Properties
  addCost: number = 0;
  baseItem: number = 0;
  charges: number = 0;
  comment: string = '';
  cost: number = 0;
  descIdentified: KotOR.CExoLocString = new KotOR.CExoLocString();
  description: KotOR.CExoLocString = new KotOR.CExoLocString();
  identified: boolean = true;
  locName: KotOR.CExoLocString = new KotOR.CExoLocString();
  modelVariation: number = 1;
  paletteID: number = 0;
  plot: boolean = false;
  properties: ItemPropertyEntry[] = [];
  stackSize: number = 1;
  stolen: boolean = false;
  tag: string = '';
  upgradeLevel: number = 0;

  // Model data
  model: KotOR.OdysseyModel3D;
  modelLoading: boolean = false;
  kBaseItem: any = {};

  constructor(buffer?: Uint8Array){
    super();
    if(buffer){
      this.loadFromBuffer(buffer);
    }
    this.addEventListener('onPropertyChange', this.onPropertyChange.bind(this));
  }

  onPropertyChange(property: string, newValue: any, oldValue: any){
    if(property === 'baseItem'){
      this.loadBaseItem();
      if(newValue !== oldValue){
        this.loadModel();
      }
    }
    if(property === 'modelVariation'){
      this.loadModel();
    }
  }

  loadFromBuffer(buffer: Uint8Array){
    this.blueprint = new KotOR.GFFObject(buffer);
    this.loadFromBlueprint();
  }

  loadFromBlueprint(){
    if(!this.blueprint) return;
    const root = this.blueprint.RootNode;
    if(!root) return;

    if(root.hasField('AddCost')){
      this.addCost = root.getFieldByLabel('AddCost').getValue() || 0;
    }
    if(root.hasField('BaseItem')){
      this.baseItem = root.getFieldByLabel('BaseItem').getValue() || 0;
    }
    if(root.hasField('Charges')){
      this.charges = root.getFieldByLabel('Charges').getValue() || 0;
    }
    if(root.hasField('Comment')){
      this.comment = root.getFieldByLabel('Comment').getValue() || '';
    }
    if(root.hasField('Cost')){
      this.cost = root.getFieldByLabel('Cost').getValue() || 0;
    }
    if(root.hasField('DescIdentified')){
      this.descIdentified = root.getFieldByLabel('DescIdentified').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('Description')){
      this.description = root.getFieldByLabel('Description').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('Identified')){
      this.identified = root.getFieldByLabel('Identified').getValue() !== undefined ? !!root.getFieldByLabel('Identified').getValue() : true;
    }
    if(root.hasField('LocalizedName')){
      this.locName = root.getFieldByLabel('LocalizedName').getCExoLocString() || new KotOR.CExoLocString();
    }
    if(root.hasField('ModelVariation')){
      this.modelVariation = root.getFieldByLabel('ModelVariation').getValue() || 1;
    }
    if(root.hasField('PaletteID')){
      this.paletteID = root.getFieldByLabel('PaletteID').getValue() || 0;
    }
    if(root.hasField('Plot')){
      this.plot = root.getFieldByLabel('Plot').getValue() || false;
    }
    if(root.hasField('PropertiesList')){
      const propertiesField = root.getFieldByLabel('PropertiesList');
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
    if(root.hasField('StackSize')){
      this.stackSize = root.getFieldByLabel('StackSize').getValue() || 1;
    }
    if(root.hasField('Stolen')){
      this.stolen = root.getFieldByLabel('Stolen').getValue() || false;
    }
    if(root.hasField('Tag')){
      this.tag = root.getFieldByLabel('Tag').getValue() || '';
    }
    if(root.hasField('TemplateResRef')){
      this.templateResRef = root.getFieldByLabel('TemplateResRef').getValue() || '';
    }
    if(root.hasField('UpgradeLevel')){
      this.upgradeLevel = root.getFieldByLabel('UpgradeLevel').getValue() || 0;
    }
  }

  exportToBlueprint(): KotOR.GFFObject {
    this.blueprint = new KotOR.GFFObject();
    this.blueprint.FileType = 'UTI ';
    this.blueprint.RootNode.type = -1;
    const root = this.blueprint.RootNode;
    if(!root) return this.blueprint;
    
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'AddCost', this.addCost) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.INT, 'BaseItem', this.baseItem) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Charges', this.charges) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Comment', this.comment) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.DWORD, 'Cost', this.cost) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'DescIdentified', this.descIdentified) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'Description', this.description) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'Identified', this.identified ? 1 : 0) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOLOCSTRING, 'LocalizedName', this.locName) );
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
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.CEXOSTRING, 'Tag', this.tag) );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef || '') );
    root.addField( new KotOR.GFFField(KotOR.GFFDataType.BYTE, 'UpgradeLevel', this.upgradeLevel || 0) );

    return this.blueprint;
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

  stringCleaner(str: string = ''){
    return str.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
  }

  nthStringConverter(name = '', nth = 1){
    const value = nth.toString();
    name = name.substr(0, name.length - value.length);
    return name + value;
  }

  async loadModel(){
    if(this.model){
      this.model.removeFromParent();
      try{ this.model.dispose(); }catch(e){}
    }

    if(!this.baseItem){ 
      this.model = new KotOR.OdysseyModel3D();
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
      this.modelLoading = true;
      this.processEventListener('onModelChange', [this]);
      const mdl = await KotOR.MDLLoader.loader.load(defaultModel);
      const model = await KotOR.OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        lighting: true
      });
      this.model = model;
      if(this.context && this.context.scene){
        this.context.scene.add(this.model);
      }
      this.modelLoading = false;
      this.processEventListener('onModelChange', [this]);
      return this.model;
    }catch(e){
      console.error(e);
      this.model = new KotOR.OdysseyModel3D();
      this.modelLoading = false;
      this.processEventListener('onModelChange', [this]);
      return this.model;
    }
  }

  async load(){
    this.loadBaseItem();
    await this.loadModel();
  }

  getGITInstance(): KotOR.GFFStruct {
    const instance = new KotOR.GFFStruct(0);
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.RESREF, 'TemplateResRef', this.templateResRef));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'XPosition', this.position.x));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'YPosition', this.position.y));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZOrientation', this.rotation.z));
    instance.addField(new KotOR.GFFField(KotOR.GFFDataType.FLOAT, 'ZPosition', this.position.z));
    return instance;
  }

  setGITInstance(strt: KotOR.GFFStruct){
    this.templateResRef = strt.getFieldByLabel('TemplateResRef').getValue() as string;
    this.rotation.z = strt.getFieldByLabel('XOrientation').getValue() as number;
    this.position.x = strt.getFieldByLabel('XPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('YOrientation').getValue() as number;
    this.position.y = strt.getFieldByLabel('YPosition').getValue() as number;
    this.rotation.z = strt.getFieldByLabel('ZOrientation').getValue() as number;
    this.position.z = strt.getFieldByLabel('ZPosition').getValue() as number;
  }

}