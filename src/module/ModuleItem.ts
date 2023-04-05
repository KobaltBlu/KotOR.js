/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleCreature, ModuleObject } from ".";
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
import { TemplateLoader } from "../loaders/TemplateLoader";
import { InventoryManager } from "../managers/InventoryManager";
import { PartyManager } from "../managers/PartyManager";
import { TLKManager } from "../managers/TLKManager";
import { TwoDAManager } from "../managers/TwoDAManager";
import { OdysseyModel } from "../odyssey";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { ResourceLoader } from "../resource/ResourceLoader";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TalentSpell } from "../talents";
import { OdysseyModel3D } from "../three/odyssey";

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
    if(this.template.RootNode.HasField('PropertiesList')){
      return this.template.RootNode.GetFieldByLabel('PropertiesList').GetChildStructs();
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

  Load(){

    if(!this.loaded && this.getEquippedRes()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], this.getEquippedRes());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.Merge(gff);
        this.InitProperties();
        //
      }else{
        console.error('Failed to load ModuleItem template');
        if(this.template instanceof GFFObject){
          this.InitProperties();
        }
      }
    }else if(!this.loaded && this.getInventoryRes()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], this.getInventoryRes());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.Merge(gff);
        this.InitProperties();
      }else{
        console.error('Failed to load ModuleItem template');
        if(this.template instanceof GFFObject){
          this.InitProperties();
        }
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.InitProperties();
      // this.LoadScripts();
    }
  }

  LoadModel(): Promise<OdysseyModel3D> {
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
      item.InitProperties();
      return item;
    }
    return undefined;
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
      if(property.propertyName == ModuleItemProperty.CastSpell){
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

    if(this.template.RootNode.HasField('BaseItem')){
      this.baseItem = this.template.GetFieldByLabel('BaseItem').GetValue();
      this._baseItem = BaseItem.From2DA(this.baseItem);
    }

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
            GFFObject.FromStruct( propertiesList[i] ), this 
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
      this.position.x = this.template.RootNode.GetFieldByLabel('XPosition').GetValue();

    if(this.template.RootNode.HasField('YPosition'))
      this.position.y = this.template.RootNode.GetFieldByLabel('YPosition').GetValue();

    if(this.template.RootNode.HasField('ZPosition'))
      this.position.z = this.template.RootNode.GetFieldByLabel('ZPosition').GetValue();

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

  setPossessor( oCreature: ModuleCreature){
    this.possessor = oCreature;
  }

  getPossessor(){
    return this.possessor;
  }

  onEquip(oCreature: ModuleCreature){
    console.log('ModuleItem.onEquip', oCreature, this);
    if(oCreature instanceof ModuleCreature){
      if(this.isDisguise()){
        oCreature.removeEffectsByType( GameEffectType.EffectDisguise ); //EFFECT_DISGUISE
        let eDisguise = new EffectDisguise();
        eDisguise.setInt(0, this.getDisguiseAppearanceId());
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

  onUnEquip(oCreature: ModuleCreature){
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
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).SetValue(this.template.GetFieldByLabel('Description')?.GetCExoLocString());
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'DescIdentified') ).SetValue(this.template.GetFieldByLabel('DescIdentified')?.GetCExoLocString());
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).SetValue(this.template.GetFieldByLabel('LocalizedName')?.GetCExoLocString());
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

    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'XPosition') ).SetValue(this.position.x);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'YPosition') ).SetValue(this.position.y);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'ZPosition') ).SetValue(this.position.z);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'XOrientation') ).SetValue(this.xOrientation);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'YOrientation') ).SetValue(this.yOrientation);
    itemStruct.AddField( new GFFField(GFFDataType.FLOAT, 'ZOrientation') ).SetValue(this.zOrientation);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'NonEquippable') ).SetValue(this.nonEquippable);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'NewItem') ).SetValue(this.newItem);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'DELETING') ).SetValue(0);

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
    this.InitProperties();
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
