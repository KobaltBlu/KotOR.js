/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

/* @file
 * The ModuleItem class.
 */

export class ModuleItem extends ModuleObject {

  constructor ( gff = new GFFObject() ) {
    super();

    if(typeof gff === 'string'){
      this.equippedRes = gff;
      this.template = new GFFObject();
      this.template.RootNode.AddField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).SetValue(gff);
    }else{
      this.template = gff;
    }

    // if(gff instanceof GFFObject && gff.RootNode.HasField('ObjectId')){
    //   this.id = gff.GetFieldByLabel('ObjectId').GetValue();
    // }else if(gff instanceof GFFObject && gff.RootNode.HasField('ID')){
    //   this.id = gff.GetFieldByLabel('ID').GetValue();
    // }else{
    //   this.id = -1;
    // }

    //this.id = -1;

    this.baseItem = 0;
    this.addCost = 0;
    this.cost = 0;
    this.modelVariation = 0;
    this.textureVariation = 1;
    this.palleteID = 0;
    this.loaded = false;
    this.properties = [];
    this.upgradeItems = {};
    this.placedInWorld = false;
    this.possessor = undefined;

    this.InitProperties();

  }

  update(delta = 0){
    if(this.model instanceof OdysseyModel3D)
      this.model.update(delta);
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

  isRangedWeapon(){
    return this.getBaseItem().rangedweapon == 1;
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
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Disguise)){
        return true;
      }
    }
    return false;
  }

  getDisguiseAppearance(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Disguise)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDisguiseAppearanceId(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Disguise)){
        return property.subType;
      }
    }
    return -1;
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
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Armor)){
        bonus += property.getValue();
      }
    }
    return parseInt(this.getBaseItem().baseac) + bonus;
  }

  getDexBonus(){
    if(this.baseItem){
      return parseInt(this.baseItem.dexbonus) || 0;
    }
    return 0;
  }

  getAttackBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.AttackBonus)){
        return property.getValue();
      }
    }
    return 0;
  }

  getBaseDamage(){
    if(parseInt(this.getBaseItem().numdice)){
      return CombatEngine.DiceRoll(parseInt(this.getBaseItem().numdice), 'd'+this.getBaseItem().dietoroll);
    }
    return 0;
  }

  getMonsterDamage(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Monster_Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDamageBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDamageType(){
    return this.getBaseItem().damageflags;
  }

  getSTRBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Ability, 0)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDEXBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Ability, 1)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCONBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Ability, 2)){
        return property.getValue();
      }
    }
    return 0;
  }

  getINTBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Ability, 3)){
        return property.getValue();
      }
    }
    return 0;
  }

  getWISBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Ability, 4)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCHABonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItem.PROPERTY.Ability, 5)){
        return property.getValue();
      }
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
            onLoad(undefined);
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

    GameState.ModelLoader.load({
      file: DefaultModel,
      onLoad: (mdl) => {
        OdysseyModel3D.FromMDL(mdl, {
          onComplete: (model) => {
            this.model = model;
            //TextureLoader.LoadQueue(() => {
              if(typeof onLoad === 'function')
                onLoad(model);
            //});
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
        let item = new ModuleItem(gff);
        item.InitProperties();
        if(typeof onLoad === 'function')
          onLoad(item);
      },
      onFail: () => {
        console.error('ModuleItem.FromResRef', 'Failed to load item template', sResRef);
        if(typeof onLoad === 'function')
          onLoad(undefined);
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
      if(property.propertyName == ModuleItem.PROPERTY.CastSpell){
        spells.push(new TalentSpell(property.subType));
      }
    }

    return spells;
  }

  InitProperties(){

    if(this.loaded){
      return;
    }
    
    if(!this.initialized){
      if(this.template.RootNode.HasField('ObjectId')){
        this.id = this.template.GetFieldByLabel('ObjectId').GetValue();
      }else if(this.template.RootNode.HasField('ID')){
        this.id = this.template.GetFieldByLabel('ID').GetValue();
      }else{
        this.id = ModuleObject.COUNT++;
      }
      
      ModuleObject.List.set(this.id, this);
    }

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
        this.properties.push( 
          new ItemProperty( 
            GFFObject.FromStruct( propertiesList[i] ), 
            this 
          ) 
        );
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

    this.initialized = true

  }

  setPossessor( oCreature = undefined){
    this.possessor = oCreature;
  }

  getPossessor(){
    return this.possessor;
  }

  onEquip(oCreature = undefined){
    console.log('ModuleItem.onEquip', oCreature, this);
    if(oCreature instanceof ModuleCreature){
      if(this.isDisguise()){
        oCreature.removeEffectsByType( GameEffectType.EffectDisguise ); //EFFECT_DISGUISE
        let eDisguise = new EffectDisguise( this.getDisguiseAppearanceId() );
        eDisguise.setCreator(this);
        eDisguise.setAttachedObject(oCreature);
        oCreature.addEffect( eDisguise );
      }
    }
    if(PartyManager.party.indexOf(oCreature) >= 0){
      InventoryManager.removeItem(this);
    }else{
      //oCreature.inventory.push(this);
    }
    this.setPossessor(oCreature);
  }

  onUnEquip(oCreature = undefined){
    console.log('ModuleItem.onUnEquip', oCreature, this);
    if(oCreature instanceof ModuleCreature){
      oCreature.removeEffectsByCreator(this);
    }
    if(PartyManager.party.indexOf(oCreature) >= 0){
      InventoryManager.addItem(this);
    }else{
      //oCreature.inventory.push(this);
    }
    this.setPossessor(undefined);
  }

  save(){
    let itemStruct = new GFFStruct(0);

    if(this.id >= 0)
      itemStruct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);
    
    itemStruct.AddField( new GFFField(GFFDataType.INT, 'BaseItem') ).SetValue(this.getBaseItemId());
    itemStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Identified') ).SetValue(this.identified);
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).SetValue(this.template.GetFieldByLabel('Description').GetCExoLocString());
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'DescIdentified') ).SetValue(this.template.GetFieldByLabel('DescIdentified').GetCExoLocString());
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).SetValue(this.template.GetFieldByLabel('LocalizedName').GetCExoLocString());
    itemStruct.AddField( new GFFField(GFFDataType.WORD, 'StackSize') ).SetValue(this.stackSize);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Stolen') ).SetValue(this.stolen);
    itemStruct.AddField( new GFFField(GFFDataType.DWORD, 'Upgrades') ).SetValue(this.upgrades);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Dropable') ).SetValue(this.dropable);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Pickpocketable') ).SetValue(1);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'ModelVariation') ).SetValue(this.modelVariation);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Charges') ).SetValue(this.charges);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'MaxCharges') ).SetValue(this.maxCharges);
    itemStruct.AddField( new GFFField(GFFDataType.DWORD, 'Cost') ).SetValue(this.cost);
    itemStruct.AddField( new GFFField(GFFDataType.DWORD, 'AddCost') ).SetValue(this.addCost);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Plot') ).SetValue(this.plot);

    let propertiesList = itemStruct.AddField( new GFFField(GFFDataType.LIST, 'PropertiesList') );
    for(let i = 0; i < this.properties.length; i++){
      propertiesList.AddChildStruct( this.properties[i].save() );
    }

    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue(this.xPosition);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue(this.yPosition);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue(this.zPosition);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).SetValue(this.xOrientation);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).SetValue(this.yOrientation);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).SetValue(this.zOrientation);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'NonEquippable') ).SetValue(this.nonEquippable);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'NewItem') ).SetValue(this.newItem);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'DELETING') ).SetValue(0);

    return itemStruct;
  }

}

class ItemProperty {

  constructor(template = undefined, item = undefined){
    this.template = template;
    this.item = item;
    this.InitProperties();
  }

  getProperty(){
    return Global.kotor2DA.itempropdef.rows[this.propertyName];
  }

  getPropertyName(){
    const property = this.getProperty();
    if(property){
      if(property.name != '****'){
        return TLKManager.GetStringById(property.name);
      }else{
        return TLKManager.GetStringById(0);
      }
    }
    return new Error(`Invalid Item Property`);
  }

  getSubType(){
    const property = this.getProperty();
    if(property && property.subtyperesref != '****'){
      return Global.kotor2DA[property.subtyperesref.toLowerCase()].rows[this.subType];
    }
  }

  getSubtypeName(){
    const subType = this.getSubType();
    if(subType){
      if(subType.name != '****'){
        return TLKManager.GetStringById(subType.name);
      }else{
        return TLKManager.GetStringById(0);
      }
    }
    return new Error(`Invalid Item Property Sub Type`);
  }

  getCostTable(){
    const costTableName = Global.kotor2DA.iprp_costtable.rows[this.costTable].name.toLowerCase();
    return Global.kotor2DA[costTableName];
  }

  getCostTableRow(){
    const costTable = this.getCostTable();
    if(costTable){
      return costTable.rows[this.costValue];
    }
    return undefined;
  }

  //Determine if the property requires an upgrade to use, or if it is always useable
  isUseable(){
    const upgrade_flag = (1 << this.upgradeType);
    //If no upgrade is required or the upgrade is present on the item
    if(this.upgradeType == -1 || ((this.item.upgrades & upgrade_flag) == upgrade_flag)){
      return true;
    }
    return false;
  }

  is(property = undefined, subType = undefined){
    if(typeof property != 'undefined' && typeof subType != 'undefined'){
      return this.propertyName == property && this.subType == subType;
    }else{
      return this.propertyName == property;
    }
  }

  costTableRandomCheck(){
    //Random Cost Check
    if(this.costValue == 0){
      let rowCount = costTable.rows.length - 1;
      let randomCostValue = (Math.floor(Math.random() * rowCount) + 1); 
      return costTable.rows[randomCostValue];
    }
    return this.getCostTableRow();
  }

  getValue(){
    let costTable = this.getCostTable();
    let costTableRow = this.getCostTableRow();
    if(costTableRow){
      switch(this.costTable){
        case ModuleItem.COSTTABLE.Base1:

        break;
        case ModuleItem.COSTTABLE.Bonus:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          return parseInt(costTableRow.value);
        break;
        case ModuleItem.COSTTABLE.Melee:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          return parseInt(costTableRow.value);
        break;
        case ModuleItem.COSTTABLE.SpellUse:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

        break;
        case ModuleItem.COSTTABLE.Damage:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          if(costTableRow.numdice != '****'){
            return CombatEngine.DiceRoll(parseInt(costTableRow.numdice), 'd'+costTableRow.die);
          }else{
            return parseInt(costTableRow.label);
          }
        break;
        case ModuleItem.COSTTABLE.Immune:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.value);
        break;
        case ModuleItem.COSTTABLE.DamageSoak:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.amount);
        break;
        case ModuleItem.COSTTABLE.DamageResist:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.amount);
        break;
        case ModuleItem.COSTTABLE.DancingScimitar:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

        break;
        case ModuleItem.COSTTABLE.Slots:
          
        break;
        case ModuleItem.COSTTABLE.Monster_Cost:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          if(costTableRow.numdice != '****'){
            return CombatEngine.DiceRoll(parseInt(costTableRow.numdice), 'd'+costTableRow.die);
          }
        break;

      }
    }

    return 0;
  }

  InitProperties(){
    if(this.template.RootNode.HasField('PropertyName'))
      this.propertyName = this.template.RootNode.GetFieldByLabel('PropertyName').GetValue();
    
    if(this.template.RootNode.HasField('Subtype'))
      this.subType = this.template.RootNode.GetFieldByLabel('Subtype').GetValue();

    if(this.template.RootNode.HasField('CostTable'))
      this.costTable = this.template.RootNode.GetFieldByLabel('CostTable').GetValue();

    if(this.template.RootNode.HasField('CostValue'))
      this.costValue = this.template.RootNode.GetFieldByLabel('CostValue').GetValue();

    if(this.template.RootNode.HasField('Param1'))
      this.param1 = this.template.RootNode.GetFieldByLabel('Param1').GetValue();

    if(this.template.RootNode.HasField('Param1Value'))
      this.param1Value = this.template.RootNode.GetFieldByLabel('Param1Value').GetValue();

    if(this.template.RootNode.HasField('ChanceAppear'))
      this.chanceAppear = this.template.RootNode.GetFieldByLabel('ChanceAppear').GetValue();

    if(this.template.RootNode.HasField('UsesPerDay'))
      this.usesPerDay = this.template.RootNode.GetFieldByLabel('UsesPerDay').GetValue();

    if(this.template.RootNode.HasField('Useable'))
      this.useable = this.template.RootNode.GetFieldByLabel('Useable').GetValue();

    if(this.template.RootNode.HasField('UpgradeType'))
      this.upgradeType = this.template.RootNode.GetFieldByLabel('UpgradeType').GetValue();
  }

  save(){
    let propStruct = new GFFStruct(0);

    propStruct.AddField( new GFFField(GFFDataType.WORD, 'PropertyName') ).SetValue( this.propertyName == -1 ? 255 : this.propertyName);
    propStruct.AddField( new GFFField(GFFDataType.WORD, 'SubType') ).SetValue( this.subType == -1 ? 255 : this.subType);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'CostTable') ).SetValue( this.costTable == -1 ? 255 : this.costTable);
    propStruct.AddField( new GFFField(GFFDataType.WORD, 'CostValue') ).SetValue( this.costValue == -1 ? 255 : this.costValue);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'Param1') ).SetValue( this.param1 == -1 ? 255 : this.param1);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'Param1Value') ).SetValue( this.param1Value == -1 ? 255 : this.param1Value);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'ChanceAppear') ).SetValue( this.chanceAppear == -1 ? 255 : this.chanceAppear);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'UsesPerDay') ).SetValue( this.usesPerDay == -1 ? 255 : this.usesPerDay);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'Usable') ).SetValue( this.useable == -1 ? 255 : this.useable);
    propStruct.AddField( new GFFField(GFFDataType.BYTE, 'UpgradeType') ).SetValue( this.upgradeType == -1 ? 255 : this.upgradeType);

    return propStruct;
  }

}

ModuleItem.PROPERTY = {
  Ability: 0,
  Armor: 1,
  ArmorAlignmentGroup: 2,
  ArmorDamageType: 3,
  ArmorRacialGroup: 4,
  AttackBonus: 38,
  AttackBonusAlignmentGroup: 39,
  AttackBonusRacialGroup: 40,
  AttackPenalty: 8,
  Blaster_Bolt_Defect_Decrease: 56,
  Blaster_Bolt_Deflect_Increase: 55,
  BonusFeats: 9,
  CastSpell: 10,
  Computer_Spike: 53,
  Damage: 11,
  DamageAlignmentGroup: 12,
  DamageImmunity: 14,
  DamageMelee: 22,
  DamageNone: 31,
  DamagePenalty: 15,
  DamageRacialGroup: 13,
  DamageRanged: 23,
  DamageReduced: 16,
  DamageResist: 17,
  Damage_Vulnerability: 18,
  DecreaseAC: 20,
  DecreaseAbilityScore: 19,
  DecreasedSkill: 21,
  Disguise: 59,
  Droid_Repair_Kit: 58,
  Enhancement: 5,
  EnhancementAlignmentGroup: 6,
  EnhancementRacialGroup: 7,
  Freedom_of_Movement: 50,
  Immunity: 24,
  ImprovedMagicResist: 25,
  ImprovedSavingThrows: 26,
  ImprovedSavingThrowsSpecific: 27,
  Keen: 28,
  Light: 29,
  Massive_Criticals: 49,
  Mighty: 30,
  Monster_Damage: 51,
  OnHit: 32,
  OnMonsterHit: 48,
  ReducedSavingThrows: 33,
  ReducedSpecificSavingThrow: 34,
  Regeneration: 35,
  Regeneration_Force_Points: 54,
  Skill: 36,
  Special_Walk: 52,
  ThievesTools: 37,
  ToHitPenalty: 41,
  Trap: 46,
  True_Seeing: 47,
  UnlimitedAmmo: 42,
  UseLimitationAlignmentGroup: 43,
  UseLimitationClass: 44,
  UseLimitationRacial: 45,
  Use_Limitation_Feat: 57,
};

ModuleItem.COSTTABLE = {
  Ammo: 14,
  Base1: 0,
  Bonus: 1,
  Damage: 4,
  DamageResist: 7,
  DamageSoak: 6,
  Damage_vulnerability: 22,
  DancingScimitar: 8,
  Immune: 5,
  Light: 18,
  Melee: 2,
  Monster_Cost: 19,
  Negative_Modifiers: 21,
  OnHitCosts: 24,
  OnHitDC_saves: 25,
  Slots: 9,
  SpellLevel: 13,
  SpellResist: 11,
  SpellUse: 3,
  Spell_Level_Immunity: 23,
  Spells: 16,
  Stamina: 12,
  Traps: 17,
  Weight: 10,
  WeightReduction: 15,
}