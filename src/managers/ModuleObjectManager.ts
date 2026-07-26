import EngineLocation from "@/engine/EngineLocation";
import { CreatureType } from "@/enums/nwscript/CreatureType";
import { NWModuleObjectType } from "@/enums/nwscript/NWModuleObjectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { ReputationType } from "@/enums/nwscript/ReputationType";
import { BitWise } from "@/utility/BitWise";
import { PartyManager } from "@/managers/PartyManager";
import * as THREE from "three";
import type { Module, ModuleCreature, ModuleDoor, ModuleObject, ModulePlaceable, ModuleTrigger } from "@/module";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import { GameState } from "@/GameState";
import { ModuleTriggerType } from "@/enums/module/ModuleTriggerType";
import { clearLineOfSight } from "@/engine/pathfinding/clear-line-of-sight";
import { isPointInShape } from "@/combat/objects-in-shape";
import { FollowerCamera } from "@/engine/FollowerCamera";
import { isClientCombatMode } from "@/managers/reticle";
import { AutoPauseState } from "@/enums/engine/AutoPauseState";
import { EngineState } from "@/enums/engine/EngineState";
import { MiniGameObjectArray } from "@/module/minigame/MiniGameObjectArray";

/** First non-MG object id — retail SWMG StackPushObject uses mgo_index 0..0xfe. */
const FIRST_MODULE_OBJECT_ID = MiniGameObjectArray.CAPACITY + 1; // 0x100

/** Retail GetNearestObjects / DoPassiveSelection range (√900). */
const NEAREST_OBJECT_RANGE = 30;
const NEAREST_OBJECT_RANGE_SQ = NEAREST_OBJECT_RANGE * NEAREST_OBJECT_RANGE;
/** Front cone cos(~30°) from GetNearestObjects. */
const FRONT_CONE_DOT = 0.866;
/** Origin offset behind player for front-cone test. */
const FRONT_CONE_ORIGIN_BACK = 4;
/** LOS grace while sticky target briefly occluded (field205_0x368). */
const STICKY_LOS_GRACE_SEC = 1.0;
/** Combat dead-target grace (retail target_changing = 0x3fc00000). */
const TARGET_CHANGING_SEC = 1.5;
/** Enemy / mine sighted latch (field216_0x394 / field219_0x3a0). */
const SIGHTED_LATCH_SEC = 10.0;

type NearestValid = { ok: boolean; hostile: boolean };
type NearestLists = { around: ModuleObject[]; front: ModuleObject[] };

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
  /** Start above mgo_index range (0..0xfe) so module ids never collide with SWMG object ids. */
  static COUNT: number = FIRST_MODULE_OBJECT_ID;
  static PLAYER_ID = ModuleObjectConstant.PLAYER_ID;

  static GetObjectById(id: ModuleObject|number = -1){

    if(id == ModuleObjectConstant.OBJECT_INVALID)
      return undefined;

    // Retail MG StackPushObject uses mgo_index; 0xff = empty / invalid for MG.
    if(id === MiniGameObjectArray.INVALID_INDEX)
      return undefined;

    if(typeof id === 'object' && id != null){
      return id;
    }

    if(this.ObjectList.has(id)){
      return this.ObjectList.get(id);
    }

    // Retail SWMG_* StackPopObject → GetMiniGameObject(mgo_index).
    if(typeof id === 'number' && id >= 0 && id < MiniGameObjectArray.CAPACITY){
      return MiniGameObjectArray.get(id);
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
    this.COUNT = FIRST_MODULE_OBJECT_ID;
    this.PLAYER_ID = ModuleObjectConstant.PLAYER_ID;
    this.ObjectList.clear();
    MiniGameObjectArray.clear();
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
    // Retail FindObjectByTagOrdinal matches "" like any tag against the module
    // tag lookup table. The PC's tag is empty, so an empty lookup resolves to
    // the player — scripts rely on this (e.g. k_pend_traskdl40 moves Trask to
    // GetObjectByTag("")). Alias both '' and 'player' to party[0].
    if(sTag === '' || sTag === 'player'){
      return PartyManager.party[0];
    }

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

    if(results.length){
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

  /**
   * Pass AL — GetNearestCreatureToLocation (retail ExecuteCommandGetNearestObject @ 0054b550).
   * Same criteria as GetNearestCreature; distance sorted vs location XYZ.
   * Reputation/perception reference the party leader when present.
   */
  public static GetNearestCreatureToLocation(
    nFirstCriteriaType: CreatureType,
    nFirstCriteriaValue: any,
    lLocation: EngineLocation,
    nNth = 1,
    nSecondCriteriaType = -1,
    nSecondCriteriaValue = -1,
    nThirdCriteriaType = -1,
    nThirdCriteriaValue = -1,
  ): ModuleCreature {
    if(!lLocation?.position){
      return undefined;
    }
    const oTarget = (PartyManager.party[0] || undefined) as ModuleObject;
    if(!oTarget && nFirstCriteriaType !== CreatureType.IS_ALIVE){
      return undefined;
    }
    const list = (this.module?.area?.creatures || []).concat(PartyManager.party);
    const filtered: ModuleCreature[] = [];
    let remaining = list.slice();
    const criteriaTarget = oTarget || remaining[0];
    if(!criteriaTarget) return undefined;

    while(remaining.length){
      const next = ModuleObjectManager.GetNearestCreature(
        nFirstCriteriaType, nFirstCriteriaValue, criteriaTarget, 1,
        nSecondCriteriaType, nSecondCriteriaValue, nThirdCriteriaType, nThirdCriteriaValue, remaining
      );
      if(!next) break;
      filtered.push(next);
      remaining = remaining.filter((c) => c !== next);
    }
    if(!filtered.length) return undefined;
    filtered.sort((a, b) =>
      lLocation.position.distanceTo(a.position) - lLocation.position.distanceTo(b.position)
    );
    return filtered[nNth - 1];
  }

  /**
   * Pass AL — GetNearestObjectToLocation (retail ExecuteCommandGetNearestObject @ 0054b550).
   */
  public static GetNearestObjectToLocation(oType = 0, lLocation: EngineLocation, iNum = 0){
    if(!lLocation?.position){
      return undefined;
    }
    let results: ModuleObject[] = [];
    const area = this.module?.area;
    if(!area) return undefined;

    if((oType & NWModuleObjectType.CREATURE) == NWModuleObjectType.CREATURE){
      results = results.concat(area.creatures);
      results = results.concat(PartyManager.party);
    }
    if((oType & NWModuleObjectType.ITEM) == NWModuleObjectType.ITEM){
      results = results.concat(area.items);
    }
    if((oType & NWModuleObjectType.TRIGGER) == NWModuleObjectType.TRIGGER){
      results = results.concat(area.triggers);
    }
    if((oType & NWModuleObjectType.DOOR) == NWModuleObjectType.DOOR){
      results = results.concat(area.doors);
    }
    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){
      results = results.concat(area.waypoints);
    }
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){
      results = results.concat(area.placeables);
    }
    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){
      results = results.concat(area.stores);
    }
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){
      results = results.concat(area.encounters);
    }
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){
      results = results.concat(area.sounds);
    }

    results.sort((a, b) => {
      try{
        return a.position.distanceTo(lLocation.position) - b.position.distanceTo(lLocation.position);
      }catch(_e){
        return 0;
      }
    });

    return results.length ? results[iNum] : undefined;
  }

  /**
   * Pass AL — GetNearestTrapToObject (retail ExecuteCommandGetNearestMine @ 0054a090).
   * Trap objects = triggers/doors/placeables with trapFlag (or TRAP-type triggers).
   */
  public static GetNearestTrapToObject(oTarget: ModuleObject, nTrapDetected = 0): ModuleObject {
    if(!oTarget?.position || !this.module?.area){
      return undefined;
    }
    const area = this.module.area;
    const traps: ModuleObject[] = [];

    for(let i = 0; i < area.triggers.length; i++){
      const t = area.triggers[i];
      if(!t) continue;
      if(t.type == ModuleTriggerType.TRAP || t.trapFlag){
        traps.push(t);
      }
    }
    for(let i = 0; i < area.doors.length; i++){
      const d = area.doors[i];
      if(d?.trapFlag) traps.push(d);
    }
    for(let i = 0; i < area.placeables.length; i++){
      const p = area.placeables[i];
      if(p?.trapFlag) traps.push(p);
    }

    let best: ModuleObject = undefined;
    let bestDist = Number.POSITIVE_INFINITY;
    for(let i = 0; i < traps.length; i++){
      const trap = traps[i];
      if(nTrapDetected){
        if(!trap.isTrapDetectedBy(oTarget)) continue;
      }
      const d = oTarget.position.distanceToSquared(trap.position);
      if(d < bestDist){
        bestDist = d;
        best = trap;
      }
    }
    return best;
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
      // Party members are removed from area.creatures on join — include them like GetNearestCreature
      object_pool = object_pool.concat(this.module.area.creatures);
      for(let i = 0, len = PartyManager.party.length; i < len; i++){
        const pm = PartyManager.party[i];
        if(pm && object_pool.indexOf(pm) === -1){
          object_pool.push(pm);
        }
      }
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
      object_pool = object_pool.concat(this.module.area.areaOfEffects || []);
    }

    if((oType & NWModuleObjectType.WAYPOINT) == NWModuleObjectType.WAYPOINT){ //WAYPOINTS
      object_pool = object_pool.concat(this.module.area.waypoints);
    }
    
    if((oType & NWModuleObjectType.PLACEABLE) == NWModuleObjectType.PLACEABLE){ //PLACEABLE
      object_pool = object_pool.concat(this.module.area.placeables);
    }

    if((oType & NWModuleObjectType.STORE) == NWModuleObjectType.STORE){ //STORE
      object_pool = object_pool.concat(this.module.area.stores || []);
    }
    
    if((oType & NWModuleObjectType.ENCOUNTER) == NWModuleObjectType.ENCOUNTER){ //ENCOUNTER
      object_pool = object_pool.concat(this.module.area.encounters || []);
    }
    
    if((oType & NWModuleObjectType.SOUND) == NWModuleObjectType.SOUND){ //SOUND
      object_pool = object_pool.concat(this.module.area.sounds);
    }

    const center = target?.position || new THREE.Vector3();
    const originPos =
      (origin && (origin.x !== 0 || origin.y !== 0 || origin.z !== 0))
        ? origin
        : center;

    for(let i = 0, len = object_pool.length; i < len; i++){
      if(BitWise.InstanceOf(object_pool[i]?.objectType, ModuleObjectType.ModuleObject)){
        if(!isPointInShape(shape, object_pool[i].position, center, size, originPos)){
          continue;
        }
        if(lineOfSight){
          const from = originPos;
          if(!clearLineOfSight(this.module?.area, from, object_pool[i].position, {
            ignoreObject: object_pool[i],
            eyeHeight: 1.5,
          })){
            continue;
          }
        }
        results.push(object_pool[i]);
      }
    }

    if(idx == -1){
      return results;
    }else{
      return results[idx];
    }

  }

  public static GetAttackerByIndex(oTarget: ModuleObject, index: number = 0): ModuleObject {
    return [].concat(
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
    )[index];
  }

  static playerSelectableObjects: ModuleObject[] = [];
  static playerHoverableObjects: ModuleObject[] = [];
  /** Hostile flags parallel to playerSelectableObjects (GetNearestObjects param_2). */
  static #nearestHostileFlags = new WeakMap<ModuleObject, boolean>();
  static #currentVisibleObject: ModuleObject;
  static #currentVisibleObjectIndex: number = 0;
  /** Sticky LOS grace timer (retail field205_0x368). */
  static #stickyLosGrace = 0;
  /** Combat dead-target grace (retail target_changing). */
  static #targetChanging = 0;
  /** Enemy first-sight latch (retail enemy_sighted + field216_0x394). */
  static #enemySighted = false;
  static #enemySightedLatch = 0;
  /** Mine first-sight latch (retail field194_0x328 + field219_0x3a0). */
  static #mineSighted = false;
  static #mineSightedLatch = 0;
  static #cachedFront: ModuleObject[] = [];

  static #tmpForward = new THREE.Vector3();
  static #tmpBehind = new THREE.Vector3();
  static #tmpDelta = new THREE.Vector3();

  /**
   * Retail CSWSCreature::ValidNearestObjectType @ 004f2c30.
   */
  static validNearestObjectType(player: ModuleObject, obj: ModuleObject): NearestValid {
    if(!obj || obj === player || !obj.area){
      return { ok: false, hostile: false };
    }

    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)){
      const cre = obj as ModuleCreature;
      if(typeof cre.isDead === 'function' && cre.isDead()){
        return { ok: false, hostile: false };
      }
      const viewer = player as ModuleCreature;
      const seen = typeof viewer.hasSeenObject === 'function'
        ? viewer.hasSeenObject(cre)
        : true;
      if(!seen && !obj.hasLineOfSight(player, NEAREST_OBJECT_RANGE)){
        return { ok: false, hostile: false };
      }
      const hostile = typeof cre.isHostile === 'function'
        ? cre.isHostile(player)
        : false;
      return { ok: true, hostile };
    }

    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger)){
      const trig = obj as ModuleTrigger;
      if(trig.type !== ModuleTriggerType.TRAP){
        return { ok: false, hostile: false };
      }
      // Detected, party-planted, or non-hostile to player
      if(
        trig.trapDetected ||
        trig.setByPlayerParty ||
        (typeof trig.isHostile === 'function' && !trig.isHostile(player))
      ){
        return { ok: true, hostile: true };
      }
      return { ok: false, hostile: false };
    }

    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
      const plc = obj as ModulePlaceable;
      if(!plc.isUseable()){
        return { ok: false, hostile: false };
      }
      // Retail ValidNearest placeable @ 004f2c30: hostile only when
      // field38_0x340 != 0 && reputation < 11. That field is not GFF-loaded
      // and stays 0 for normal containers, so nearest-hostile is never set.
      return { ok: true, hostile: false };
    }

    if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
      const door = obj as ModuleDoor;
      if(door.isOpen()){
        return { ok: false, hostile: false };
      }
      if(!door.isUseable()){
        return { ok: false, hostile: false };
      }
      return { ok: true, hostile: false };
    }

    return { ok: false, hostile: false };
  }

  /** Relative yaw degrees [0, 360) from player facing to target delta. */
  static #relativeYawDeg(playerFacing: number, dx: number, dy: number): number {
    let yaw = Math.atan2(dy, dx) - playerFacing;
    while(yaw < 0) yaw += Math.PI * 2;
    while(yaw >= Math.PI * 2) yaw -= Math.PI * 2;
    return yaw * (180 / Math.PI);
  }

  /**
   * Retail CSWSCreature::GetNearestObjects @ 004fc4c0 (both ranges 30).
   * around: yaw-sorted; front: distance-sorted within ~30° cone from 4u behind.
   */
  static getNearestObjects(player: ModuleObject): NearestLists {
    const area = GameState.module?.area;
    if(!player || !area){
      return { around: [], front: [] };
    }

    const candidates: ModuleObject[] = [
      ...GameState.PartyManager.party,
      ...area.placeables,
      ...area.doors,
      ...area.creatures,
      ...area.triggers.filter((t) => t.type === ModuleTriggerType.TRAP),
    ];

    // Match ModuleCreature locomotion forward (rotation.z + π/2)
    const facing = player.getFacing();
    const forwardAngle = facing + Math.PI / 2;
    this.#tmpForward.set(Math.cos(forwardAngle), Math.sin(forwardAngle), 0).normalize();
    this.#tmpBehind
      .copy(player.position)
      .addScaledVector(this.#tmpForward, -FRONT_CONE_ORIGIN_BACK);

    type AroundEntry = { obj: ModuleObject; yaw: number; hostile: boolean };
    type FrontEntry = { obj: ModuleObject; distSq: number; hostile: boolean };
    const aroundEntries: AroundEntry[] = [];
    const frontEntries: FrontEntry[] = [];
    this.#nearestHostileFlags = new WeakMap();

    for(let i = 0; i < candidates.length; i++){
      const obj = candidates[i];
      const valid = this.validNearestObjectType(player, obj);
      if(!valid.ok) continue;

      this.#tmpDelta.copy(obj.position).sub(player.position);
      const distSq = this.#tmpDelta.lengthSq();
      if(distSq > NEAREST_OBJECT_RANGE_SQ) continue;

      const yaw = this.#relativeYawDeg(forwardAngle, this.#tmpDelta.x, this.#tmpDelta.y);
      aroundEntries.push({ obj, yaw, hostile: valid.hostile });
      this.#nearestHostileFlags.set(obj, valid.hostile);

      // Front hemisphere relative to player
      const frontDot = this.#tmpDelta.x * this.#tmpForward.x + this.#tmpDelta.y * this.#tmpForward.y;
      if(frontDot < 0) continue;

      // Cone from point 4u behind player
      this.#tmpDelta.copy(obj.position).sub(this.#tmpBehind).normalize();
      const coneDot =
        this.#tmpDelta.x * this.#tmpForward.x +
        this.#tmpDelta.y * this.#tmpForward.y +
        this.#tmpDelta.z * this.#tmpForward.z;
      if(coneDot > FRONT_CONE_DOT){
        frontEntries.push({ obj, distSq, hostile: valid.hostile });
      }
    }

    aroundEntries.sort((a, b) => a.yaw - b.yaw);
    frontEntries.sort((a, b) => a.distSq - b.distSq);

    return {
      around: aroundEntries.map((e) => e.obj),
      front: frontEntries.map((e) => e.obj),
    };
  }

  static isNearestHostile(obj: ModuleObject | undefined): boolean {
    if(!obj) return false;
    return this.#nearestHostileFlags.get(obj) === true;
  }

  /** Approximate retail CSWCCreature::CanSee for selection. */
  static canSeeObject(player: ModuleObject, obj: ModuleObject): boolean {
    if(!player || !obj) return false;
    return obj.hasLineOfSight(player, NEAREST_OBJECT_RANGE);
  }

  /**
   * Retail CClientExoAppInternal::ShowObject @ 005f9c60 (presentation subset).
   * @param doLookAt - param_2: creature LookAt
   * @param doCameraFocus - param_3: SetLookAtTarget. Tab/SelectNearest and
   *   enemy/mine first-sight pass true. Continuous combat-mode auto-focus is
   *   intentionally omitted: FollowerCamera.focusObject yaw moves the floating
   *   target menu and breaks BTN_TARGET clicks (security / attack).
   */
  static showObject(
    obj: ModuleObject | undefined,
    doLookAt: boolean,
    doCameraFocus: boolean,
  ){
    if(!obj){
      GameState.CursorManager.setReticleSelectedObject(undefined, { lookAt: false });
      FollowerCamera.clearFocusObject();
      this.#currentVisibleObject = undefined;
      this.#currentVisibleObjectIndex = -1;
      return;
    }

    GameState.CursorManager.setReticleSelectedObject(obj, { lookAt: doLookAt });

    this.#currentVisibleObject = obj;
    this.#currentVisibleObjectIndex = this.playerSelectableObjects.indexOf(obj);

    // Retail only touches camera when param_2 (LookAt) is set.
    if(doLookAt && doCameraFocus){
      FollowerCamera.setFocusObject(obj);
    }else if(doLookAt && !doCameraFocus){
      // New passive / mouse acquisition should not keep a prior Tab focus yaw
      FollowerCamera.clearFocusObject();
    }
  }

  /**
   * Rebuild selectable / hoverable caches from GetNearestObjects.
   * Does not mutate current selection (DoPassiveSelection owns that).
   */
  static GetSelectableObjectsInRange(player: ModuleObject): ModuleObject[] {
    if(!player){
      this.playerSelectableObjects = [];
      this.playerHoverableObjects = [];
      this.#cachedFront = [];
      return this.playerSelectableObjects;
    }

    const { around, front } = this.getNearestObjects(player);
    this.playerSelectableObjects = around;
    this.#cachedFront = front;
    this.playerHoverableObjects = [];

    for(let i = 0; i < around.length; i++){
      const obj = around[i];
      if(GameState.viewportFrustum?.containsPoint(obj.position)){
        this.playerHoverableObjects.push(obj);
      }
    }

    // Sync cycle index to current selection without forcing a new pick
    const selected = GameState.CursorManager.selectedObject;
    this.#currentVisibleObjectIndex = selected
      ? this.playerSelectableObjects.indexOf(selected)
      : -1;
    this.#currentVisibleObject = this.#currentVisibleObjectIndex >= 0
      ? selected
      : undefined;

    return this.playerSelectableObjects;
  }

  /** True when object is a trap trigger suitable for MineSighted force-pick. */
  static #isMineTarget(obj: ModuleObject): boolean {
    return (
      BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleTrigger) &&
      (obj as ModuleTrigger).type === ModuleTriggerType.TRAP
    );
  }

  /**
   * Retail CClientExoAppInternal::DoPassiveSelection @ 005fa630.
   */
  static doPassiveSelection(player: ModuleObject, delta: number = 0){
    if(!player){
      this.showObject(undefined, false, false);
      return;
    }

    // Retail rebuilds GetNearestObjects every DoPassiveSelection call
    this.GetSelectableObjectsInRange(player);

    const around = this.playerSelectableObjects;
    const front = this.#cachedFront;
    let last = GameState.CursorManager.selectedObject;
    const combat = isClientCombatMode();
    const paused = GameState.State === EngineState.PAUSED;

    // Retail DoPassiveSelection first loop: creatures → hostile pool,
    // trap triggers → mine pool. Placeables/doors never open either scan.
    let hasHostileInPool = false;
    let hasMineInPool = false;
    for(let i = 0; i < around.length; i++){
      const obj = around[i];
      if(!this.isNearestHostile(obj)) continue;
      if(this.#isMineTarget(obj)){
        hasMineInPool = true;
      }else if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)){
        hasHostileInPool = true;
      }
    }

    const inAround = (obj: ModuleObject | undefined) =>
      !!obj && around.indexOf(obj) !== -1;

    let keepSticky = false;
    let forceLookAt = false;
    let forceCameraFocus = false;

    // Combat dead-target grace when last left the pool (retail target_changing)
    if(last && !inAround(last) && combat && hasHostileInPool){
      const cre = BitWise.InstanceOfObject(last, ModuleObjectType.ModuleCreature)
        ? (last as ModuleCreature)
        : undefined;
      const dead = !!(cre && typeof cre.isDead === 'function' && cre.isDead());
      if(dead){
        if(this.#targetChanging <= 0){
          this.#targetChanging = TARGET_CHANGING_SEC;
          keepSticky = true;
        }else{
          this.#targetChanging -= delta;
          if(this.#targetChanging > 0){
            keepSticky = true;
          }else{
            this.#targetChanging = 0;
          }
        }
      }else{
        this.#targetChanging = 0;
      }
    }else if(inAround(last)){
      this.#targetChanging = 0;
    }

    // Sticky: keep last_target while still in pool
    if(last && inAround(last)){
      if(this.canSeeObject(player, last)){
        this.#stickyLosGrace = 0;
        keepSticky = true;
      }else{
        this.#stickyLosGrace += delta;
        if(this.#stickyLosGrace < STICKY_LOS_GRACE_SEC){
          keepSticky = true;
        }else{
          this.#stickyLosGrace = 0;
          keepSticky = false;
        }
      }
    }else if(!keepSticky){
      this.#stickyLosGrace = 0;
    }

    // Enemy / mine CanSee scan + first-sight force acquisition
    let sawHostileCanSee = false;
    let sawMineCanSee = false;
    const enemyRising = !this.#enemySighted;
    const mineRising = !this.#mineSighted;

    if(hasHostileInPool || hasMineInPool){
      for(let i = 0; i < around.length; i++){
        const obj = around[i];
        if(!this.isNearestHostile(obj)) continue;
        if(!this.canSeeObject(player, obj)) continue;

        const isMine = this.#isMineTarget(obj);
        if(isMine){
          sawMineCanSee = true;
        }else{
          sawHostileCanSee = true;
        }

        // Retail skips force-pick while paused; first match wins, scan continues for latches
        if(paused || forceCameraFocus) continue;

        if(mineRising && isMine){
          if(!combat){
            GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.MineSighted);
          }
          last = obj;
          keepSticky = true;
          forceLookAt = true;
          forceCameraFocus = true;
          continue;
        }

        // Retail EnemySighted force-pick: creatures only (not placeables/doors).
        if(
          enemyRising &&
          !isMine &&
          BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)
        ){
          if(!combat){
            GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.EnemySighted);
          }
          last = obj;
          keepSticky = true;
          forceLookAt = true;
          forceCameraFocus = true;
        }
      }
    }

    // Latch refresh / decay (retail field216_0x394 / field219_0x3a0)
    if(sawHostileCanSee){
      this.#enemySighted = true;
      this.#enemySightedLatch = SIGHTED_LATCH_SEC;
    }else if(this.#enemySighted){
      this.#enemySightedLatch -= delta;
      if(this.#enemySightedLatch <= 0){
        this.#enemySighted = false;
        this.#enemySightedLatch = 0;
      }
    }

    if(sawMineCanSee){
      this.#mineSighted = true;
      this.#mineSightedLatch = SIGHTED_LATCH_SEC;
    }else if(this.#mineSighted){
      this.#mineSightedLatch -= delta;
      if(this.#mineSightedLatch <= 0){
        this.#mineSighted = false;
        this.#mineSightedLatch = 0;
      }
    }

    if(keepSticky && last){
      // Retail sticky+CanSee: LookAt only when force-sight (local_2c) set
      this.showObject(last, forceLookAt, forceCameraFocus);
      return;
    }

    const firstCanSee = (list: ModuleObject[], hostileOnly: boolean): ModuleObject | undefined => {
      for(let i = 0; i < list.length; i++){
        const obj = list[i];
        if(hostileOnly && !this.isNearestHostile(obj)) continue;
        if(!this.canSeeObject(player, obj)) continue;
        return obj;
      }
      return undefined;
    };

    let pick: ModuleObject | undefined;
    if(combat){
      // Prefer hostiles in front cone, then hostiles in around, then any front
      pick =
        firstCanSee(front, true) ||
        firstCanSee(around, true) ||
        firstCanSee(front, false);
    }else{
      pick = firstCanSee(front, false);
    }

    if(pick){
      if(pick === last){
        this.showObject(pick, false, false);
        return;
      }
      this.showObject(pick, true, false);
    }else{
      // Retail clears whenever presentation flag stays 0
      this.showObject(undefined, false, false);
    }
  }

  /**
   * Retail CClientExoAppInternal::SelectNearestObject @ 005fb050.
   * @param previous - true = SelectPrev (param_1 != 0)
   */
  static selectNearestObject(previous: boolean = false): ModuleObject | undefined {
    const player = PartyManager.party[0] ?? GameState.getCurrentPlayer();
    if(!player) return undefined;

    // Refresh pool if empty
    if(!this.playerSelectableObjects.length){
      this.GetSelectableObjectsInRange(player);
    }

    const list = this.playerSelectableObjects;
    if(!list.length) return undefined;

    const combat = isClientCombatMode();
    // Out of combat: prefer hostile creatures when any exist (param_2 = 2)
    let hostileOnly = false;
    if(!combat){
      for(let i = 0; i < list.length; i++){
        const obj = list[i];
        if(
          this.isNearestHostile(obj) &&
          BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature) &&
          this.canSeeObject(player, obj)
        ){
          hostileOnly = true;
          break;
        }
      }
    }

    const matches = (obj: ModuleObject) => {
      if(!this.canSeeObject(player, obj)) return false;
      if(!hostileOnly) return true;
      return (
        BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature) &&
        this.isNearestHostile(obj)
      );
    };

    const selected = GameState.CursorManager.selectedObject;
    let idx = selected ? list.indexOf(selected) : -1;
    if(idx < 0){
      idx = previous ? list.length - 1 : 0;
    }else if(previous){
      idx = idx === 0 ? list.length - 1 : idx - 1;
    }else{
      idx = idx >= list.length - 1 ? 0 : idx + 1;
    }

    // Walk until a matching CanSee object (retail cycle loop)
    for(let n = 0; n < list.length; n++){
      const obj = list[idx];
      if(matches(obj)){
        const previousTarget = selected;
        this.showObject(obj, true, true);
        if(obj !== previousTarget){
          GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.NewTargetSelected);
        }
        return obj;
      }
      if(previous){
        idx = idx === 0 ? list.length - 1 : idx - 1;
      }else{
        idx = idx >= list.length - 1 ? 0 : idx + 1;
      }
    }

    return undefined;
  }

  /** @deprecated Use selectNearestObject(false) */
  static GetNextPlayerVisibleObject(){
    return this.selectNearestObject(false);
  }

  /** @deprecated Use selectNearestObject(true) */
  static GetPreviousPlayerVisibleObject(){
    return this.selectNearestObject(true);
  }

  /**
   * Run DoPassiveSelection every tick (rebuilds nearest lists internally).
   */
  static TickSelectableObjects(delta: number = 0){
    const player = PartyManager.party[0];
    if(!player){
      return;
    }

    this.doPassiveSelection(player, delta);
  }

}