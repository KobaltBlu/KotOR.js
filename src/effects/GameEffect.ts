import { EffectDisguise, EffectAbilityDecrease, EffectAbilityIncrease, EffectACDecrease, EffectACIncrease, EffectAttackDecrease, EffectAttackIncrease, EffectBeam, EffectBlasterDeflectionDecrease, EffectBlasterDeflectionIncrease, EffectDamage, EffectDamageDecrease, EffectDamageForcePoints, EffectDamageImmunityDecrease, EffectDamageImmunityIncrease, EffectDamageIncrease, EffectDamageReduction, EffectDamageResistance, EffectDeath, EffectDisease, EffectEntangle, EffectFeat, EffectForceFizzle, EffectForceResisted, EffectForceShield, EffectHaste, EffectHeal, EffectHealForcePoints, EffectIcon, EffectImmunity, EffectLink, EffectMovementSpeedDecrease, EffectMovementSpeedIncrease, EffectPoison, EffectRacialType, EffectRegenerate, EffectResurrection, EffectSavingThrowDecrease, EffectSavingThrowIncrease, EffectSetState, EffectSkillDecrease, EffectSkillIncrease, EffectSlow, EffectSpellImmunity, EffectTemporaryHitPoints, EffectVisualEffect } from ".";
import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "../enums/effects/GameEffectSubType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { GFFDataType } from "../enums/resource/GFFDataType";
import { ModuleObjectManager } from "../managers";
import { Module } from "../module";
import type { ModuleObject } from "../module";
import { GFFField } from "../resource/GFFField";
import { GFFStruct } from "../resource/GFFStruct";

//https://github.com/nwnxee/unified/blob/master/NWNXLib/API/Constants/Effect.hpp

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

      let eType = struct.GetFieldByLabel('Type').GetValue();
      let eSubType = struct.GetFieldByLabel('SubType').GetValue();
      let eCreator = struct.GetFieldByLabel('CreatorId').GetValue();
      let eSpellId = struct.GetFieldByLabel('SpellId').GetValue();
      
      let eDuration = struct.GetFieldByLabel('Duration').GetValue();
      let eExpireDay = struct.GetFieldByLabel('ExpireDay').GetValue();
      let eExpireTime = struct.GetFieldByLabel('ExpireTime').GetValue();
      let eNumIntegers = struct.GetFieldByLabel('NumIntegers').GetValue();

      let intList = [];
      let floatList = [];
      let stringList = [];
      let objectList = [];

      let tmpList = struct.GetFieldByLabel('IntList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        intList[i] = tmpList[i].GetFieldByLabel('Value').GetValue();
      }

      tmpList = struct.GetFieldByLabel('FloatList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        floatList[i] = tmpList[i].GetFieldByLabel('Value').GetValue();
      }

      tmpList = struct.GetFieldByLabel('StringList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        stringList[i] = tmpList[i].GetFieldByLabel('Value').GetValue();
      }

      tmpList = struct.GetFieldByLabel('ObjectList').GetChildStructs();
      for(let i = 0, len = tmpList.length; i < len; i++){
        objectList[i] = tmpList[i].GetFieldByLabel('Value').GetValue();
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

      let eSkipOnLoad = struct.GetFieldByLabel('SkipOnLoad').GetValue();
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
          console.log('Unhandled Effect', eType, struct.ToJSON());
        }
      }else{
        if(typeof effect !== 'undefined'){
          //console.log('Skipped Effect', eType, struct.ToJSON());
        }else{
          console.log('Unhandled Skipped Effect', eType, struct.ToJSON());
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
    effectStruct.AddField( new GFFField(GFFDataType.DWORD64, 'Id') ).SetValue(0);
    effectStruct.AddField( new GFFField(GFFDataType.WORD, 'Type') ).SetValue(this.getSaveType());
    effectStruct.AddField( new GFFField(GFFDataType.WORD, 'SubType') ).SetValue(this.getSubTypeUnMasked());
    effectStruct.AddField( new GFFField(GFFDataType.FLOAT, 'Duration') ).SetValue(this.getDuration());
    effectStruct.AddField( new GFFField(GFFDataType.BYTE, 'SkipOnLoad') ).SetValue(this.skipOnLoad ? 1 : 0);
    effectStruct.AddField( new GFFField(GFFDataType.DWORD, 'ExpireDay') ).SetValue(this.getExpireDay());
    effectStruct.AddField( new GFFField(GFFDataType.DWORD, 'ExpireTime') ).SetValue(this.getExpireTime());
    effectStruct.AddField( new GFFField(GFFDataType.DWORD, 'CreatorId') ).SetValue( typeof this.creator === 'object' ? this.creator.id : 2130706432 );
    effectStruct.AddField( new GFFField(GFFDataType.DWORD, 'SpellId') ).SetValue(this.getSpellId() >= 0 ? this.getSpellId() : 4294967295);
    effectStruct.AddField( new GFFField(GFFDataType.INT, 'IsExposed') ).SetValue(1);
    effectStruct.AddField( new GFFField(GFFDataType.INT, 'NumIntegers') ).SetValue(8);

    let intList = effectStruct.AddField( new GFFField(GFFDataType.LIST, 'IntList') );
    for(let i = 0; i < 8; i++){
      let intStruct = new GFFStruct(3);
      intStruct.AddField( new GFFField(GFFDataType.INT, "Value").SetValue(this.getInt(i) || 0));
      intList.AddChildStruct(intStruct);
    }

    let floatList = effectStruct.AddField( new GFFField(GFFDataType.LIST, 'FloatList') );
    for(let i = 0; i < 4; i++){
      let floatStruct = new GFFStruct(4);
      floatStruct.AddField( new GFFField(GFFDataType.FLOAT, "Value").SetValue(this.getFloat(i) || 0.0));
      floatList.AddChildStruct(floatStruct);
    }

    let stringList = effectStruct.AddField( new GFFField(GFFDataType.LIST, 'StringList') );
    for(let i = 0; i < 6; i++){
      let stringStruct = new GFFStruct(5);
      stringStruct.AddField( new GFFField(GFFDataType.CEXOSTRING, "Value").SetValue(this.getString(i) || ''));
      stringList.AddChildStruct(stringStruct);
    }

    let objectList = effectStruct.AddField( new GFFField(GFFDataType.LIST, 'ObjectList') );
    for(let i = 0; i < 6; i++){
      let objectStruct = new GFFStruct(5);
      objectStruct.AddField( new GFFField(GFFDataType.DWORD, "Value").SetValue( this.getObject(i) ? this.getObject(i).id : 2130706432 ));
      objectList.AddChildStruct(objectStruct);
    }

    return effectStruct;

  }

}
