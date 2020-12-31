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
      if(property.propertyName == ModuleItem.PROPERTY.CastSpell){
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
        this.properties.push(new ItemProperty({
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
        }, this));
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

  onEquip(oCreature = undefined){
    console.log('ModuleItem.onEquip', oCreature, this);
    if(oCreature instanceof ModuleCreature){
      if(this.isDisguise()){
        oCreature.RemoveEffectsByType( GameEffect.Type.EffectDisguise ); //EFFECT_DISGUISE
        eDisguise = new EffectDisguise( this.getDisguiseAppearance() );
        eDisguise.setCreator(this);
        oCreature.AddEffect( eDisguise );
      }
    }
  }

  onUnEquip(oCreature = undefined){
    console.log('ModuleItem.onUnEquip', oCreature, this);
    if(oCreature instanceof ModuleCreature){
      oCreature.RemoveEffectsByCreator(this);
    }
  }


}

class ItemProperty {

  constructor(props = {}, item = undefined){
    this.propertyName = props.propertyName == 255 ? -1 : props.propertyName;
    this.subType = props.subType == 255 ? -1 : props.subType;
    this.costTable = props.costTable == 255 ? -1 : props.costTable;
    this.costValue = props.costValue == 255 ? -1 : props.costValue;
    this.param1 = props.param1 == 255 ? -1 : props.param1;
    this.param1Value = props.param1Value == 255 ? -1 : props.param1Value;
    this.chanceAppear = props.chanceAppear == 255 ? -1 : props.chanceAppear;
    this.usesPerDay = props.usesPerDay == 255 ? -1 : props.usesPerDay;
    this.useable = props.useable == 255 ? -1 : props.useable;
    this.upgradeType = props.upgradeType == 255 ? -1 : props.upgradeType;

    this.item = item;
  }

  getProperty(){
    return Global.kotor2DA.itempropdef.rows[this.propertyName];
  }

  getPropertyName(){
    let property;
    if(property = this.getProperty()){
      if(property.name != '****'){
        return Global.kotorTLK.GetStringById(property.name);
      }else{
        return Global.kotorTLK.GetStringById(0);
      }
    }
    return 'ERROR!!!';
  }

  getSubType(){
    let property;
    if(property = this.getProperty()){
      if(property && property.subtyperesref != '****'){
        return Global.kotor2DA[property.subtyperesref.toLowerCase()].rows[this.subType];
      }
    }
  }

  getSubtypeName(){
    let subType;
    if(subType = this.getSubType()){
      if(subType){
        if(subType.name != '****'){
          return Global.kotorTLK.GetStringById(subType.name);
        }else{
          return Global.kotorTLK.GetStringById(0);
        }
      }
    }
    return 'ERROR!!!';
  }

  getCostTable(){
    let costTableName = Global.kotor2DA.iprp_costtable.rows[this.costTable].name.toLowerCase();
    return Global.kotor2DA[costTableName];
  }

  getCostTableRow(){
    let costTable = this.getCostTable();
    if(costTable){
      return costTable.rows[this.costValue];
    }
    return undefined;
  }

  //Determine if the property requires an upgrade to use, or if it is always useable
  isUseable(){
    let upgrade_flag = (1 << this.upgradeType);
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

module.exports = ModuleItem;