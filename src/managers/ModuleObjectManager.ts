import EngineLocation from "../engine/EngineLocation";
import { CreatureType } from "../enums/nwscript/CreatureType";
import { NWModuleObjectType } from "../enums/nwscript/NWModuleObjectType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "../enums/module/ModuleObjectConstant";
import { ReputationType } from "../enums/nwscript/ReputationType";
import { BitWise } from "../utility/BitWise";
import { PartyManager } from "./PartyManager";
import * as THREE from "three";
import type { Module, ModuleCreature, ModuleDoor, ModuleObject } from "../module";
import { PerceptionMask } from "../enums/engine/PerceptionMask";
import { GameState } from "../GameState";
import { ModuleTriggerType } from "../enums/module/ModuleTriggerType";

const UPDATE_SELECTABLE_OBJECTS_INTERVAL = 0.5;

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
    this.RemoveObjectById(object.id);
    GameState.CursorManager.notifyObjectDestroyed(object);
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

    // Use distanceToSquared for sort comparisons to avoid sqrt per comparison
    const oObjectModel = oObject.getModel();
    const oObjectPos = oObjectModel?.position;
    results.sort(
      function(a,b) {
        try{
          let distanceA = a.getModel().position.distanceToSquared(oObjectPos);
          let distanceB = b.getModel().position.distanceToSquared(oObjectPos);
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
    // Build result array without intermediate concat allocations
    let results: ModuleObject[] = [];
    const party = PartyManager.party;
    const creatures = this.module.area.creatures;
    const doors = this.module.area.doors;
    const placeables = this.module.area.placeables;
    for(let i = 0, l = party.length; i < l; i++) results.push(party[i]);
    for(let i = 0, l = creatures.length; i < l; i++) results.push(creatures[i]);
    for(let i = 0, l = doors.length; i < l; i++) results.push(doors[i]);
    for(let i = 0, l = placeables.length; i < l; i++) results.push(placeables[i]);

    // Use distanceToSquared to avoid sqrt per comparison
    const oPos = oObject.position;
    results.sort(
      function(a,b) {
        try{
          let distanceA = a.position.distanceToSquared(oPos);
          let distanceB = b.position.distanceToSquared(oPos);
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
    // Build result list without intermediate concat allocations
    let results: ModuleObject[] = [];
    const area = this.module.area;

    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      for(let i = 0, l = area.creatures.length; i < l; i++) results.push(area.creatures[i]);
    }
    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){
      for(let i = 0, l = area.items.length; i < l; i++) results.push(area.items[i]);
    }
    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){
      for(let i = 0, l = area.triggers.length; i < l; i++) results.push(area.triggers[i]);
    }
    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){
      for(let i = 0, l = area.doors.length; i < l; i++) results.push(area.doors[i]);
    }
    if((oType & NWModuleObjectType.AOE) == NWModuleObjectType.AOE){
      //results = results.concat([]);
    }
    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){
      for(let i = 0, l = area.waypoints.length; i < l; i++) results.push(area.waypoints[i]);
    }
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){
      for(let i = 0, l = area.placeables.length; i < l; i++) results.push(area.placeables[i]);
    }
    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){
      for(let i = 0, l = area.stores.length; i < l; i++) results.push(area.stores[i]);
    }
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){
      for(let i = 0, l = area.encounters.length; i < l; i++) results.push(area.encounters[i]);
    }
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){
      for(let i = 0, l = area.sounds.length; i < l; i++) results.push(area.sounds[i]);
    }

    // Use distanceToSquared to avoid sqrt per comparison
    const oPos = oObject.position;
    results.sort(
      function(a,b) {
        try{
          let distanceA = a.position.distanceToSquared(oPos);
          let distanceB = b.position.distanceToSquared(oPos);
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

    // Build result list without intermediate concat allocations
    const area = this.module.area;
    let results: ModuleObject[] = [];
    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      for(let i = 0, l = area.creatures.length; i < l; i++) results.push(area.creatures[i]);
    }
    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){
      for(let i = 0, l = area.items.length; i < l; i++) results.push(area.items[i]);
    }
    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){
      for(let i = 0, l = area.triggers.length; i < l; i++) results.push(area.triggers[i]);
    }
    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){
      for(let i = 0, l = area.doors.length; i < l; i++) results.push(area.doors[i]);
    }
    if((oType & NWModuleObjectType.AOE) == NWModuleObjectType.AOE){
      //results = results.concat([]);
    }
    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){
      for(let i = 0, l = area.waypoints.length; i < l; i++) results.push(area.waypoints[i]);
    }
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){
      for(let i = 0, l = area.placeables.length; i < l; i++) results.push(area.placeables[i]);
    }
    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){
      for(let i = 0, l = area.stores.length; i < l; i++) results.push(area.stores[i]);
    }
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){
      for(let i = 0, l = area.encounters.length; i < l; i++) results.push(area.encounters[i]);
    }
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){
      for(let i = 0, l = area.sounds.length; i < l; i++) results.push(area.sounds[i]);
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

    // Build result list without intermediate concat allocations
    const area = this.module.area;
    let results: ModuleObject[] = [];
    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      for(let i = 0, l = area.creatures.length; i < l; i++) results.push(area.creatures[i]);
    }
    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){
      for(let i = 0, l = area.items.length; i < l; i++) results.push(area.items[i]);
    }
    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){
      for(let i = 0, l = area.triggers.length; i < l; i++) results.push(area.triggers[i]);
    }
    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){
      for(let i = 0, l = area.doors.length; i < l; i++) results.push(area.doors[i]);
    }
    if((oType & NWModuleObjectType.AOE) == NWModuleObjectType.AOE){
      //results = results.concat([]);
    }
    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){
      for(let i = 0, l = area.waypoints.length; i < l; i++) results.push(area.waypoints[i]);
    }
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){
      for(let i = 0, l = area.placeables.length; i < l; i++) results.push(area.placeables[i]);
    }
    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){
      for(let i = 0, l = area.stores.length; i < l; i++) results.push(area.stores[i]);
    }
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){
      for(let i = 0, l = area.encounters.length; i < l; i++) results.push(area.encounters[i]);
    }
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){
      for(let i = 0, l = area.sounds.length; i < l; i++) results.push(area.sounds[i]);
    }

    if(ModuleObjectManager.objSearchIndex < results.length-1){
      return results[ModuleObjectManager.objSearchIndex];
    }
    return undefined;
  }

  public static GetNearestCreature(nFirstCriteriaType: CreatureType, nFirstCriteriaValue: any, oTarget: ModuleObject, nNth=1, nSecondCriteriaType=-1, nSecondCriteriaValue=-1, nThirdCriteriaType=-1,  nThirdCriteriaValue=-1, list?: ModuleCreature[] ): ModuleCreature {
    
    if(!list){
      // Avoid concat allocation by building a combined list inline
      const creatures = this.module?.area?.creatures ?? [];
      const party = PartyManager.party as ModuleCreature[];
      list = new Array(creatures.length + party.length);
      for(let i = 0, l = creatures.length; i < l; i++) list[i] = creatures[i];
      for(let i = 0, l = party.length; i < l; i++) list[creatures.length + i] = party[i];
    }

    let results: ModuleCreature[] = [];
    
    switch(nFirstCriteriaType){
      case CreatureType.RACIAL_TYPE:
        for(let i = 0; i < list.length; i++){
          if(list[i].isDead()){ continue; }
          if(list[i].getRace() === nFirstCriteriaValue){
            results.push(list[i]);
          }
        }
      break;
      case CreatureType.PLAYER_CHAR:
        for(let i = 0; i < list.length; i++){
          if(list[i].isDead()){ continue; }
          const isPC = (GameState.PartyManager.party.indexOf(list[i] as any) >= 0 || GameState.PartyManager.Player === list[i]) ? 1 : 0;
          if(isPC === nFirstCriteriaValue){
            results.push(list[i]);
          }
        }
      break;
      case CreatureType.CLASS:
        for(let i = 0; i < list.length; i++){
          if(list[i].isDead()){ continue; }
          if(list[i].getClassLevel(nFirstCriteriaValue) > 0){
            results.push(list[i]);
          }
        }
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
        for(let i = 0; i < list.length; i++){
          if(list[i].isDead()){ continue; }
          const fx = list[i].effects;
          let found = false;
          for(let j = 0; j < fx.length; j++){
            if(fx[j].getSpellId() === nFirstCriteriaValue){ found = true; break; }
          }
          if(found) results.push(list[i]);
        }
      break;
      case CreatureType.DOES_NOT_HAVE_SPELL_EFFECT:
        for(let i = 0; i < list.length; i++){
          if(list[i].isDead()){ continue; }
          const fx = list[i].effects;
          let found = false;
          for(let j = 0; j < fx.length; j++){
            if(fx[j].getSpellId() === nFirstCriteriaValue){ found = true; break; }
          }
          if(!found) results.push(list[i]);
        }
      break;
      case CreatureType.PERCEPTION:
        for(let i = 0; i < list.length; i++){
          if(list[i].isDead()){ continue; }
          // Use a direct loop instead of filter() to avoid per-creature array allocations
          const creature = list[i];
          const perceptionList = oTarget.perceptionList;
          const perceptionLen = perceptionList.length;
          let matched = false;
          for(let p = 0; p < perceptionLen; p++){
            const o = perceptionList[p];
            if(o.object !== creature) continue;
            switch(nFirstCriteriaValue){
              case 0:// PERCEPTION_SEEN_AND_HEARD
                matched = !!(o.data & PerceptionMask.SEEN_AND_HEARD); break;
              case 1:// PERCEPTION_NOT_SEEN_AND_NOT_HEARD
                matched = !(o.data & PerceptionMask.SEEN_AND_HEARD); break;
              case 2:// PERCEPTION_HEARD_AND_NOT_SEEN
                matched = !(o.data & PerceptionMask.SEEN) && !!(o.data & PerceptionMask.HEARD); break;
              case 3:// PERCEPTION_SEEN_AND_NOT_HEARD
                matched = !!(o.data & PerceptionMask.SEEN) && !(o.data & PerceptionMask.HEARD); break;
              case 4:// PERCEPTION_NOT_HEARD
                matched = !(o.data & PerceptionMask.HEARD); break;
              case 5:// PERCEPTION_HEARD
                matched = !!(o.data & PerceptionMask.HEARD); break;
              case 6:// PERCEPTION_NOT_SEEN
                matched = !(o.data & PerceptionMask.SEEN); break;
              case 7:// PERCEPTION_SEEN
                matched = !!(o.data & PerceptionMask.SEEN); break;
            }
            if(matched) break;
          }
          if(matched) results.push(creature);
        }
      break;
    }

    if(nSecondCriteriaType >= 0){
      return ModuleObjectManager.GetNearestCreature(nSecondCriteriaType, nSecondCriteriaValue, oTarget, nNth, nThirdCriteriaType, nThirdCriteriaValue, -1, -1, results);
    }

    if(results.length){
      // Use distanceToSquared to avoid sqrt per comparison
      const oPos = oTarget.position;
      results.sort((a: any, b: any) => {
        return a.position.distanceToSquared(oPos) - b.position.distanceToSquared(oPos);
      });
      return results[nNth-1];
    }

    return undefined;
  }

  public static GetObjectsInShape(shape = -1, size = 1, target: EngineLocation, lineOfSight = false, oType = -1, origin = new THREE.Vector3, idx = -1){

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

    // Build pools without intermediate concat allocations
    const pools: ModuleObject[][] = [];
    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){ //CREATURE
      pools.push(this.module.area.creatures);
    }

    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){ //ITEM
      pools.push(this.module.area.items);
    }

    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){ //TRIGGER
      pools.push(this.module.area.triggers);
    }

    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){ //DOOR
      pools.push(this.module.area.doors);
    }

    if((oType & NWModuleObjectType.AOE) == NWModuleObjectType.AOE){ //AOE
              
    }

    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){ //WAYPOINTS
      pools.push(this.module.area.waypoints);
    }
    
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){ //PLACEABLE
      pools.push(this.module.area.placeables);
    }

    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){ //STORE
          
    }
    
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){ //ENCOUNTER
          
    }
    
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){ //SOUND
      pools.push(this.module.area.sounds);
    }

    // Use distanceToSquared to avoid sqrt per object check
    const sizeSquared = size * size;
    const targetPos = target.position;
    for(let p = 0, pl = pools.length; p < pl; p++){
      const pool = pools[p];
      for(let i = 0, len = pool.length; i < len; i++){
        const obj = pool[i];
        if(BitWise.InstanceOf(obj?.objectType, ModuleObjectType.ModuleObject)){
          if(obj.position.distanceToSquared(targetPos) < sizeSquared){
            results.push(obj);
          }
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
    // Avoid creating intermediate filter arrays; use a direct counted loop
    const creatures = this.module.area.creatures;
    let count = 0;
    for(let i = 0, l = creatures.length; i < l; i++){
      const creature = creatures[i];
      if(creature.combatData.lastAttackTarget == oTarget || creature.combatData.lastSpellTarget == oTarget){
        if(count === index) return creature;
        count++;
      }
    }
    return undefined;
  }

  static playerSelectableObjects: ModuleObject[] = [];
  static playerHoverableObjects: ModuleObject[] = [];
  static #currentVisibleObject: ModuleObject;
  static #currentVisibleObjectIndex: number = 0;

  static SetPlayerVisibleObjects(objects: ModuleObject[]){
    this.playerSelectableObjects = objects;
    this.#currentVisibleObjectIndex = this.playerSelectableObjects.indexOf(this.#currentVisibleObject);
    if(this.#currentVisibleObjectIndex == -1){
      this.#currentVisibleObjectIndex = 0;
      this.#currentVisibleObject = this.playerSelectableObjects[0];
    }
  }

  static GetNextPlayerVisibleObject(){
    this.#currentVisibleObjectIndex++;
    if(this.#currentVisibleObjectIndex >= this.playerSelectableObjects.length){
      this.#currentVisibleObjectIndex = 0;
    }
    this.#currentVisibleObject = this.playerSelectableObjects[this.#currentVisibleObjectIndex];
    return this.#currentVisibleObject;
  }

  static GetPreviousPlayerVisibleObject(){
    this.#currentVisibleObjectIndex--;
    if(this.#currentVisibleObjectIndex < 0){
      this.#currentVisibleObjectIndex = this.playerSelectableObjects.length - 1;
    }
    this.#currentVisibleObject = this.playerSelectableObjects[this.#currentVisibleObjectIndex];
    return this.#currentVisibleObject;
  }

  static #tmpPlayerPosition = new THREE.Vector3();
  static #tmpTargetPosition = new THREE.Vector3();
  static #losZOffset = 1;

  static GetSelectableObjectsInRange(player: ModuleObject): ModuleObject[] {

    this.playerSelectableObjects = [];
    this.playerHoverableObjects = [];

    this.#tmpPlayerPosition.copy(player.position);
    this.#tmpPlayerPosition.z += this.#losZOffset;

    this.#tmpTargetPosition.set(0, 0, 0);

    // Iterate over each pool directly to avoid spread/filter array allocations
    const area = GameState.module.area;
    const sources: ModuleObject[][] = [
      GameState.PartyManager.party,
      area.placeables,
      area.doors,
      area.creatures,
    ];

    for(let s = 0, sl = sources.length; s < sl; s++){
      const source = sources[s];
      for(let i = 0, l = source.length; i < l; i++){
        const obj = source[i];
        this.#processSelectableObject(obj, player);
      }
    }

    // Process trap triggers separately (avoids filter allocation)
    const triggers = area.triggers;
    for(let i = 0, l = triggers.length; i < l; i++){
      const trig = triggers[i];
      if(trig.type === ModuleTriggerType.TRAP){
        this.#processSelectableObject(trig, player);
      }
    }

    this.SetPlayerVisibleObjects(this.playerSelectableObjects);

    if(player.force > 0){
      // Use distanceToSquared to avoid sqrt per comparison
      const playerPos = player.position;
      const closestObject = this.playerSelectableObjects.sort((a, b) => {
        return a.position.distanceToSquared(playerPos) - b.position.distanceToSquared(playerPos);
      })[0];
      this.#currentVisibleObject = closestObject;
      this.#currentVisibleObjectIndex = this.playerSelectableObjects.indexOf(closestObject);
      GameState.CursorManager.setReticleSelectedObject(closestObject);
    }

    if(this.playerSelectableObjects.indexOf(GameState.CursorManager.selectedObject) == -1){
      GameState.CursorManager.selectedObject = undefined;
      GameState.CursorManager.selected = undefined;
      this.#currentVisibleObject = undefined;
      this.#currentVisibleObjectIndex = -1;
      GameState.CursorManager.setReticleSelectedObject(this.#currentVisibleObject);
    }

    return this.playerSelectableObjects;
  }

  /** Shared per-object evaluation for GetSelectableObjectsInRange */
  static #processSelectableObject(obj: ModuleObject, player: ModuleObject): void {
    //Ignore the player
    if(obj == player){ return; }

    //Ignore objects that are not useable
    if(!obj.isUseable()){ return; }

    //Ignore doors that are open
    const isDoor = BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor);
    if(isDoor){
      if((obj as ModuleDoor).isOpen()){ return; }
    }

    this.#tmpTargetPosition.copy(obj.position);
    this.#tmpTargetPosition.z += this.#losZOffset;

    const distance = this.#tmpTargetPosition.distanceToSquared(this.#tmpPlayerPosition);
    if(distance > GameState.maxSelectableDistanceSquared){
      return;
    }

    //Ignore objects that have no area
    if(!obj.area){
      return;
    }

    //Ignore objects that we don't have line of sight to
    if(!obj.hasLineOfSight(player, GameState.maxSelectableDistance)){
      return;
    }

    if(GameState.viewportFrustum.containsPoint(obj.position)){
      this.playerHoverableObjects.push(obj);
    }

    //Add the object to the selectable objects list
    this.playerSelectableObjects.push(obj);
  }

  static tUpdateSelectable = 0;

  /**
   * Updates the cache of selectable objects
   * @param delta - The delta time
   */
  static TickSelectableObjects(delta: number = 0){
    this.tUpdateSelectable -= delta;
    if(this.tUpdateSelectable <= 0){
      //Update the cache of selectable objects
      GameState.ModuleObjectManager.GetSelectableObjectsInRange(PartyManager.party[0]);
      this.tUpdateSelectable = UPDATE_SELECTABLE_OBJECTS_INTERVAL;
    }
  }

}