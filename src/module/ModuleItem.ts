import { ModuleObject } from "./ModuleObject";
import type { ModuleCreature } from "./ModuleCreature";
import { BaseItem } from "../engine/BaseItem";
import { EffectDisguise } from "../effects/EffectDisguise";
import { WeaponWield } from "../enums/combat/WeaponWield";
import { WeaponType } from "../enums/combat/WeaponType";
import { GameEffectType } from "../enums/effects/GameEffectType";
// import { ModuleItemCostTable } from "../enums/module/ModuleItemCostTable";
import { ModuleItemProperty } from "../enums/module/ModuleItemProperty";
import { GFFDataType } from "../enums/resource/GFFDataType";
// import { GameState } from "../GameState";
import { OdysseyModel } from "../odyssey";
import { GFFField } from "../resource/GFFField";
import { GFFObject } from "../resource/GFFObject";
import { GFFStruct } from "../resource/GFFStruct";
import { MDLLoader, ResourceLoader } from "../loaders";
import { ResourceTypes } from "../resource/ResourceTypes";
import { TalentSpell } from "../talents";
import { OdysseyModel3D } from "../three/odyssey";
// import { TwoDAManager, PartyManager, InventoryManager, TLKManager, ModuleObjectManager } from "../managers";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { CombatFeatType } from "../enums/combat/CombatFeatType";
import { BitWise } from "../utility/BitWise";
import { Dice } from "../utility/Dice";
import { ItemProperty } from "../engine/ItemProperty";
import { GameState } from "../GameState";
import { ActionParameterType, GameEffectDurationType, ModuleCreatureAnimState, SkillType } from "../enums";

/**
* ModuleItem class.
* 
* Class representing an item found in module areas, placeable, creatures, etc...
* 
* KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
* 
* @file ModuleItem.ts
* @author KobaltBlu <https://github.com/KobaltBlu>
* @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
* @memberof KotOR
*/
export class ModuleItem extends ModuleObject {
  equippedRes: any;
  baseItemId: number;
  baseItem: BaseItem;
  addCost: number;
  cost: number;
  modelVariation: number;
  textureVariation: number;
  palleteID: number;
  loaded: boolean;
  properties: ItemProperty[];
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

  upgradeItems: any = {};
  upgrades: number = 0;
  upgradeLevel: number = 0;
  upgradeSlot0: number = -1;
  upgradeSlot1: number = -1;
  upgradeSlot2: number = -1;
  upgradeSlot3: number = -1;
  upgradeSlot4: number = -1;
  upgradeSlot5: number = -1;

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

    this.baseItemId = 0;
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

  clone(): ModuleItem {
    const nItem = new ModuleItem(this.template);
    nItem.initProperties();
    nItem.stackSize = 1;
    return nItem;
  }

  update(delta = 0){
    if(this.model instanceof OdysseyModel3D)
      this.model.update(delta);
  }

  getDescription(){
    return this.descIdentified;
  }

  getBaseItemId(): number {
    return this.baseItemId;
  }

  getBaseItem(): BaseItem {
    return this.baseItem;
  }

  getBodyVariation(){
    return this.baseItem.bodyVar;
  }

  getModelVariation(){
    return this.modelVariation || 1;
  }

  getTextureVariation(){
    return this.textureVariation || 1;
  }

  getIcon(){
    return 'i'+this.baseItem.itemClass+'_'+("000" + this.getModelVariation()).slice(-3);
  }

  getWeaponWield(): WeaponWield{
    return this.baseItem.weaponWield;
  }

  getWeaponType(): WeaponType {
    return this.baseItem.weaponType;
  }

  isRangedWeapon(){
    return this.baseItem.rangedWeapon;
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
    return this.baseItem.baseAC + bonus;
  }

  getDexBonus(){
    if(this.baseItemId){
      return this.baseItem.dexBonus || 0;
    }
    return 0;
  }

  getAttackBonus(): number {
    let bonus = 0;
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(property.isUseable() && property.is(ModuleItemProperty.AttackBonus)){
        bonus += property.getValue();
        break;
      }
    }

    if(BitWise.InstanceOfObject(this.possessor, ModuleObjectType.ModuleCreature)){
      switch(this.getWeaponWield()){
        case WeaponWield.BLASTER_PISTOL:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_BLASTER)){
            bonus += 1;
          }
        break;
        case WeaponWield.BLASTER_RIFLE:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_BLASTER_RIFLE)){
            bonus += 1;
          }
        break;
        case WeaponWield.BLASTER_HEAVY:
          if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_HEAVY_WEAPONS)){
            bonus += 1;
          }
        break;
        case WeaponWield.ONE_HANDED_SWORD:
        case WeaponWield.TWO_HANDED_SWORD:
        case WeaponWield.STUN_BATON:
          if(this.baseItemId == 8 || this.baseItemId == 9 || this.baseItemId == 10){
            if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_LIGHTSABER)){
              bonus += 1;
            }
          }else if(this.possessor.getHasFeat(CombatFeatType.WEAPON_FOCUS_MELEE_WEAPONS)){
            bonus += 1;
          }
        break;
      }
    }

    return bonus;
  }

  getBaseDamage(){
    if(this.baseItem.numDice){
      return Dice.roll(this.baseItem.numDice, this.baseItem.die);
    }
    return 0;
  }

  getBaseDamageType(): number {
    if(this.baseItem){
      return Math.log2(this.baseItem.damageFlags) & 0xFF;
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
    return this.baseItem.damageFlags;
  }

  getCriticalThreatRangeMin(){
    return 20 - this.baseItem.criticalThreat;
  }

  getCriticalThreatRangeMax(){
    return 20;
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
      let ammunitiontype = this.baseItem.ammunitionType;
      if( ammunitiontype >= 1 ){
        const _2DA = GameState.TwoDAManager.datatables.get('ammunitiontypes');
        if(_2DA){
          let ammunition = _2DA.rows[ammunitiontype];
          if(typeof ammunition != 'undefined'){
            
          }
        }
      }

    }
  }

  useItemOnObject(oCaster: ModuleCreature, oTarget: ModuleObject){
    for(let i = 0, len = this.properties.length; i < len; i++){
      let property = this.properties[i];
      if(!property.isUseable()){ continue; }

      if(property.is(ModuleItemProperty.CastSpell)){
        const action = new GameState.ActionFactory.ActionItemCastSpell();
        action.setParameter(0, ActionParameterType.DWORD, oTarget);
        action.setParameter(1, ActionParameterType.DWORD, oTarget.area);
        action.setParameter(2, ActionParameterType.FLOAT, oTarget.position.x);
        action.setParameter(3, ActionParameterType.FLOAT, oTarget.position.y);
        action.setParameter(4, ActionParameterType.FLOAT, oTarget.position.z);
        action.setParameter(5, ActionParameterType.INT, property.getValue());
        action.setParameter(6, ActionParameterType.INT, 1);
        action.setParameter(7, ActionParameterType.FLOAT, 1.0);
        action.setParameter(8, ActionParameterType.INT, -1);
        action.setParameter(9, ActionParameterType.INT, -1);
        action.setParameter(10, ActionParameterType.DWORD, this);
        action.setParameter(11, ActionParameterType.STRING, '');
        oCaster.actionQueue.add(action);
      }else if(property.is(ModuleItemProperty.ThievesTools)){
        const action = new GameState.ActionFactory.ActionUnlockObject();
        action.setParameter(0, ActionParameterType.DWORD, oTarget);
        action.setParameter(1, ActionParameterType.DWORD, this);
        oCaster.actionQueue.add(action);
      }else if(property.is(ModuleItemProperty.Trap)){
        const action = new GameState.ActionFactory.ActionSetMine();
        action.setParameter(0, ActionParameterType.DWORD, this);
        action.setParameter(1, ActionParameterType.DWORD, oTarget);
        action.setParameter(2, ActionParameterType.FLOAT, oTarget.position.x);
        action.setParameter(3, ActionParameterType.FLOAT, oTarget.position.y);
        action.setParameter(4, ActionParameterType.FLOAT, oTarget.position.z);
        oCaster.actionQueue.add(action);
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
        return true;
      }else{
        console.error('Failed to load ModuleItem template');
        if(this.template instanceof GFFObject){
          this.initProperties();
        }
        return false;
      }
    }else if(!this.loaded && this.getInventoryRes()){
      //Load template and merge fields
      const buffer = ResourceLoader.loadCachedResource(ResourceTypes['uti'], this.getInventoryRes());
      if(buffer){
        const gff = new GFFObject(buffer);
        this.template.merge(gff);
        this.initProperties();
        return true;
      }else{
        console.error('Failed to load ModuleItem template');
        if(this.template instanceof GFFObject){
          this.initProperties();
        }
        return false;
      }
    }else{
      //We already have the template (From SAVEGAME)
      this.initProperties();
      // this.loadScripts();
      return true;
    }
  }

  async loadModel(): Promise<OdysseyModel3D> {
    if(!this.baseItem){ 
      this.model = new OdysseyModel3D;
      return this.model;
    }

    let itemclass = this.baseItem.itemClass;
    let defaultModel = this.baseItem.defaultModel;
    itemclass = itemclass.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();
    defaultModel = defaultModel.replace(/\0[\s\S]*$/g,'').trim().toLowerCase();

    if(defaultModel != 'i_null'){
      defaultModel = this.nthStringConverter(defaultModel, this.getModelVariation());
      if(!parseInt(defaultModel.substr(-3))){
        defaultModel = itemclass+'_'+(('000'+this.getModelVariation()).substr(-3));
      }
    }

    try{
      const mdl = await MDLLoader.loader.load(defaultModel);
      const model = await OdysseyModel3D.FromMDL(mdl, {
        context: this.context,
        lighting: true,
        //castShadow: false,
        //receiveShadow: false
      });
      this.model = model;
      return this.model;
    }catch(e){
      this.model = new OdysseyModel3D;
      return this.model;
    }
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
      
      GameState.ModuleObjectManager.AddObjectById(this);
    }

    if(this.template.RootNode.hasField('AddCost'))
      this.addCost = parseInt(this.template.getFieldByLabel('AddCost').getValue());

    if(this.template.RootNode.hasField('BaseItem')){
      this.baseItemId = this.template.getFieldByLabel('BaseItem').getValue();
      this.baseItem = BaseItem.From2DA(this.baseItemId);
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

    if(this.template.RootNode.hasField('UpgradeLevel')){
      this.upgradeLevel = this.template.getFieldByLabel('UpgradeLevel').getValue();
    }

    if(this.template.RootNode.hasField('UpgradeSlot0')){
      this.upgradeSlot0 = this.template.getFieldByLabel('UpgradeSlot0').getValue();
    }

    if(this.template.RootNode.hasField('UpgradeSlot1')){
      this.upgradeSlot1 = this.template.getFieldByLabel('UpgradeSlot1').getValue();
    }

    if(this.template.RootNode.hasField('UpgradeSlot2')){
      this.upgradeSlot2 = this.template.getFieldByLabel('UpgradeSlot2').getValue();
    }

    if(this.template.RootNode.hasField('UpgradeSlot3')){
      this.upgradeSlot3 = this.template.getFieldByLabel('UpgradeSlot3').getValue();
    }

    if(this.template.RootNode.hasField('UpgradeSlot4')){
      this.upgradeSlot4 = this.template.getFieldByLabel('UpgradeSlot4').getValue();
    }

    if(this.template.RootNode.hasField('UpgradeSlot5')){
      this.upgradeSlot5 = this.template.getFieldByLabel('UpgradeSlot5').getValue();
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
    if(GameState.PartyManager.party.indexOf(oCreature) >= 0){
      GameState.InventoryManager.removeItem(this);
    }else{
      //oCreature.inventory.push(this);
    }
    this.setPossessor(oCreature);
  }

  onUnEquip(oCreature: ModuleCreature){
    console.log('ModuleItem.onUnEquip', oCreature, this);
    oCreature.removeEffectsByCreator(this);
    if(GameState.PartyManager.party.indexOf(oCreature) >= 0){
      GameState.InventoryManager.addItem(this);
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
