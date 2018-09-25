/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleItem class.
 */

class ModuleItem extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super();
    this.template = gff;

    this.baseItem = 0;
    this.modelVariation = 0;
    this.textureVariation = 1;

    this.InitProperties();

  }

  getBaseItemId(){
    return this.baseItem;
  }

  getBaseItem(){
    return Global.kotor2DA['baseitems'].rows[this.getBaseItemId()];
  }

  getBodyVariation(){
    return this.getBaseItem().bodyvar;
  }

  getModelVariation(){
    return this.modelVariation || 1;
  }

  getTextureVariation(){
    return this.textureVariation || 1;
  }

  getIcon(){
    return 'i'+this.getBaseItem().itemclass+'_'+("000" + this.getModelVariation()).slice(-3);
  }

  getWeaponWield(){
    return null;
  }

  isStolen(){
    return this.stolen;
  }

  getPropertiesList(){
    if(this.template.RootNode.HasField('PropertiesList')){
      return this.template.RootNode.GetFieldByLabel('PropertiesList').GetChildStructs();
    }
    return null;
  }

  isDisguise(){
    let propsList = this.getPropertiesList();
    for(let i = 0; i < propsList.length; i++){
      let prop = propsList[i];
      if(prop.GetFieldByLabel('PropertyName').GetValue() == 59){
        return true;
      }
    }
    return false;
  }

  getDisguiseAppearance(){
    let propsList = this.getPropertiesList();
    for(let i = 0; i < propsList.length; i++){
      let prop = propsList[i];
      if(prop.GetFieldByLabel('PropertyName').GetValue() == 59){
        return prop.GetFieldByLabel('Subtype').GetValue();
      }
    }
    return 0;
  }

  getName(){
    return this.getLocalizedName();
  }

  getEquippedRes(){
    return this.equippedRes;
  }

  getInventoryRes(){
    return this.inventoryRes;
  }

  getStackSize(){
    return this.stackSize;
  }

  setStackSize(iNum){
    return this.stackSize = iNum;
  }

  getLocalizedName(){
    return this.localizedName.GetValue().replace(/\0[\s\S]*$/g,'');
  }

  getTag(){
    return this.tag;
  }

  Load( onLoad = null ){
    if(this.getEquippedRes()){
      //Load template and merge fields
      //console.log('ModuleItem', 'Loading Template', this.getEquippedRes())
      TemplateLoader.Load({
        ResRef: this.getEquippedRes(),
        ResType: ResourceTypes.uti,
        onLoad: (gff) => {
          //console.log('ModuleItem', 'Template Loaded')
          this.template.Merge(gff);
          this.InitProperties();
          if(onLoad != null)
            onLoad(this);
          
        },
        onFail: () => {
          console.error('Failed to load item template');
        }
      });

    }else if(this.getInventoryRes()){
      //Load template and merge fields
      //console.log('ModuleItem', 'Loading Template', this.getInventoryRes())
      TemplateLoader.Load({
        ResRef: this.getInventoryRes(),
        ResType: ResourceTypes.uti,
        onLoad: (gff) => {
          //console.log('ModuleItem', 'Template Loaded')
          this.template.Merge(gff);
          this.InitProperties();
          if(onLoad != null)
            onLoad(this);
        },
        onFail: () => {
          console.error('Failed to load item template');
        }
      });

    }else{
      //console.log('ModuleItem', '(From SAVEGAME)')
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      //this.LoadModel( () => {
        //console.log('ModuleItem', 'Model Loaded')
        if(onLoad != null)
          onLoad(this);
      //});
    }
  }

  LoadModel(onLoad = null){
    let DefaultModel = this.getBaseItem()['defaultmodel'];
    DefaultModel = DefaultModel.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();

    if(DefaultModel != 'i_null'){
      DefaultModel = this.nthStringConverter(DefaultModel, this.getModelVariation());
    }

    Game.ModelLoader.load({
      file: DefaultModel,
      onLoad: (mdl) => {
        THREE.AuroraModel.FromMDL(mdl, {
          onComplete: (model) => {
            this.model = model;
            //this.model.buildSkeleton();
            TextureLoader.LoadQueue(() => {
              if(typeof onLoad === 'function')
                onLoad(model);
            });
          },
          context: this.context,
          castShadow: false,
          receiveShadow: false
        });
      }
    });
  }

  nthStringConverter(name = '', nth = 1){
    nth = nth.toString();
    name = name.substr(0, name.length - nth.length);
    return name + nth;
  }

  static FromResRef(sResRef, onLoad = null){
    
    TemplateLoader.Load({
      ResRef: sResRef,
      ResType: ResourceTypes.uti,
      onLoad: (gff) => {
        //console.log('ModuleItem', 'Template Loaded')
        let item = new ModuleItem(gff);
        item.InitProperties();
        if(typeof onLoad === 'function')
          onLoad(item);
      },
      onFail: () => {
        console.error('Failed to load item template');
      }
    });

  }

  /*getIcon(onLoad = null){

    let baseClass = Global.kotor2DA.baseitems.rows[this.template.GetFieldByLabel('BaseItem').Value]['itemclass'].toLowerCase();
    let texVariantNode = this.template.GetFieldByLabel('TextureVar');
    let modelVariantNode = this.template.GetFieldByLabel('ModelVariation');

    let variant = 1;

    if(texVariantNode != null)
      variant = texVariantNode.Value;
    else if(modelVariantNode != null)
      variant = modelVariantNode.Value;

    let file = 'erf.swpc_tex_gui://i'+baseClass+'_'+Utility.PadInt(variant, 3)+'.tpc';

    let loader = new FileLoader({
      file: file,
      onLoad: (buffer) => {

        let icon = new TPCObject({file: buffer});
        if(typeof onLoad == 'function')
          onLoad(icon);
        
      }
    })
  }*/

  InitProperties(){

    if(this.template.RootNode.HasField('AddCost'))
      this.addCost = this.template.GetFieldByLabel('AddCost').GetValue();

    if(this.template.RootNode.HasField('BaseItem'))
      this.baseItem = this.template.GetFieldByLabel('BaseItem').GetValue();

    if(this.template.RootNode.HasField('Charges'))
      this.charges = this.template.GetFieldByLabel('Charges').GetValue();

    if(this.template.RootNode.HasField('Cost'))
      this.cost = this.template.GetFieldByLabel('Cost').GetValue();

    if(this.template.RootNode.HasField('DELETING'))
      this.deleting = this.template.GetFieldByLabel('DELETING').GetValue();

    if(this.template.RootNode.HasField('DescIdentified'))
      this.descIdentified = this.template.GetFieldByLabel('DescIdentified').GetValue();

    if(this.template.RootNode.HasField('Description'))
      this.description = this.template.GetFieldByLabel('Description').GetValue();

    if(this.template.RootNode.HasField('Dropable'))
      this.dropable = this.template.GetFieldByLabel('Dropable').GetValue();
      
    if(this.template.RootNode.HasField('EquippedRes'))
      this.equippedRes = this.template.GetFieldByLabel('EquippedRes').GetValue();

    if(this.template.RootNode.HasField('Identified'))
      this.identified = this.template.GetFieldByLabel('Identified').GetValue();

    if(this.template.RootNode.HasField('InventoryRes'))
      this.inventoryRes = this.template.GetFieldByLabel('InventoryRes').GetValue();
  
    if(this.template.RootNode.HasField('LocalizedName'))
      this.localizedName = this.template.RootNode.GetFieldByLabel('LocalizedName').GetCExoLocString();
        
    if(this.template.RootNode.HasField('MaxCharges'))
      this.maxCharges = this.template.RootNode.GetFieldByLabel('MaxCharges').GetValue();

    if(this.template.RootNode.HasField('ModelVariation'))
      this.modelVariation = this.template.RootNode.GetFieldByLabel('ModelVariation').GetValue();
    
    if(this.template.RootNode.HasField('NewItem'))
      this.newItem = this.template.RootNode.GetFieldByLabel('NewItem').GetValue();
        
    if(this.template.RootNode.HasField('NonEquippable'))
      this.nonEquippable = this.template.RootNode.GetFieldByLabel('NonEquippable').GetValue();
  
    if(this.template.RootNode.HasField('Pickpocketable'))
      this.pickpocketable = this.template.RootNode.GetFieldByLabel('Pickpocketable').GetValue();
      
    if(this.template.RootNode.HasField('Plot'))
      this.plot = this.template.GetFieldByLabel('Plot').GetValue();

    if(this.template.RootNode.HasField('PropertiesList')){
      //TODO
      //this.locName = this.template.GetFieldByLabel('PropertiesList').GetValue();
    }

    if(this.template.RootNode.HasField('StackSize'))
      this.stackSize = this.template.GetFieldByLabel('StackSize').GetValue();

    if(this.template.RootNode.HasField('Stolen'))
      this.stolen = this.template.GetFieldByLabel('Stolen').GetValue();

    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue().replace(/\0[\s\S]*$/g,'');

    if(this.template.RootNode.HasField('TextureVar'))
      this.textureVariation = this.template.GetFieldByLabel('TextureVar').GetValue();

    if(this.template.RootNode.HasField('Upgrades'))
      this.upgrades = this.template.GetFieldByLabel('Upgrades').GetValue();

    if(this.template.RootNode.HasField('XPosition'))
      this.xPosition = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.yPosition = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.zPosition = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

    if(this.template.RootNode.HasField('XOrientation'))
      this.xOrientation = this.template.RootNode.GetFieldByLabel('XOrientation').GetValue();

    if(this.template.RootNode.HasField('YOrientation'))
      this.yOrientation = this.template.RootNode.GetFieldByLabel('YOrientation').GetValue();

    if(this.template.RootNode.HasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.GetFieldByLabel('ZOrientation').GetValue();

  }


}

module.exports = ModuleItem;