import { GameState } from "../GameState";
import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "../enums/effects/GameEffectSubType";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { GFFDataType } from "../enums/resource/GFFDataType";
// import { ModuleObjectManager } from "../managers/ModuleObjectManager";
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
      this.creator = GameState.ModuleObjectManager.GetObjectById(this.creator);
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
