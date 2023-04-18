/* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 */

import { ModuleCreature, ModuleObject } from ".";
import { BaseItem } from "../engine/BaseItem";
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
import { Dice } from "../utility/Dice";
import { ItemProperty } from "../engine/ItemProperty";

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
  properties: ItemProperty[];
  upgradeItems: any = {};
  possessor: ModuleCreature;
  descIdentified: any;
  stolen: boolean = false;
  infinite: boolean = false;
  inventoryRes: any;
  stackSize: any;
  charges: any;
  deleting: any;
  dropable: boolean = false;
  identified: boolean = false;
  maxCharges: number = 0;
  newItem: boolean = false;
  nonEquippable: boolean = false;
  pickpocketable: boolean = false;
  upgrades: number;

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

  update(delta = 0): void {
    if(this.model instanceof OdysseyModel3D)
      this.model.update(delta);
  }

  getDescription(){
    return this.descIdentified;
  }

  getBaseItemId(): number {
    return this.baseItem;
  }

  getBaseItem(): BaseItem {
    return this._baseItem;
  }

  getBodyVariation(): string {
    return this._baseItem.bodyVar;
  }

  getModelVariation(): number {
    return this.modelVariation || 1;
  }

  getTextureVariation(): number {
    return this.textureVariation || 1;
  }

  getIcon(): string {
    return 'i'+this._baseItem.itemClass+'_'+("000" + this.getModelVariation()).slice(-3);
  }

  getWeaponWield(): WeaponWield{
    return this._baseItem.weaponWield;
  }

  getWeaponType(): WeaponType {
    return this._baseItem.weaponType;
  }

  isRangedWeapon(): boolean {
    return this._baseItem.rangedWeapon;
  }

  isStolen(): boolean {
    return this.stolen;
  }

  isInfinite(): boolean {
    return this.infinite;
  }

  getPropertiesList(): ItemProperty[] {
    return this.properties;
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

  getStackSize(): number {
    return this.stackSize;
  }

  setStackSize(value: number): number {
    return this.stackSize = value;
  }

  getLocalizedName(): string {
    return this.localizedName.GetValue().replace(/\0[\s\S]*$/g,'');
  }

  getPalleteID(): number {
    return this.palleteID;
  }

  getTag(): string {
    return this.tag;
  }

  getACBonus(): number {
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Armor)){
        bonus += property.getValue();
      }
    }
    return this._baseItem.baseAC + bonus;
  }

  getDexBonus(): number {
    if(this.baseItem){
      return this._baseItem.dexBonus || 0;
    }
    return 0;
  }

  getAttackBonus(): number {
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
      return Dice.roll(this._baseItem.numDice, this._baseItem.die);
    }
    return 0;
  }

  getBaseDamageType(): number {
    if(this._baseItem){
      return Math.log2(this._baseItem.damageFlags) & 0xFF;
    }
    return 0;
  }

  getMonsterDamage(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Monster_Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  hasDamageBonus(): boolean {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return true;
      }
    }
    return false;
  }

  getDamageBonus(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDamageBonusType(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Damage)){
        return property.getSubType();
      }
    }
    return 0;
  }

  getDamageFlags(): number {
    return this._baseItem.damageFlags;
  }

  getCriticalThreatRangeMin(){
    return 20 - this._baseItem.criticalThreat;
  }

  getCriticalThreatRangeMax(){
    return 20;
  }

  getSTRBonus(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 0)){
        return property.getValue();
      }
    }
    return 0;
  }

  getDEXBonus(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 1)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCONBonus(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 2)){
        return property.getValue();
      }
    }
    return 0;
  }

  getINTBonus(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 3)){
        return property.getValue();
      }
    }
    return 0;
  }

  getWISBonus(): number {
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.Ability, 4)){
        return property.getValue();
      }
    }
    return 0;
  }

  getCHABonus(): number {
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

  Load(): void {

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

  nthStringConverter(name = '', nth = 1): string {
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

  getSpells(): TalentSpell[] {
    const spells: TalentSpell[] = [];

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

  InitProperties(): void {

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
      this.dropable = this.template.GetFieldByLabel('Dropable').GetValue() ? true : false;
      
    if(this.template.RootNode.HasField('EquippedRes'))
      this.equippedRes = this.template.GetFieldByLabel('EquippedRes').GetValue();

    if(this.template.RootNode.HasField('Identified'))
      this.identified = !!this.template.GetFieldByLabel('Identified').GetValue();

    if(this.template.RootNode.HasField('Infinite'))
      this.infinite = !!this.template.GetFieldByLabel('Infinite').GetValue();

    if(this.template.RootNode.HasField('InventoryRes'))
      this.inventoryRes = this.template.GetFieldByLabel('InventoryRes').GetValue();
  
    if(this.template.RootNode.HasField('LocalizedName'))
      this.localizedName = this.template.RootNode.GetFieldByLabel('LocalizedName').GetCExoLocString();
        
    if(this.template.RootNode.HasField('MaxCharges'))
      this.maxCharges = this.template.RootNode.GetFieldByLabel('MaxCharges').GetValue();

    if(this.template.RootNode.HasField('ModelVariation'))
      this.modelVariation = this.template.RootNode.GetFieldByLabel('ModelVariation').GetValue();
    
    if(this.template.RootNode.HasField('NewItem'))
      this.newItem = this.template.RootNode.GetFieldByLabel('NewItem').GetValue() ? true : false;
        
    if(this.template.RootNode.HasField('NonEquippable'))
      this.nonEquippable = this.template.RootNode.GetFieldByLabel('NonEquippable').GetValue() ? true : false;
  
    if(this.template.RootNode.HasField('Pickpocketable'))
      this.pickpocketable = !!this.template.RootNode.GetFieldByLabel('Pickpocketable').GetValue();
      
    if(this.template.RootNode.HasField('Plot'))
      this.plot = this.template.GetFieldByLabel('Plot').GetValue();

    if(this.template.RootNode.HasField('PropertiesList')){
      let propertiesList = this.template.GetFieldByLabel('PropertiesList').GetChildStructs();
      this.properties = [];
      for(let i = 0, len = propertiesList.length; i < len; i++){
        const itemProp = ItemProperty.FromStruct(propertiesList[i]);
        itemProp.setItem(this);
        this.properties.push(itemProp);
      }
    }

    if(this.template.RootNode.HasField('StackSize'))
      this.stackSize = this.template.GetFieldByLabel('StackSize').GetValue();

    if(this.template.RootNode.HasField('Stolen'))
      this.stolen = !!this.template.GetFieldByLabel('Stolen').GetValue();

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

  setPossessor( oCreature: ModuleCreature): void {
    this.possessor = oCreature;
  }

  getPossessor(): ModuleCreature {
    return this.possessor;
  }

  onEquip(oCreature: ModuleCreature): void {
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

  onUnEquip(oCreature: ModuleCreature): void {
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

  save(): GFFStruct {
    let itemStruct = new GFFStruct(0);

    if(this.id >= 0)
      itemStruct.AddField( new GFFField(GFFDataType.DWORD, 'ObjectId') ).SetValue(this.id);
    
    itemStruct.AddField( new GFFField(GFFDataType.INT, 'BaseItem') ).SetValue(this.getBaseItemId());
    itemStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, 'Tag') ).SetValue(this.tag);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Identified') ).SetValue(this.identified ? 1 : 0);
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'Description') ).SetValue(this.template.GetFieldByLabel('Description')?.GetCExoLocString());
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'DescIdentified') ).SetValue(this.template.GetFieldByLabel('DescIdentified')?.GetCExoLocString());
    itemStruct.AddField( new GFFField(GFFDataType.CEXOLOCSTRING, 'LocalizedName') ).SetValue(this.template.GetFieldByLabel('LocalizedName')?.GetCExoLocString());
    itemStruct.AddField( new GFFField(GFFDataType.WORD, 'StackSize') ).SetValue(this.stackSize);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Stolen') ).SetValue(this.stolen ? 1 : 0);
    itemStruct.AddField( new GFFField(GFFDataType.DWORD, 'Upgrades') ).SetValue(this.upgrades);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Dropable') ).SetValue(this.dropable ? 1 : 0);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Pickpocketable') ).SetValue(1);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'ModelVariation') ).SetValue(this.modelVariation);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Charges') ).SetValue(this.charges);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'MaxCharges') ).SetValue(this.maxCharges);
    itemStruct.AddField( new GFFField(GFFDataType.DWORD, 'Cost') ).SetValue(this.cost);
    itemStruct.AddField( new GFFField(GFFDataType.DWORD, 'AddCost') ).SetValue(this.addCost);
    itemStruct.AddField( new GFFField(GFFDataType.BYTE, 'Plot') ).SetValue(this.plot ? 1 : 0);

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
