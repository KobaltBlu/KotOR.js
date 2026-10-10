import { GameState } from "@engine/runtime/GameState";
import { GameEffectDurationType } from "@core/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@core/enums/effects/GameEffectSubType";
import { GameEffectType } from "@core/enums/effects/GameEffectType";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
// import { GameObjectManager } from "@engine/managers/GameObjectManager";
import type { Module } from "@engine/module/Module";
import type { GameObject } from "@engine/module/GameObject";
import { GameEffectSerializer } from "@engine/module/serialization/GameEffectSerializer";

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
  /** Saved CreatorId DWORD for deferred resolve. */
  creatorObjectId: number = 0;
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
  objectList: GameObject[] = [];
  /** Saved ObjectList DWORDs for deferred resolve. */
  objectListIds: number[] = [];
  object: GameObject;
  type: GameEffectType;
  /** id — DWORD64 allocated from Module.effectNextId */
  id: number = 0;
  /** is_exposed — whether the effect is shown on the character sheet */
  isExposed: boolean = true;
  
  constructor(){
    this.creator = undefined;
    this.creatorObjectId = 0;
    this.duration = 0;
    this.expireDay = 0;
    this.expireTime = 0;
    this.spellId = -1;
    // / NWN default subtype bit = MAGICAL (dispellable when TEMPORARY/PERMANENT)
    this.subType = GameEffectSubType.MAGICAL;
    this.skipOnLoad = false;
    this.id = 0;
    this.isExposed = true;

    this.applied = false;
    this.initialized = false;
    this.durationEnded = false;

    this.numIntegers = 8;
    this.intList = [];
    this.floatList = [];
    this.stringList = [];
    this.objectList = [];
    this.objectListIds = [];

  }

  initialize() {
    if(this.initialized)
      return this;

    this.resolveObjectReferences();
    this.initialized = true;
    return this;
  }

  /**
   * Resolve CreatorId / ObjectList DWORDs via GetObjectById.
   * Safe to call again after all creatures are registered (PerceptionList pattern).
   */
  resolveObjectReferences(){
    if(typeof this.creator === 'number' || (!this.creator && this.creatorObjectId)){
      const id = typeof this.creator === 'number' ? this.creator : this.creatorObjectId;
      if(id && id !== GameObjectConstant.OBJECT_INVALID){
        this.creatorObjectId = id;
        this.creator = GameState.GameObjectManager.GetObjectById(id) ?? this.creator;
      }
    }else if(this.creator && typeof this.creator === 'object' && this.creator.id){
      this.creatorObjectId = this.creator.id;
    }

    const idCount = Math.max(this.objectListIds.length, this.objectList.length);
    for(let i = 0; i < idCount; i++){
      const existing = this.objectList[i];
      if(existing && typeof existing === 'object'){
        if((existing as GameObject).id){
          this.objectListIds[i] = (existing as GameObject).id;
        }
        continue;
      }
      const rawId = this.objectListIds[i]
        ?? (typeof existing === 'number' ? existing : 0);
      if(rawId && rawId !== GameObjectConstant.OBJECT_INVALID){
        this.objectListIds[i] = rawId;
        const resolved = GameState.GameObjectManager.GetObjectById(rawId);
        if(resolved){
          this.objectList[i] = resolved;
        }else{
          this.objectList[i] = rawId as any;
        }
      }
    }
  }

  loadModel(){
    return;
  }

  setCreator(oCreator: GameObject | number){
    if(typeof oCreator === 'number'){
      this.creatorObjectId = oCreator && oCreator !== GameObjectConstant.OBJECT_INVALID
        ? oCreator
        : 0;
      this.creator = this.creatorObjectId
        ? (GameState.GameObjectManager.GetObjectById(this.creatorObjectId) ?? oCreator)
        : undefined;
      return;
    }
    this.creator = oCreator;
    this.creatorObjectId = oCreator?.id && oCreator.id !== GameObjectConstant.OBJECT_INVALID
      ? oCreator.id
      : 0;
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

  setId(id: number = 0){
    this.id = id;
  }

  setIsExposed(exposed: boolean = true){
    this.isExposed = !!exposed;
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

  setObjectList(objectList: Array<GameObject | number> = []){
    if(!Array.isArray(objectList)){
      return;
    }
    this.objectList = [];
    this.objectListIds = [];
    for(let i = 0; i < objectList.length; i++){
      this.setObject(i, objectList[i] as any);
    }
  }

  setObject(nOffset = 0, nValue: GameObject | number){
    if(typeof nValue === 'number'){
      this.objectListIds[nOffset] = nValue && nValue !== GameObjectConstant.OBJECT_INVALID
        ? nValue
        : 0;
      this.objectList[nOffset] = this.objectListIds[nOffset]
        ? (GameState.GameObjectManager.GetObjectById(this.objectListIds[nOffset]) as any ?? nValue as any)
        : undefined as any;
      return;
    }
    this.objectList[nOffset] = nValue;
    this.objectListIds[nOffset] = nValue?.id && nValue.id !== GameObjectConstant.OBJECT_INVALID
      ? nValue.id
      : 0;
  }

  setAttachedObject( oObject: GameObject|Module ){
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
    const entry = this.objectList[nOffset];
    if(typeof entry === 'object' && entry){
      return entry;
    }
    const id = this.objectListIds[nOffset]
      ?? (typeof entry === 'number' ? entry : 0);
    if(id && id !== GameObjectConstant.OBJECT_INVALID){
      const resolved = GameState.GameObjectManager.GetObjectById(id);
      if(resolved){
        this.objectList[nOffset] = resolved;
        return resolved;
      }
    }
    return entry;
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
  onApply(object?: GameObject){
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
    return GameEffectSerializer.serialize(this);
  }

}
