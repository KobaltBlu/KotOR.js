import EngineLocation from "../engine/EngineLocation";
import { CreatureType } from "../enums/nwscript/CreatureType";
import { NWModuleObjectType } from "../enums/nwscript/NWModuleObjectType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { ReputationType } from "../enums/nwscript/ReputationType";
import { BitWise } from "../utility/BitWise";
import { PartyManager } from "./PartyManager";
import * as THREE from "three";
import type { Module, ModuleCreature, ModuleObject } from "../module";
import { PerceptionMask } from "../enums/engine/PerceptionMask";

/**
 * ModuleObjectManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ModuleObjectManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ModuleObjectManager {

  static objSearchIndex: number;
  static module: Module;

  static ObjectList: Map<any, ModuleObject> = new Map();
  static COUNT: number = 1;
  static PLAYER_ID = ModuleObjectConstant.PLAYER_ID;

  static GetObjectById(id: ModuleObject|number = -1){

    if(id == ModuleObjectConstant.OBJECT_INVALID)
      return undefined;

    if(typeof id === 'object'){
      if(id.id >= 1){
        return id;
      }
    }

    if(this.ObjectList.has(id)){
      return this.ObjectList.get(id);
    }
    return undefined;

  }

  static GetNextObjectId(){
    return this.COUNT++;
  }

  static ResetPlayerId(){
    this.PLAYER_ID = ModuleObjectConstant.PLAYER_ID;
  };

  static GetNextPlayerId(){
    console.log('GetNextPlayerId', this.PLAYER_ID);
    return this.PLAYER_ID--;
  }

  static AddObjectById(object: ModuleObject){
    if(!object.id){
      object.id = this.GetNextObjectId();
      while(this.ObjectList.has(object.id)){
        object.id = this.GetNextObjectId();
      }
    }
    this.ObjectList.set(object.id, object);
  }

  static RemoveObject(object: ModuleObject){
    if(!object) return;
    this.RemoveObjectById(object?.id);
  }

  static RemoveObjectById(id: number): boolean {
    if(isNaN(id)) return false;
    //Remove the object from the global list of objects
    if(id >= 1 && this.ObjectList.has(id)){
      return this.ObjectList.delete(id);
    }
    return false;
  }

  static Reset(){
    this.COUNT = 1;
    this.PLAYER_ID = ModuleObjectConstant.PLAYER_ID;
    this.ObjectList.clear();
  }

  public static GetObjectByTag(sTag = '', iNum = 0, oType = NWModuleObjectType.ALL){

    /*ModuleObjectType.CREATURE         = 1;
    ModuleObjectType.ITEM             = 2;
    ModuleObjectType.TRIGGER          = 4;
    ModuleObjectType.DOOR             = 8;
    ModuleObjectType.AOE   = 16;
    ModuleObjectType.WAYPOINT         = 32;
    ModuleObjectType.PLACEABLE        = 64;
    ModuleObjectType.STORE            = 128;
    ModuleObjectType.ENCOUNTER        = 256;
    ModuleObjectType.SOUND            = 512;
    OBJECT_TYPE_ALL              = 32767;*/

    sTag = sTag.toLowerCase();
    let results: ModuleObject[] = [];
    let obj: any = undefined;
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){
      for(let i = 0, len = this.module.area.placeables.length; i < len; i++){
        obj = this.module.area.placeables[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      for(let i = 0, len = this.module.area.creatures.length; i < len; i++){
        obj = this.module.area.creatures[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      for(let i = 0, len = PartyManager.party.length; i < len; i++){
        obj = PartyManager.party[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){
      for(let i = 0, len = this.module.area.stores.length; i < len; i++){
        obj = this.module.area.stores[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){
      for(let i = 0, len = this.module.area.doors.length; i < len; i++){
        obj = this.module.area.doors[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){
      for(let i = 0, len = this.module.area.triggers.length; i < len; i++){
        obj = this.module.area.triggers[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){
      for(let i = 0, len = this.module.area.waypoints.length; i < len; i++){
        obj = this.module.area.waypoints[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){
      for(let i = 0, len = this.module.area.sounds.length; i < len; i++){
        obj = this.module.area.sounds[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){
      for(let i = 0, len = this.module.area.items.length; i < len; i++){
        obj = this.module.area.items[i];
        if(obj.getTag().toLowerCase() == sTag)
          results.push(obj);
      }
    }

    if(sTag == '' || sTag == 'player'){
      return PartyManager.party[0];
    }else if(results.length){
      return results[iNum];
    }

    return undefined;

  }

  public static GetNearestObjectByTag(sTag = '', oObject: ModuleObject, iNum = 0){
    sTag = sTag.toLowerCase();
    let results: ModuleObject[] = [];
    let len = this.module.area.placeables.length;
    for(let i = 0; i < len; i++){
      if(this.module.area.placeables[i].getTag().toLowerCase() == sTag)
        if(oObject != this.module.area.placeables[i])
          results.push(this.module.area.placeables[i]);
    }

    len = PartyManager.party.length;
    for(let i = 0; i < len; i++){
      if(PartyManager.party[i].getTag().toLowerCase() == sTag)
        if(oObject != PartyManager.party[i])
          results.push(PartyManager.party[i]);
    }

    len = this.module.area.creatures.length;
    for(let i = 0; i < len; i++){
      if(this.module.area.creatures[i].getTag().toLowerCase() == sTag)
        if(oObject != this.module.area.creatures[i])
          results.push(this.module.area.creatures[i]);
    }

    len = this.module.area.items.length;
    for(let i = 0; i < len; i++){
      if(this.module.area.items[i].getTag().toLowerCase() == sTag)
        if(oObject != this.module.area.items[i])
          results.push(this.module.area.items[i]);
    }

    len = this.module.area.doors.length;
    for(let i = 0; i < len; i++){
      if(this.module.area.doors[i].getTag().toLowerCase() == sTag)
        if(oObject != this.module.area.doors[i])
          results.push(this.module.area.doors[i]);
    }

    len = this.module.area.triggers.length;
    for(let i = 0; i < len; i++){
      if(this.module.area.triggers[i].getTag().toLowerCase() == sTag)
        if(oObject != this.module.area.triggers[i])
          results.push(this.module.area.triggers[i]);
    }

    len = this.module.area.waypoints.length;
    for(let i = 0; i < len; i++){
      if(this.module.area.waypoints[i].getTag().toLowerCase() == sTag)
        if(oObject != this.module.area.waypoints[i])
          results.push(this.module.area.waypoints[i]);
    }

    len = this.module.area.sounds.length;
    for(let i = 0; i < len; i++){
      if(this.module.area.sounds[i].getTag().toLowerCase() == sTag)
        if(oObject != this.module.area.sounds[i])
          results.push(this.module.area.sounds[i]);
    }

    results.sort(
      function(a,b) {
        try{
          let distanceA = a.getModel().position.distanceTo(oObject.getModel().position);
          let distanceB = b.getModel().position.distanceTo(oObject.getModel().position);
          return (distanceB > distanceA) ? -1 : ((distanceA > distanceB) ? 1 : 0);
        }catch(e){
          return 0;
        }
      }
    );

    if(results.length){
      return results[iNum];
    }

    return undefined;

  }

  public static GetNearestInteractableObject(oObject?: ModuleObject){
    let results: ModuleObject[] = [];

    results = results.concat(PartyManager.party);
    results = results.concat(this.module.area.creatures);
    results = results.concat(this.module.area.doors);
    results = results.concat(this.module.area.placeables);

    results.sort(
      function(a,b) {
        try{
          let distanceA = a.position.distanceTo(oObject.position);
          let distanceB = b.position.distanceTo(oObject.position);
          return (distanceB > distanceA) ? -1 : ((distanceA > distanceB) ? 1 : 0);
        }catch(e){
          return 0;
        }
      }
    );

    let result: any;
    let count = results.length;

    for(let i = 0; i < count; i++){
      result = results[i];
      if( result != PartyManager.party[0] && result.isOnScreen() && result.isUseable() ){
        if( result.hasLineOfSight( PartyManager.party[0] ) ){
          break;
        }
      }
      result = undefined;
    }

    return result;

  }

  public static GetNearestObject(oType = 0, oObject: ModuleObject, iNum = 0){
    let results: ModuleObject[] = [];

    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      results = results.concat(this.module.area.creatures);
    }
    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){
      results = results.concat(this.module.area.items);
    }
    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){
      results = results.concat(this.module.area.triggers);
    }
    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){
      results = results.concat(this.module.area.doors);
    }
    if((oType & NWModuleObjectType.AOE) == NWModuleObjectType.AOE){
      //results = results.concat([]);
    }
    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){
      results = results.concat(this.module.area.waypoints);
    }
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){
      results = results.concat(this.module.area.placeables);
    }
    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){
      results = results.concat(this.module.area.stores);
    }
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){
      results = results.concat(this.module.area.encounters);
    }
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){
      results = results.concat(this.module.area.sounds);
    }

    results.sort(
      function(a,b) {
        try{
          let distanceA = a.position.distanceTo(oObject.position);
          let distanceB = b.position.distanceTo(oObject.position);
          return (distanceB > distanceA) ? -1 : ((distanceA > distanceB) ? 1 : 0);
        }catch(e){
          return 0;
        }
      }
    );

    if(results.length){
      return results[iNum];
    }

    return undefined;

  }

  public static GetFirstObjectInArea(oArea = this.module.area, oType = 0){

    if(!(BitWise.InstanceOf(oArea?.objectType, ModuleObjectType.ModuleArea))){
      console.error(oArea);
      oArea = this.module.area;
    }
      

    ModuleObjectManager.objSearchIndex = 0;

    let results: ModuleObject[] = [];
    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      results = results.concat(this.module.area.creatures);
    }
    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){
      results = results.concat(this.module.area.items);
    }
    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){
      results = results.concat(this.module.area.triggers);
    }
    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){
      results = results.concat(this.module.area.doors);
    }
    if((oType & NWModuleObjectType.AOE) == NWModuleObjectType.AOE){
      //results = results.concat([]);
    }
    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      results = results.concat(this.module.area.creatures);
    }
    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){
      results = results.concat(this.module.area.waypoints);
    }
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){
      results = results.concat(this.module.area.placeables);
    }
    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){
      results = results.concat(this.module.area.stores);
    }
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){
      results = results.concat(this.module.area.encounters);
    }
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){
      results = results.concat(this.module.area.sounds);
    }

    if(results.length){
      return results[ModuleObjectManager.objSearchIndex];
    }
    return undefined;
  }

  public static GetNextObjectInArea(oArea = this.module.area, oType = 0){
    if(!(BitWise.InstanceOf(oArea?.objectType, ModuleObjectType.ModuleArea))){
      console.error(oArea);
      oArea = this.module.area;
    }
    ++ModuleObjectManager.objSearchIndex;

    let results: ModuleObject[] = [];
    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      results = results.concat(this.module.area.creatures);
    }
    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){
      results = results.concat(this.module.area.items);
    }
    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){
      results = results.concat(this.module.area.triggers);
    }
    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){
      results = results.concat(this.module.area.doors);
    }
    if((oType & NWModuleObjectType.AOE) == NWModuleObjectType.AOE){
      //results = results.concat([]);
    }
    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      results = results.concat(this.module.area.creatures);
    }
    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){
      results = results.concat(this.module.area.waypoints);
    }
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){
      results = results.concat(this.module.area.placeables);
    }
    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){
      results = results.concat(this.module.area.stores);
    }
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){
      results = results.concat(this.module.area.encounters);
    }
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){
      results = results.concat(this.module.area.sounds);
    }

    if(ModuleObjectManager.objSearchIndex < results.length-1){
      return results[ModuleObjectManager.objSearchIndex];
    }
    return undefined;
  }

  public static GetNearestCreature(nFirstCriteriaType: CreatureType, nFirstCriteriaValue: any, oTarget: ModuleObject, nNth=1, nSecondCriteriaType=-1, nSecondCriteriaValue=-1, nThirdCriteriaType=-1,  nThirdCriteriaValue=-1, list?: ModuleCreature[] ): ModuleCreature {
    
    if(!list){
      list = this.module.area.creatures;
      list = list.concat(PartyManager.party);
    }

    let results: ModuleCreature[] = [];
    
    switch(nFirstCriteriaType){
      case CreatureType.RACIAL_TYPE:

      break;
      case CreatureType.PLAYER_CHAR:

      break;
      case CreatureType.CLASS:

      break;
      case CreatureType.REPUTATION:
        switch(nFirstCriteriaValue){
          case ReputationType.FRIEND:
            for(let i = 0; i < list.length; i++){
              if(list[i].isDead()){ continue; }
              if(list[i].isFriendly(oTarget) && oTarget.hasLineOfSight(list[i])){
                results.push(list[i]);
              }
            }
          break;
          case ReputationType.ENEMY:
            for(let i = 0; i < list.length; i++){
              if(list[i].isDead()){ continue; }
              if(list[i].isHostile(oTarget) && oTarget.hasLineOfSight(list[i])){
                results.push(list[i]);
              }
            }
          break;  
          case ReputationType.NEUTRAL:
            for(let i = 0; i < list.length; i++){
              if(list[i].isDead()){ continue; }
              if(list[i].isNeutral(oTarget) && oTarget.hasLineOfSight(list[i])){
                results.push(list[i]);
              }
            }
          break;
        }
      break;
      case CreatureType.IS_ALIVE:
        for(let i = 0; i < list.length; i++){
          if(list[i].isDead()){ continue; }
          results.push(list[i]);
        }
      break;
      case CreatureType.HAS_SPELL_EFFECT:

      break;
      case CreatureType.DOES_NOT_HAVE_SPELL_EFFECT:

      break;
      case CreatureType.PERCEPTION:
        for(let i = 0; i < list.length; i++){
          switch(nFirstCriteriaValue){
            case 0:// PERCEPTION_SEEN_AND_HEARD	0	Both seen and heard (Spot beats Hide, Listen beats Move Silently).
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !!(o.data & PerceptionMask.SEEN_AND_HEARD) ).length){
                if(list[i].isDead()){ continue; }
                results.push(list[i]);
              }
            break;
            case 1:// PERCEPTION_NOT_SEEN_AND_NOT_HEARD	1	Neither seen nor heard (Hide beats Spot, Move Silently beats Listen).
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !(o.data & PerceptionMask.SEEN_AND_HEARD) ).length){
                if(list[i].isDead()){ continue; }
                results.push(list[i]);
              }
            break;
            case 2:// PERCEPTION_HEARD_AND_NOT_SEEN	2	 Heard only (Hide beats Spot, Listen beats Move Silently). Usually arouses suspicion for a creature to take a closer look.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !(o.data & PerceptionMask.SEEN) && !!(o.data & PerceptionMask.HEARD) ).length){
                if(list[i].isDead()){ continue; }
                results.push(list[i]);
              }
            break;
            case 3:// PERCEPTION_SEEN_AND_NOT_HEARD	3	Seen only (Spot beats Hide, Move Silently beats Listen). Usually causes a creature to take instant notice.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !!(o.data & PerceptionMask.SEEN) && !(o.data & PerceptionMask.HEARD) ).length){
                if(list[i].isDead()){ continue; }
                results.push(list[i]);
              }
            break;
            case 4:// PERCEPTION_NOT_HEARD 4 Not heard (Move Silently beats Listen), no line of sight.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !(o.data & PerceptionMask.HEARD) ).length){
                if(list[i].isDead()){ continue; }
                results.push(list[i]);
              }
            break;
            case 5:// PERCEPTION_HEARD 5 Heard (Listen beats Move Silently), no line of sight.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !!(o.data & PerceptionMask.HEARD) ).length){
                if(list[i].isDead()){ continue; }
                results.push(list[i]);
              }
            break;
            case 6:// PERCEPTION_NOT_SEEN	6	Not seen (Hide beats Spot), too far away to heard or magically silcenced.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !(o.data & PerceptionMask.SEEN) ).length){
                if(list[i].isDead()){ continue; }
                results.push(list[i]);
              }
            break;
            case 7:// PERCEPTION_SEEN	7	Seen (Spot beats Hide), too far away to heard or magically silcenced.
              if(oTarget.perceptionList.filter( (o) => o.object == list[i] && !!(o.data & PerceptionMask.SEEN)  ).length){
                if(list[i].isDead()){ continue; }
                results.push(list[i]);
              }
            break;
          }

        }
      break;
    }

    if(nSecondCriteriaType >= 0){
      return ModuleObjectManager.GetNearestCreature(nSecondCriteriaType, nSecondCriteriaValue, oTarget, nNth, nThirdCriteriaType, nThirdCriteriaValue, -1, -1, results);
    }

    if(results.length){
      results.sort((a: any, b: any) => {
        return oTarget.position.distanceTo(a.position) - oTarget.position.distanceTo(b.position);
      });
      return results[nNth-1];
    }

    return undefined;
  }

  public static GetObjectsInShape(shape = -1, size = 1, target: EngineLocation, lineOfSight = false, oType = -1, origin = new THREE.Vector3, idx = -1){

    let object_pool: ModuleObject[] = [];
    let results: ModuleObject[] = [];

    /*
    int    ModuleObjectType.CREATURE         = 1;
    int    ModuleObjectType.ITEM             = 2;
    int    ModuleObjectType.TRIGGER          = 4;
    int    ModuleObjectType.DOOR             = 8;
    int    ModuleObjectType.AOE   = 16;
    int    ModuleObjectType.WAYPOINT         = 32;
    int    ModuleObjectType.PLACEABLE        = 64;
    int    ModuleObjectType.STORE            = 128;
    int    ModuleObjectType.ENCOUNTER        = 256;
    int    ModuleObjectType.SOUND            = 512;
    int    OBJECT_TYPE_ALL              = 32767;
    */

    //console.log('GetObjectsInShape', objectFilter, shape);

    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){ //CREATURE
      object_pool = object_pool.concat(this.module.area.creatures);
    }

    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){ //ITEM
      object_pool = object_pool.concat(this.module.area.items);
    }

    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){ //TRIGGER
      object_pool = object_pool.concat(this.module.area.triggers); 
    }

    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){ //DOOR
      object_pool = object_pool.concat(this.module.area.doors); 
    }

    if((oType & NWModuleObjectType.AOE) == NWModuleObjectType.AOE){ //AOE
              
    }

    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){ //WAYPOINTS
      object_pool = object_pool.concat(this.module.area.waypoints);
    }
    
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){ //PLACEABLE
      object_pool = object_pool.concat(this.module.area.placeables);
    }

    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){ //STORE
          
    }
    
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){ //ENCOUNTER
          
    }
    
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){ //SOUND
      object_pool = object_pool.concat(this.module.area.sounds);
    }

    for(let i = 0, len = object_pool.length; i < len; i++){
      if(BitWise.InstanceOf(object_pool[i]?.objectType, ModuleObjectType.ModuleObject)){
        if(object_pool[i].position.distanceTo(target.position) < size){
          results.push(object_pool[i]);
        }
      }
    }

    if(idx == -1){
      return results;
    }else{
      return results[idx];
    }

  }

  public static GetAttackerByIndex(oTarget: ModuleObject, index: number = 0): ModuleObject {
    let object_pool: ModuleObject[] = [];
    
    object_pool.concat(
      this.module.area.creatures.filter( 
        (
          creature => 
          {
            return (
              creature.combatData.lastAttackTarget == oTarget ||
              creature.combatData.lastSpellTarget == oTarget
            );
          }
        )
      )
    );

    return object_pool[index];
  }

}