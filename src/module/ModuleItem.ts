/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleObject } from ".";
import type { ModuleCreature } from ".";
import { BaseItem } from "../engine/BaseItem";
import { CombatEngine } from "../combat/CombatEngine";
import { EffectDisguise } from "../effects/EffectDisguise";
import { WeaponWield } from "../enums/combat/WeaponWield";
import { WeaponType } from "../enums/combat/WeaponType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleItemCostTable } from "../enums/module/ModuleItemCostTable";
import { ModuleItemProperty } from "../enums/module/ModuleItemProperty";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { GameState } from "../GameState";
import { OdysseyModel } from "../odyssey";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader, TemplateLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TalentSpell } from "../talents";
import { OdysseyModel3D } from "../three/odyssey";
import { TwoDAManager, PartyManager, InventoryManager, TLKManager, ModuleObjectManager } from "../managers";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";

/* @file
 * The ModuleItem class.
 */

export class ModuleItem extends ModuleObject {
  equippedRes: any;
  baseItem: number;
  _baseItem: BaseItem;
  addCost: number;
  cost: number;
  modelVariation: number;
  textureVariation: number;
  palleteID: number;
  loaded: boolean;
  properties: any[];
  upgradeItems: any = {};
  possessor: any;
  descIdentified: any;
  stolen: any;
  infinite: any;
  inventoryRes: any;
  stackSize: any;
  charges: any;
  deleting: any;
  dropable: any;
  identified: any;
  maxCharges: any;
  newItem: any;
  nonEquippable: any;
  pickpocketable: any;
  upgrades: any;

  constructor ( gff = new GFFObject() ) {
    super();
    this.objectType |= ModuleObjectType.ModuleItem;

    if(typeof gff === 'string'){
      this.equippedRes = gff;
      this.template = new GFFObject();
      this.template.RootNode.addField(new GFFField(GFFDataType.RESREF, 'EquippedRes')).setValue(gff);
    }else{
      this.template = gff;
    }

    // if(gff instanceof GFFObject && gff.RootNode.hasField('ObjectId')){
    //   this.id = gff.getFieldByLabel('ObjectId').getValue();
    // }else if(gff instanceof GFFObject && gff.RootNode.hasField('ID')){
    //   this.id = gff.getFieldByLabel('ID').getValue();
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

    this.initProperties();

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

  getBodyVariation(){
    return this._baseItem.bodyVar;
  }

  getModelVariation(){
    return this.modelVariation || 1;
  }

  getTextureVariation(){
    return this.textureVariation || 1;
  }

  getIcon(){
    return 'i'+this._baseItem.itemClass+'_'+("000" + this.getModelVariation()).slice(-3);
  }

  getWeaponWield(): WeaponWield{
    return this._baseItem.weaponWield;
  }

  getWeaponType(): WeaponType {
    return this._baseItem.weaponType;
  }

  isRangedWeapon(){
    return this._baseItem.rangedWeapon;
  }

  isStolen(){
    return this.stolen;
  }

  isInfinite(){
    return this.infinite;
  }

  getPropertiesList(){
    if(this.template.RootNode.hasField('PropertiesList')){
      return this.template.RootNode.getFieldByLabel('PropertiesList').getChildStructs();
    }
    return null;
  }

  isDisguise(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
        return true;
      }
    }
    return false;
  }

  getDisguiseAppearance(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDisguiseAppearanceId(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Disguise)){
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

  setStackSize(value: number){
    return this.stackSize = value;
  }

  getLocalizedName(){
    return this.localizedName.getValue().replace(/\0[\s\S]*$/g,'');
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
      if(property.isUseable() && property.is(ModuleItemProperty.Armor)){
        bonus += property.getValue();
      }
    }
    return this._baseItem.baseAC + bonus;
  }

  getDexBonus(){
    if(this.baseItem){
      return this._baseItem.dexBonus || 0;
    }
    return 0;
  }

  getAttackBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.AttackBonus)){
        return property.getValue();
      }
    }
    return 0;
  }

  getBaseDamage(){
    if(this._baseItem.numDice){
      return CombatEngine.DiceRoll(this._baseItem.numDice, 'd'+this._baseItem.dieToRoll);
    }
    return 0;
  }

  getMonsterDamage(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Monster_Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDamageBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDamageType(){
    return this._baseItem.damageFlags;
  }

  getSTRBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 0)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDEXBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 1)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCONBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 2)){
        return property.getValue();
      }
    }
    return 0;
  }

  getINTBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 3)){
        return property.getValue();
      }
    }
    return 0;
  }

  getWISBonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 4)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCHABonus(){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 5)){
        return property.getValue();
      }
    }
    return 0;
  }

  castAmmunitionAtTarget(oCaster: ModuleObject, oTarget: ModuleObject){
    if(typeof oTarget != 'undefined'){
      let ammunitiontype = this._baseItem.ammunitionType;
      if( ammunitiontype >= 1 ){
        const _2DA = TwoDAManager.datatables.get('ammunitiontypes');
        if(_2DA){
          let ammunition = _2DA.rows[ammunitiontype];
          if(typeof ammunition != 'undefined'){
            
          }
        }
      }

    }
  }

  load(){

    if(!this.loaded && this.getEquippedRes()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], this.getEquippedRes());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        //
      }else{
        console.error('Failed to load ModuleItem template');
        if(this.template instanceof GFFObject){
          this.initProperties();
        }
      }
    }else if(!this.loaded && this.getInventoryRes()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], this.getInventoryRes());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
      }else{
        console.error('Failed to load ModuleItem template');
        if(this.template instanceof GFFObject){
          this.initProperties();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      // this.loadScripts();
    }
  }

  loadModel(): Promise<OdysseyModel3D> {
    let itemclass = this._baseItem.itemClass;
    let DefaultModel = this._baseItem.defaultModel;
    itemclass = itemclass.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
    DefaultModel = DefaultModel.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();

    if(DefaultModel != 'i_null'){
      DefaultModel = this.nthStringConverter(DefaultModel, this.getModelVariation());
      if(!parseInt(DefaultModel.substr(-3))){
        DefaultModel = itemclass+'_'+(('000'+this.getModelVariation()).substr(-3));
      }
    }
    return new Promise<OdysseyModel3D>( (resolve, reject) => {
      GameState.ModelLoader.load(DefaultModel).then(
        (mdl: OdysseyModel) => {
          OdysseyModel3D.FromMDL(mdl, {
            context: this.context,
            lighting: true,
            //castShadow: false,
            //receiveShadow: false
          }).then((model: OdysseyModel3D) => {
            this.model = model;
            resolve(this.model);
          }).catch( () => {
            this.model = new OdysseyModel3D;
            resolve(this.model);
          });
        }
      ).catch( () => {
        this.model = new OdysseyModel3D;
        resolve(this.model);
      });
    });
  }

  nthStringConverter(name = '', nth = 1){
    let value = nth.toString();
    name = name.substr(0, name.length - value.length);
    return name + value;
  }

  static FromResRef(resRef: string): ModuleItem {
    const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], resRef);
    if(buffer){
      const item = new ModuleItem(new GFFObject(buffer));
      item.initProperties();
      return item;
    }
    return undefined;
  }

  /*getIcon(onLoad = null){

    let baseClass = Global.kotor2DA.baseitems.rows[this.template.getFieldByLabel('BaseItem').Value]['itemclass'].toLowerCase();
    let texVariantNode = this.template.getFieldByLabel('TextureVar');
    let modelVariantNode = this.template.getFieldByLabel('ModelVariation');

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
      if(property.propertyName == ModuleItemProperty.CastSpell){
        spells.push(new TalentSpell(property.subType));
      }
    }

    return spells;
  }

  initProperties(){

    if(this.loaded){
      return;
    }
    
    if(!this.initialized){
      if(this.template.RootNode.hasField('ObjectId')){
        this.id = this.template.getFieldByLabel('ObjectId').getValue();
      }else if(this.template.RootNode.hasField('ID')){
        this.id = this.template.getFieldByLabel('ID').getValue();
      }
      
      ModuleObjectManager.AddObjectById(this);
    }

    if(this.template.RootNode.hasField('AddCost'))
      this.addCost = parseInt(this.template.getFieldByLabel('AddCost').getValue());

    if(this.template.RootNode.hasField('BaseItem')){
      this.baseItem = this.template.getFieldByLabel('BaseItem').getValue();
      this._baseItem = BaseItem.From2DA(this.baseItem);
    }

    if(this.template.RootNode.hasField('Charges'))
      this.charges = this.template.getFieldByLabel('Charges').getValue();

    if(this.template.RootNode.hasField('Cost'))
      this.cost = parseInt(this.template.getFieldByLabel('Cost').getValue());

    if(this.template.RootNode.hasField('DELETING'))
      this.deleting = this.template.getFieldByLabel('DELETING').getValue();

    if(this.template.RootNode.hasField('DescIdentified'))
      this.descIdentified = this.template.getFieldByLabel('DescIdentified').getValue();

    if(this.template.RootNode.hasField('Description'))
      this.description = this.template.getFieldByLabel('Description').getValue();

    if(this.template.RootNode.hasField('Dropable'))
      this.dropable = this.template.getFieldByLabel('Dropable').getValue();
      
    if(this.template.RootNode.hasField('EquippedRes'))
      this.equippedRes = this.template.getFieldByLabel('EquippedRes').getValue();

    if(this.template.RootNode.hasField('Identified'))
      this.identified = this.template.getFieldByLabel('Identified').getValue();

    if(this.template.RootNode.hasField('Infinite'))
      this.infinite = this.template.getFieldByLabel('Infinite').getValue();

    if(this.template.RootNode.hasField('InventoryRes'))
      this.inventoryRes = this.template.getFieldByLabel('InventoryRes').getValue();
  
    if(this.template.RootNode.hasField('LocalizedName'))
      this.localizedName = this.template.RootNode.getFieldByLabel('LocalizedName').getCExoLocString();
        
    if(this.template.RootNode.hasField('MaxCharges'))
      this.maxCharges = this.template.RootNode.getFieldByLabel('MaxCharges').getValue();

    if(this.template.RootNode.hasField('ModelVariation'))
      this.modelVariation = this.template.RootNode.getFieldByLabel('ModelVariation').getValue();
    
    if(this.template.RootNode.hasField('NewItem'))
      this.newItem = this.template.RootNode.getFieldByLabel('NewItem').getValue();
        
    if(this.template.RootNode.hasField('NonEquippable'))
      this.nonEquippable = this.template.RootNode.getFieldByLabel('NonEquippable').getValue();
  
    if(this.template.RootNode.hasField('Pickpocketable'))
      this.pickpocketable = this.template.RootNode.getFieldByLabel('Pickpocketable').getValue();
      
    if(this.template.RootNode.hasField('Plot'))
      this.plot = this.template.getFieldByLabel('Plot').getValue();

    if(this.template.RootNode.hasField('PropertiesList')){
      let propertiesList = this.template.getFieldByLabel('PropertiesList').getChildStructs();
      this.properties = [];
      for(let i = 0, len = propertiesList.length; i < len; i++){
        this.properties.push( 
          new ItemProperty( 
            GFFObject.FromStruct( propertiesList[i] ), this 
          ) 
        );
      }
    }

    if(this.template.RootNode.hasField('StackSize'))
      this.stackSize = this.template.getFieldByLabel('StackSize').getValue();

    if(this.template.RootNode.hasField('Stolen'))
      this.stolen = this.template.getFieldByLabel('Stolen').getValue();

    if(this.template.RootNode.hasField('Tag'))
      this.tag = this.template.getFieldByLabel('Tag').getValue().replace(/\0[\s\S]*$/g,'');

    if(this.template.RootNode.hasField('TextureVar'))
      this.textureVariation = this.template.getFieldByLabel('TextureVar').getValue();

    if(this.template.RootNode.hasField('Upgrades')){
      this.upgrades = this.template.getFieldByLabel('Upgrades').getValue();
    }

    if(this.template.RootNode.hasField('XPosition'))
      this.position.x = this.template.RootNode.getFieldByLabel('XPosition').getValue();

    if(this.template.RootNode.hasField('YPosition'))
      this.position.y = this.template.RootNode.getFieldByLabel('YPosition').getValue();

    if(this.template.RootNode.hasField('ZPosition'))
      this.position.z = this.template.RootNode.getFieldByLabel('ZPosition').getValue();

    if(this.template.RootNode.hasField('XOrientation'))
      this.xOrientation = this.template.RootNode.getFieldByLabel('XOrientation').getValue();

    if(this.template.RootNode.hasField('YOrientation'))
      this.yOrientation = this.template.RootNode.getFieldByLabel('YOrientation').getValue();

    if(this.template.RootNode.hasField('ZOrientation'))
      this.zOrientation = this.template.RootNode.getFieldByLabel('ZOrientation').getValue();

    if(this.template.RootNode.hasField('PaletteID'))
      this.palleteID = this.template.RootNode.getFieldByLabel('PaletteID').getValue();

    this.initialized = true

  }

  setPossessor( oCreature: ModuleCreature){
    this.possessor = oCreature;
  }

  getPossessor(){
    return this.possessor;
  }

  onEquip(oCreature: ModuleCreature){
    console.log('ModuleItem.onEquip', oCreature, this);
    if(this.isDisguise()){
      oCreature.removeEffectsByType( GameEffectType.EffectDisguise ); //EFFECT_DISGUISE
      let eDisguise = new EffectDisguise();
      eDisguise.setInt(0, this.getDisguiseAppearanceId());
      eDisguise.setCreator(this);
      eDisguise.setAttachedObject(oCreature);
      oCreature.addEffect( eDisguise );
    }
    if(PartyManager.party.indexOf(oCreature) >= 0){
      InventoryManager.removeItem(this);
    }else{
      //oCreature.inventory.push(this);
    }
    this.setPossessor(oCreature);
  }

  onUnEquip(oCreature: ModuleCreature){
    console.log('ModuleItem.onUnEquip', oCreature, this);
    oCreature.removeEffectsByCreator(this);
    if(PartyManager.party.indexOf(oCreature) >= 0){
      InventoryManager.addItem(this);
    }else{
      //oCreature.inventory.push(this);
    }
    this.setPossessor(undefined);
  }

  destroy(): void {
    super.destroy();
    if(this.placedInWorld){
      if(this.area) this.area.detachObject(this);
    }
  }

  save(){
    let itemStruct = new GFFStruct(0);

    if(this.id >= 0)
      itemStruct.addField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).setValue(this.id);
    
    itemStruct.addField( new GFFField(GFFDataType.INT, 'BaseItem') ).setValue(this.getBaseItemId());
    itemStruct.addField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).setValue(this.tag);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Identified') ).setValue(this.identified);
    itemStruct.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).setValue(this.template.getFieldByLabel('Description')?.getCExoLocString());
    itemStruct.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'DescIdentified') ).setValue(this.template.getFieldByLabel('DescIdentified')?.getCExoLocString());
    itemStruct.addField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).setValue(this.template.getFieldByLabel('LocalizedName')?.getCExoLocString());
    itemStruct.addField( new GFFField(GFFDataType.WORD, 'StackSize') ).setValue(this.stackSize);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Stolen') ).setValue(this.stolen);
    itemStruct.addField( new GFFField(GFFDataType.DWORD, 'Upgrades') ).setValue(this.upgrades);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Dropable') ).setValue(this.dropable);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Pickpocketable') ).setValue(1);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'ModelVariation') ).setValue(this.modelVariation);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Charges') ).setValue(this.charges);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'MaxCharges') ).setValue(this.maxCharges);
    itemStruct.addField( new GFFField(GFFDataType.DWORD, 'Cost') ).setValue(this.cost);
    itemStruct.addField( new GFFField(GFFDataType.DWORD, 'AddCost') ).setValue(this.addCost);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'Plot') ).setValue(this.plot);

    let propertiesList = itemStruct.addField( new GFFField(GFFDataType.LIST, 'PropertiesList') );
    for(let i = 0; i < this.properties.length; i++){
      propertiesList.addChildStruct( this.properties[i].save() );
    }

    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).setValue(this.position.x);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).setValue(this.position.y);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).setValue(this.position.z);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).setValue(this.xOrientation);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).setValue(this.yOrientation);
    itemStruct.addField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).setValue(this.zOrientation);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'NonEquippable') ).setValue(this.nonEquippable);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'NewItem') ).setValue(this.newItem);
    itemStruct.addField( new GFFField(GFFDataType.BYTE, 'DELETING') ).setValue(0);

    return itemStruct;
  }

}

export class ItemProperty {
  template: any;
  item: any;
  propertyName: any;
  subType: any;
  costTable: any;
  costValue: any;
  upgradeType: number;
  param1: any;
  param1Value: any;
  chanceAppear: any;
  usesPerDay: any;
  useable: any;

  constructor(template: any, item: any){
    this.template = template;
    this.item = item;
    this.initProperties();
  }

  getProperty(){
    const _2DA = TwoDAManager.datatables.get('itempropdef');
    if(_2DA){
      return _2DA.rows[this.propertyName];
    }
  }

  getPropertyName(){
    const property = this.getProperty();
    if(property){
      if(property.name != '****'){
        return TLKManager.GetStringById(property.name).Value;
      }else{
        return TLKManager.GetStringById(0).Value;
      }
    }
    return new Error(`Invalid Item Property`);
  }

  getSubType(){
    const property = this.getProperty();
    if(property && property.subtyperesref != '****'){
      const _2DA = TwoDAManager.datatables.get(property.subtyperesref.toLowerCase());
      if(_2DA){
        return _2DA.rows[this.subType];
      }
    }
  }

  getSubtypeName(){
    const subType = this.getSubType();
    if(subType){
      if(subType.name != '****'){
        return TLKManager.GetStringById(subType.name).Value;
      }else{
        return TLKManager.GetStringById(0).Value;
      }
    }
    return new Error(`Invalid Item Property Sub Type`);
  }

  getCostTable(){
    const iprp_costtable2DA = TwoDAManager.datatables.get('iprp_costtable');
    if(iprp_costtable2DA){
      const costTableName = iprp_costtable2DA.rows[this.costTable].name.toLowerCase();
      if(costTableName){
        const costtable2DA = TwoDAManager.datatables.get(costTableName);
        if(costtable2DA){
          return costtable2DA;
        }
      }
    }
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

  is(property: any, subType: any){
    if(typeof property != 'undefined' && typeof subType != 'undefined'){
      return this.propertyName == property && this.subType == subType;
    }else{
      return this.propertyName == property;
    }
  }

  costTableRandomCheck(){
    let costTable = this.getCostTable();
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
        case ModuleItemCostTable.Base1:

        break;
        case ModuleItemCostTable.Bonus:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          return parseInt(costTableRow.value);
        break;
        case ModuleItemCostTable.Melee:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          return parseInt(costTableRow.value);
        break;
        case ModuleItemCostTable.SpellUse:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

        break;
        case ModuleItemCostTable.Damage:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

          if(costTableRow.numdice != '****'){
            return CombatEngine.DiceRoll(parseInt(costTableRow.numdice), 'd'+costTableRow.die);
          }else{
            return parseInt(costTableRow.label);
          }
        break;
        case ModuleItemCostTable.Immune:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.value);
        break;
        case ModuleItemCostTable.DamageSoak:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.amount);
        break;
        case ModuleItemCostTable.DamageResist:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();
          return parseInt(costTableRow.amount);
        break;
        case ModuleItemCostTable.DancingScimitar:
          //Random Cost Check
          costTableRow = this.costTableRandomCheck();

        break;
        case ModuleItemCostTable.Slots:
          
        break;
        case ModuleItemCostTable.Monster_Cost:
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

  initProperties(){
    if(this.template.RootNode.hasField('PropertyName'))
      this.propertyName = this.template.RootNode.getFieldByLabel('PropertyName').getValue();
    
    if(this.template.RootNode.hasField('Subtype'))
      this.subType = this.template.RootNode.getFieldByLabel('Subtype').getValue();

    if(this.template.RootNode.hasField('CostTable'))
      this.costTable = this.template.RootNode.getFieldByLabel('CostTable').getValue();

    if(this.template.RootNode.hasField('CostValue'))
      this.costValue = this.template.RootNode.getFieldByLabel('CostValue').getValue();

    if(this.template.RootNode.hasField('Param1'))
      this.param1 = this.template.RootNode.getFieldByLabel('Param1').getValue();

    if(this.template.RootNode.hasField('Param1Value'))
      this.param1Value = this.template.RootNode.getFieldByLabel('Param1Value').getValue();

    if(this.template.RootNode.hasField('ChanceAppear'))
      this.chanceAppear = this.template.RootNode.getFieldByLabel('ChanceAppear').getValue();

    if(this.template.RootNode.hasField('UsesPerDay'))
      this.usesPerDay = this.template.RootNode.getFieldByLabel('UsesPerDay').getValue();

    if(this.template.RootNode.hasField('Useable'))
      this.useable = this.template.RootNode.getFieldByLabel('Useable').getValue();

    if(this.template.RootNode.hasField('UpgradeType'))
      this.upgradeType = this.template.RootNode.getFieldByLabel('UpgradeType').getValue();
  }

  save(){
    let propStruct = new GFFStruct(0);

    propStruct.addField( new GFFField(GFFDataType.WORD, 'PropertyName') ).setValue( this.propertyName == -1 ? 255 : this.propertyName);
    propStruct.addField( new GFFField(GFFDataType.WORD, 'SubType') ).setValue( this.subType == -1 ? 255 : this.subType);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'CostTable') ).setValue( this.costTable == -1 ? 255 : this.costTable);
    propStruct.addField( new GFFField(GFFDataType.WORD, 'CostValue') ).setValue( this.costValue == -1 ? 255 : this.costValue);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Param1') ).setValue( this.param1 == -1 ? 255 : this.param1);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Param1Value') ).setValue( this.param1Value == -1 ? 255 : this.param1Value);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'ChanceAppear') ).setValue( this.chanceAppear == -1 ? 255 : this.chanceAppear);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'UsesPerDay') ).setValue( this.usesPerDay == -1 ? 255 : this.usesPerDay);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'Usable') ).setValue( this.useable == -1 ? 255 : this.useable);
    propStruct.addField( new GFFField(GFFDataType.BYTE, 'UpgradeType') ).setValue( this.upgradeType == -1 ? 255 : this.upgradeType);

    return propStruct;
  }

}
