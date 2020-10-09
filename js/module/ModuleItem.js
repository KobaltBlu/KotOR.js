/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleItem class.
 */

class ModuleItem extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super();

    if(typeof gff === 'string'){
      this.equippedRes = gff;
      this.template = new GFFObject();
      this.template.RootNode.AddField(new Field(GFFDataTypes.RESREF, 'EquippedRes')).SetValue(gff);
    }else{
      this.template = gff;
    }

    this.id = -1;

    this.baseItem = 0;
    this.modelVariation = 0;
    this.textureVariation = 1;
    this.palleteID = 0;
    this.loaded = false;
    this.properties = [];
    this.upgradeItems = {};

    this.InitProperties();

  }

  getDescription(){
    return this.descIdentified;
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
    return parseInt(this.getBaseItem().weaponwield);
  }

  getWeaponType(){
    return parseInt(this.getBaseItem().weapontype);
  }

  isStolen(){
    return this.stolen;
  }

  isInfinite(){
    return this.infinite;
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

  setStackSize(num){
    return this.stackSize = num;
  }

  getLocalizedName(){
    return this.localizedName.GetValue().replace(/\0[\s\S]*$/g,'');
  }

  getPalleteID(){
    return this.palleteID;
  }

  getTag(){
    return this.tag;
  }

  getACBonus(){

    for(let i = 0, len = this.properties.length; i < len; i++){
      let prop = this.properties[i];
      //Defense Bonus
      if(prop.propertyName == 17){
        return prop.costValue;
      }
    }

    return 0;
  }

  getDexBonus(){
    if(this.baseItem){
      return parseInt(this.baseItem.dexbonus) || 0;
    }
    return 0;
  }

  getAttackBonus(){
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.propertyName == 38){ //Attack_Bonus
        let upgrade_flag = (1 << property.upgradeType);
        //If no upgrade is required or the upgrade is present on the item
        if(property.upgradeType == -1 || ((this.upgrades & upgrade_flag) == upgrade_flag)){
          let costTableName = Global.kotor2DA.iprp_costtable.rows[property.costTable].name.toLowerCase();
          let costTable = Global.kotor2DA[costTableName];
          let costTableRow = costTable.rows[property.costValue];

          //Random Cost
          if(property.costValue == 0){
            let rowCount = costTable.rows.length - 1;
            let randomCostValue = Math.floor(Math.random() * rowCount) + 1; 
            costTableRow = costTable.rows[randomCostValue];
          }

          if(property.costTable == 2){ //Melee
            bonus += parseInt(costTableRow.value);
          }

        }
      }
    }
    return bonus;
  }

  getDamageBonus(){
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.propertyName == 11){ //Damage_Bonus
        let upgrade_flag = (1 << property.upgradeType);
        //If no upgrade is required or the upgrade is present on the item
        if(property.upgradeType == -1 || ((this.upgrades & upgrade_flag) == upgrade_flag)){
          let costTableName = Global.kotor2DA.iprp_costtable.rows[property.costTable].name.toLowerCase();
          let costTable = Global.kotor2DA[costTableName];
          let costTableRow = costTable.rows[property.costValue];

          //Random Cost
          if(property.costValue == 0){
            let rowCount = costTable.rows.length - 1;
            let randomCostValue = Math.floor(Math.random() * rowCount) + 1; 
            costTableRow = costTable.rows[randomCostValue];
          }

          if(property.costTable == 4){ //Damage
            if(costTableRow.numdice != '****'){
              bonus += CombatEngine.DiceRoll(parseInt(costTableRow.numdice), 'd'+costTableRow.die);
            }else{
              bonus += parseInt(costTableRow.label);
            }
          }

        }
      }
    }
    return bonus;
  }

  getMonsterDamage(){
    let damage = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.propertyName == 51){ //Monster_Damage
        let upgrade_flag = (1 << property.upgradeType);
        //If no upgrade is required or the upgrade is present on the item
        if(property.upgradeType == -1 || ((this.upgrades & upgrade_flag) == upgrade_flag)){
          let costTableName = Global.kotor2DA.iprp_costtable.rows[property.costTable].name.toLowerCase();
          let costTable = Global.kotor2DA[costTableName];
          let costTableRow = costTable.rows[property.costValue];

          //Random Cost
          if(property.costValue == 0){
            let rowCount = costTable.rows.length - 1;
            let randomCostValue = Math.floor(Math.random() * rowCount) + 1; 
            costTableRow = costTable.rows[randomCostValue];
          }

          if(property.costTable == 19){ //Monster_Cost
            if(costTableRow.numdice != '****'){
              damage += CombatEngine.DiceRoll(parseInt(costTableRow.numdice), 'd'+costTableRow.die);
            }
          }

        }
      }
      return damage;
    }

  }

  getBaseDamage(){
    if(parseInt(this.getBaseItem().numdice)){
      return CombatEngine.DiceRoll(parseInt(this.getBaseItem().numdice), 'd'+this.getBaseItem().dietoroll);
    }
    return 0;
  }

  castAmmunitionAtTarget(oCaster = undefined, oTarget = undefined){
    if(typeof oTarget != 'undefined'){
      let ammunitiontype = parseInt(this.getBaseItem().ammunitiontype);
      if( ammunitiontype >= 1 ){
        let ammunition = Global.kotor2DA.ammunitiontypes.rows[ammunitiontype];
        if(typeof ammunition != 'undefined'){
          
        }
      }

    }
  }

  Load( onLoad = null ){

    if(!this.loaded && this.getEquippedRes()){
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
          if(onLoad != null)
            onLoad(this);
        }
      });

    }else if(!this.loaded && this.getInventoryRes()){
      //Load template and merge fields
      //console.log('ModuleItem', 'Loading Template', this.getInventoryRes())
      TemplateLoader.Load({
        ResRef: this.getInventoryRes(),
        ResType: ResourceTypes.uti,
        onLoad: (gff) => {
          //console.log('ModuleItem', 'Template Loaded')
          this.template.Merge(gff);
          this.InitProperties();
          this.loaded = true;
          if(onLoad != null)
            onLoad(this);
        },
        onFail: () => {
          console.error('Failed to load item template');
          if(onLoad != null)
            onLoad(this);
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
    let itemclass = this.getBaseItem()['itemclass'];
    let DefaultModel = this.getBaseItem()['defaultmodel'];
    itemclass = itemclass.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
    DefaultModel = DefaultModel.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();

    if(DefaultModel != 'i_null'){
      DefaultModel = this.nthStringConverter(DefaultModel, this.getModelVariation());
      if(!parseInt(DefaultModel.substr(-3))){
        DefaultModel = itemclass+'_'+(('000'+this.getModelVariation()).substr(-3));
      }
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
          lighting: true,
          //castShadow: false,
          //receiveShadow: false
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
      ResRef: sResRef.toLowerCase(),
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

  getSpells(){
    let spells = [];

    //propertyName, subType, costTable, costValue, param1, param1Value, chanceAppear, usesPerDay, useable, upgradeType
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      //Activate Item
      if(property.propertyName == 10){
        spells.push(new TalentSpell({id: property.subType}));
      }
    }

    return spells;
  }

  InitProperties(){

    if(this.loaded){
      return;
    }
    
    if(this.template.RootNode.HasField('ObjectId'))
      this.id = this.template.GetFieldByLabel('ObjectId').GetValue();

    if(this.template.RootNode.HasField('AddCost'))
      this.addCost = parseInt(this.template.GetFieldByLabel('AddCost').GetValue());

    if(this.template.RootNode.HasField('BaseItem'))
      this.baseItem = this.template.GetFieldByLabel('BaseItem').GetValue();

    if(this.template.RootNode.HasField('Charges'))
      this.charges = this.template.GetFieldByLabel('Charges').GetValue();

    if(this.template.RootNode.HasField('Cost'))
      this.cost = parseInt(this.template.GetFieldByLabel('Cost').GetValue());

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

    if(this.template.RootNode.HasField('Infinite'))
      this.infinite = this.template.GetFieldByLabel('Infinite').GetValue();

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
      let propertiesList = this.template.GetFieldByLabel('PropertiesList').GetChildStructs();
      this.properties = [];
      for(let i = 0, len = propertiesList.length; i < len; i++){
        let property = propertiesList[i];
        this.properties.push({
          propertyName: property.GetFieldByLabel('PropertyName')?.GetValue(),
          subType: property.GetFieldByLabel('Subtype')?.GetValue(),
          costTable: property.GetFieldByLabel('CostTable')?.GetValue(),
          costValue: property.GetFieldByLabel('CostValue')?.GetValue(),
          param1: property.GetFieldByLabel('Param1')?.GetValue(),
          param1Value: property.GetFieldByLabel('Param1Value')?.GetValue(),
          chanceAppear: property.GetFieldByLabel('ChanceAppear')?.GetValue(),
          usesPerDay: property.GetFieldByLabel('UsesPerDay')?.GetValue(),
          useable: property.GetFieldByLabel('Useable')?.GetValue(),
          upgradeType: property.GetFieldByLabel('UpgradeType')?.GetValue(),
        });
      }
    }

    if(this.template.RootNode.HasField('StackSize'))
      this.stackSize = this.template.GetFieldByLabel('StackSize').GetValue();

    if(this.template.RootNode.HasField('Stolen'))
      this.stolen = this.template.GetFieldByLabel('Stolen').GetValue();

    if(this.template.RootNode.HasField('Tag'))
      this.tag = this.template.GetFieldByLabel('Tag').GetValue().replace(/\0[\s\S]*$/g,'');

    if(this.template.RootNode.HasField('TextureVar'))
      this.textureVariation = this.template.GetFieldByLabel('TextureVar').GetValue();

    if(this.template.RootNode.HasField('Upgrades')){
      this.upgrades = this.template.GetFieldByLabel('Upgrades').GetValue();
    }

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

    if(this.template.RootNode.HasField('PaletteID'))
      this.palleteID = this.template.RootNode.GetFieldByLabel('PaletteID').GetValue();

  }


}

module.exports = ModuleItem;