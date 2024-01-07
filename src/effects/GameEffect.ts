import { EffectDisguise, EffectAbilityDecrease, EffectAbilityIncrease, EffectACDecrease, EffectACIncrease, EffectAttackDecrease, EffectAttackIncrease, EffectBeam, EffectBlasterDeflectionDecrease, EffectBlasterDeflectionIncrease, EffectDamage, EffectDamageDecrease, EffectDamageForcePoints, EffectDamageImmunityDecrease, EffectDamageImmunityIncrease, EffectDamageIncrease, EffectDamageReduction, EffectDamageResistance, EffectDeath, EffectDisease, EffectEntangle, EffectFeat, EffectForceFizzle, EffectForceResisted, EffectForceShield, EffectHaste, EffectHeal, EffectHealForcePoints, EffectIcon, EffectImmunity, EffectLink, EffectMovementSpeedDecrease, EffectMovementSpeedIncrease, EffectPoison, EffectRacialType, EffectRegenerate, EffectResurrection, EffectSavingThrowDecrease, EffectSavingThrowIncrease, EffectSetState, EffectSkillDecrease, EffectSkillIncrease, EffectSlow, EffectSpellImmunity, EffectTemporaryHitPoints, EffectVisualEffect } from ".";
import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "../enums/effects/GameEffectSubType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObjectManager } from "../managers";
import type { Module, ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

/**
 * GameEffect class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file GameEffect.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @see https://github.com/nwnxee/unified/blob/master/NWNXLib/API/Constants/Effect.hpp
 */
export class GameEffect {
  creator: any;
  duration: number;
  expireDay: number;
  expireTime: number;
  spellId: number;
  subType: number;
  skipOnLoad: boolean;
  applied: boolean;
  initialized: boolean;
  durationEnded: boolean;
  numIntegers: number;
  intList: number[] = [];
  floatList: number[] = [];
  stringList: string[] = [];
  objectList: ModuleObject[] = [];
  object: ModuleObject;
  type: any;
  constructor(){
    this.creator = undefined;
    this.duration = 0;
    this.expireDay = 0;
    this.expireTime = 0;
    this.spellId = -1;
    this.subType = 0;
    this.skipOnLoad = false;

    this.applied = false;
    this.initialized = false;
    this.durationEnded = false;

    this.numIntegers = 8;
    this.intList = [];
    this.floatList = [];
    this.stringList = [];
    this.objectList = [];

  }

  initialize() {
    if(this.initialized)
      return this;

    if(!isNaN(this.creator)){
      this.creator = ModuleObjectManager.GetObjectById(this.creator);
    }

    this.initialized = true;
    return this;
  }

  loadModel(){
    return;
  }

  setCreator(oCreator: ModuleObject){
    this.creator = oCreator;
  }

  setDuration(duration = 0){
    this.duration = duration;
  }

  getSubType(){
    return this.subType & GameEffectSubType.MASK;
  }

  setSubType(subType = 0){
    if(subType >= 8 && subType <= GameEffectSubType.MASK){
      this.subType = (this.subType & ~GameEffectSubType.MASK | subType);
    }
  }

  getDurationType(){
    return this.subType & GameEffectDurationType.MASK;
  }

  setDurationType(durationType = 0){
    if(durationType >= 0 && durationType <= GameEffectDurationType.MASK){
      this.subType = (this.subType & ~GameEffectDurationType.MASK | durationType);
    }
  }

  setExpireDay(expireDay = 0){
    this.expireDay = expireDay;
  }

  setExpireTime(expireTime = 0){
    this.expireTime = expireTime;
  }

  setNumIntegers( num = 8 ){
    this.intList = new Array(num);
    this.intList.fill(0);
  }

  setSkipOnLoad( bSkipOnLoad = true ){
    this.skipOnLoad = bSkipOnLoad ? true : false;
  }

  setSpellId(nSpellId = -1){
    this.spellId = nSpellId;
  }

  setIntList(intList: any[] = []){
    if(Array.isArray(intList)){
      this.intList = intList;
    }
  }

  setInt(nOffset = 0, nValue = 0){
    this.intList[nOffset] = nValue;
  }

  setFloatList(floatList: any[] = []){
    if(Array.isArray(floatList)){
      this.floatList = floatList;
    }
  }

  setFloat(nOffset = 0, nValue = 0){
    this.floatList[nOffset] = nValue;
  }

  setStringList(stringList: any[] = []){
    if(Array.isArray(stringList)){
      this.stringList = stringList;
    }
  }

  setString(nOffset = 0, nValue = ''){
    this.stringList[nOffset] = nValue;
  }

  setObjectList(objectList: ModuleObject[] = []){
    if(Array.isArray(objectList)){
      this.objectList = objectList;
    }
  }

  setObject(nOffset = 0, nValue: ModuleObject){
    this.objectList[nOffset] = nValue;
  }

  setAttachedObject( oObject: ModuleObject|Module ){
    this.object = oObject as any;
  }

  getCreator(){
    return this.creator;
  }

  getDuration(){
    return this.duration;
  }

  getExpireDay(){
    return this.expireDay;
  }

  getExpireTime(){
    return this.expireTime;
  }

  getSpellId(){
    return this.spellId || -1;
  }

  getSubTypeUnMasked(){
    return this.subType;
  }

  setSubTypeUnMasked( subType = 0){
    this.subType = subType;
  }

  getInt(nOffset = 0){
    return this.intList[nOffset];
  }

  getFloat(nOffset = 0){
    return this.floatList[nOffset];
  }

  getString(nOffset = 0){
    return this.stringList[nOffset];
  }

  getObject(nOffset = 0){
    return this.objectList[nOffset];
  }

  update(delta: number = 0){
    if(this.getDurationType() == GameEffectDurationType.TEMPORARY && (this.expireDay || this.expireTime)){
      if(this.duration <= 0){
        this.onDurationEnd();
        return;
      }
      this.duration -= delta;
    }
  }

  dispose(){
    
  }

  ///////////////
  // Effect Events
  ///////////////

  //Called when the effect is applied ingame
  onApply(object?: ModuleObject){
    if(this.applied)
      return;

    this.applied = true;
  }

  //When the effect is removed ingame
  onRemove(){

  }
  
  //When the effect duration has expired
  onDurationEnd(){
    this.durationEnded = true;
    if(this.object){
      this.object.removeEffect(this);
    }else{
      this.onRemove();
    }
  }

  static EffectFromStruct( struct: GFFStruct ): GameEffect {
    if(struct instanceof GFFStruct){
      let effect = undefined;

      let eType = struct.getFieldByLabel('Type').getValue();
      let eSubType = struct.getFieldByLabel('SubType').getValue();
      let eCreator = struct.getFieldByLabel('CreatorId').getValue();
      let eSpellId = struct.getFieldByLabel('SpellId').getValue();
      
      let eDuration = struct.getFieldByLabel('Duration').getValue();
      let eExpireDay = struct.getFieldByLabel('ExpireDay').getValue();
      let eExpireTime = struct.getFieldByLabel('ExpireTime').getValue();
      let eNumIntegers = struct.getFieldByLabel('NumIntegers').getValue();

      let intList = [];
      let floatList = [];
      let stringList = [];
      let objectList = [];

      let tmpList = struct.getFieldByLabel('IntList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        intList[i] = tmpList[i].getFieldByLabel('Value').getValue();
      }

      tmpList = struct.getFieldByLabel('FloatList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        floatList[i] = tmpList[i].getFieldByLabel('Value').getValue();
      }

      tmpList = struct.getFieldByLabel('StringList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        stringList[i] = tmpList[i].getFieldByLabel('Value').getValue();
      }

      tmpList = struct.getFieldByLabel('ObjectList').getChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        objectList[i] = tmpList[i].getFieldByLabel('Value').getValue();
      }

      //Initialize the effect object based on the type
      switch(eType){
        case GameEffectType.EffectHaste: //Haste
          effect = new EffectHaste();
        break;
        case GameEffectType.EffectDamageResistance: //DamageResistance
          effect = new EffectDamageResistance();
        break;
        case GameEffectType.EffectSlow: //Slow
          effect = new EffectSlow();
        break;
        case GameEffectType.EffectResurrection: //Resurrection
          effect = new EffectResurrection();
        break;
        case GameEffectType.EffectDisease: //Disease
          effect = new EffectDisease();
        break;
        case GameEffectType.EffectRegenerate: //Regenerate
          effect = new EffectRegenerate();
        break;
        case GameEffectType.EffectAttackIncrease: //AttackIncrease
          effect = new EffectAttackIncrease();
        break;
        case GameEffectType.EffectAttackDecrease: //AttackDecrease
          effect = new EffectAttackDecrease();
        break;
        case GameEffectType.EffectDamageReduction: //DamageReduction
          effect = new EffectDamageReduction();
        break;
        case GameEffectType.EffectDamageIncrease: //DamageIncrease
          effect = new EffectDamageIncrease();
        break;
        case GameEffectType.EffectDamageDecrease: //DamageDecrease
          effect = new EffectDamageDecrease();
        break;
        case GameEffectType.EffectTemporaryHitPoints: //TemporaryHitpoints
          effect = new EffectTemporaryHitPoints();
        break;
        case GameEffectType.EffectDamageImmunityIncrease: //DamageImmunityIncrease
          effect = new EffectDamageImmunityIncrease();
        break;
        case GameEffectType.EffectDamageImmunityDecrease: //DamageImmunityDecrease
          effect = new EffectDamageImmunityDecrease();
        break;
        case GameEffectType.EffectEntangle: //Entangle
          effect = new EffectEntangle();
        break;
        case GameEffectType.EffectDeath: //Death
          effect = new EffectDeath();
        break;
        case GameEffectType.EffectKnockdown: //Knockdown

        break;
        case GameEffectType.EffectDeaf: //Deaf

        break;
        case GameEffectType.EffectImmunity: //Immunity
          effect = new EffectImmunity();
        break;
        case GameEffectType.EffectEnemyAttackBonus: //EnemyAttackBonus

        break;
        case GameEffectType.EffectSavingThrowIncrease: //SavingThrowIncrease
          effect = new EffectSavingThrowIncrease();
        break;
        case GameEffectType.EffectSavingThrowDecrease: //SavingThrowDecrease
          effect = new EffectSavingThrowDecrease();
        break;
        case GameEffectType.EffectMovementSpeedIncrease: //MovementSpeedIncrease
          effect = new EffectMovementSpeedIncrease();
        break;
        case GameEffectType.EffectMovementSpeedDecrease: //MovementSpeedDecrease
          effect = new EffectMovementSpeedDecrease();
        break;
        case GameEffectType.EffectVisualEffect: //VisualEffect
          effect = new EffectVisualEffect();
        break;
        case GameEffectType.EffectAreaOfEffect: //AreaOfEffect

        break;
        case GameEffectType.EffectBeam: //Beam
          effect = new EffectBeam();
        break;
        case GameEffectType.EffectForceResistanceIncrease: //ForceResistanceIncrease

        break;
        case GameEffectType.EffectForceResistanceDecrease: //ForceResistanceDecrease

        break;
        case GameEffectType.EffectPoison: //Poison
          effect = new EffectPoison();
        break;
        case GameEffectType.EffectAbilityIncrease: //AbilityIncrease
          effect = new EffectAbilityIncrease();
        break;
        case GameEffectType.EffectAbilityDecrease: //AbilityDecrease
          effect = new EffectAbilityDecrease();
        break;
        case GameEffectType.EffectDamage: //Damage
          effect = new EffectDamage();
        break;
        case GameEffectType.EffectHeal: //Heal
          effect = new EffectHeal();
        break;
        case GameEffectType.EffectLink: //Link
          effect = new EffectLink();
        break;
        case GameEffectType.EffectACIncrease: //ACIncrease
          effect = new EffectACIncrease();
        break;
        case GameEffectType.EffectACDecrease: //ACDecrease
          effect = new EffectACDecrease();
        break;
        case GameEffectType.EffectSpellImmunity: //SpellImmunity
          effect = new EffectSpellImmunity();
        break;
        case GameEffectType.EffectSkillIncrease: //SkillIncrease
          effect = new EffectSkillIncrease();
        break;
        case GameEffectType.EffectSkillDecrease: //SkillDecrease
          effect = new EffectSkillDecrease();
        break;
        case GameEffectType.EffectHitPointChangeWhenDying: //HitPointChangeWhenDying

        break;
        case GameEffectType.EffectLimitMovementSpeed: //LimitMovementSpeed

        break;
        case GameEffectType.EffectForcePushed: //ForcePushed

        break;
        case GameEffectType.EffectDamageShield: //DamageShield

        break;
        case GameEffectType.EffectDisguise: //Disguise
          effect = new EffectDisguise();
        break;
        case GameEffectType.EffectSpellLevelAbsorption: //SpellLevelAbsorption

        break;
        case GameEffectType.EffectIcon: //SetEffectIcon
          effect = new EffectIcon();
        break;
        case GameEffectType.EffectRacialType: //RacialType
          effect = new EffectRacialType();
        break;
        case GameEffectType.EffectBonusFeat: //BonusFeat
          effect = new EffectFeat();
        break;
        case GameEffectType.EffectBlasterDeflectionIncrease: //BlasterDeflectionIncrease
          effect = new EffectBlasterDeflectionIncrease();
        break;
        case GameEffectType.EffectBlasterDeflectionDecrease: //BlasterDeflectionDecrease
          effect = new EffectBlasterDeflectionDecrease();
        break;
        case GameEffectType.EffectDamageForcePoints: //EffectDamageForcePoints
          effect = new EffectDamageForcePoints();
        break;
        case GameEffectType.EffectHealForcePoints: //EffectHealForcePoints
          effect = new EffectHealForcePoints();
        break;
        case GameEffectType.EffectForceResisted:
          effect = new EffectForceResisted();
        break;
        case GameEffectType.EffectForceFizzle:
          effect = new EffectForceFizzle();
        break;
        case GameEffectType.EffectForceShield: //ForceShield
          effect = new EffectForceShield();
        break;
        case GameEffectType.EffectSetState: //EffectSetState
          effect = new EffectSetState();
        break;
      }

      let eSkipOnLoad = struct.getFieldByLabel('SkipOnLoad').getValue();
      if(!eSkipOnLoad){

        if(typeof effect !== 'undefined'){
          effect.setDuration(eDuration);
          effect.setExpireDay(eExpireDay);
          effect.setExpireTime(eExpireTime);
          effect.setCreator(eCreator);
          effect.setSpellId(eSpellId == 4294967295 ? -1 : eSpellId);
          effect.setSubTypeUnMasked(eSubType);

          effect.setNumIntegers(eNumIntegers);
          effect.setIntList(intList);
          effect.setFloatList(floatList);
          effect.setStringList(stringList);
          effect.setObjectList(objectList);
          //console.log('Handled Effect', eType, struct.ToJSON());
          //effect.initialize();
        }else{
          console.log('Unhandled Effect', eType, struct.toJSON());
        }
      }else{
        if(typeof effect !== 'undefined'){
          //console.log('Skipped Effect', eType, struct.ToJSON());
        }else{
          console.log('Unhandled Skipped Effect', eType, struct.toJSON());
        }
        effect = undefined;
      }

      return effect;
    }
    return undefined;
  }

  getSaveType(){
    return this.type;
  }

  save(){

    let effectStruct = new GFFStruct(2);
    effectStruct.addField( new GFFField(GFFDataType.DWORD64, 'Id') ).setValue(0);
    effectStruct.addField( new GFFField(GFFDataType.WORD, 'Type') ).setValue(this.getSaveType());
    effectStruct.addField( new GFFField(GFFDataType.WORD, 'SubType') ).setValue(this.getSubTypeUnMasked());
    effectStruct.addField( new GFFField(GFFDataType.FLOAT, 'Duration') ).setValue(this.getDuration());
    effectStruct.addField( new GFFField(GFFDataType.BYTE, 'SkipOnLoad') ).setValue(this.skipOnLoad ? 1 : 0);
    effectStruct.addField( new GFFField(GFFDataType.DWORD, 'ExpireDay') ).setValue(this.getExpireDay());
    effectStruct.addField( new GFFField(GFFDataType.DWORD, 'ExpireTime') ).setValue(this.getExpireTime());
    effectStruct.addField( new GFFField(GFFDataType.DWORD, 'CreatorId') ).setValue( typeof this.creator === 'object' ? this.creator.id : 2130706432 );
    effectStruct.addField( new GFFField(GFFDataType.DWORD, 'SpellId') ).setValue(this.getSpellId() >= 0 ? this.getSpellId() : 4294967295);
    effectStruct.addField( new GFFField(GFFDataType.INT, 'IsExposed') ).setValue(1);
    effectStruct.addField( new GFFField(GFFDataType.INT, 'NumIntegers') ).setValue(8);

    let intList = effectStruct.addField( new GFFField(GFFDataType.LIST, 'IntList') );
    for(let i = 0; i < 8; i++){
      let intStruct = new GFFStruct(3);
      intStruct.addField( new GFFField(GFFDataType.INT, "Value").setValue(this.getInt(i) || 0));
      intList.addChildStruct(intStruct);
    }

    let floatList = effectStruct.addField( new GFFField(GFFDataType.LIST, 'FloatList') );
    for(let i = 0; i < 4; i++){
      let floatStruct = new GFFStruct(4);
      floatStruct.addField( new GFFField(GFFDataType.FLOAT, "Value").setValue(this.getFloat(i) || 0.0));
      floatList.addChildStruct(floatStruct);
    }

    let stringList = effectStruct.addField( new GFFField(GFFDataType.LIST, 'StringList') );
    for(let i = 0; i < 6; i++){
      let stringStruct = new GFFStruct(5);
      stringStruct.addField( new GFFField(GFFDataType.CEXOSTRING, "Value").setValue(this.getString(i) || ''));
      stringList.addChildStruct(stringStruct);
    }

    let objectList = effectStruct.addField( new GFFField(GFFDataType.LIST, 'ObjectList') );
    for(let i = 0; i < 6; i++){
      let objectStruct = new GFFStruct(5);
      objectStruct.addField( new GFFField(GFFDataType.DWORD, "Value").setValue( this.getObject(i) ? this.getObject(i).id : 2130706432 ));
      objectList.addChildStruct(objectStruct);
    }

    return effectStruct;

  }

}
