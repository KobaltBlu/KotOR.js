import EngineLocation from "@/engine/EngineLocation";
import { CreatureType } from "@/enums/nwscript/CreatureType";
import { NWModuleObjectType } from "@/enums/nwscript/NWModuleObjectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { AILevel } from "@/enums/module/AILevel";
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
import {
  addObjectToLookupTable,
  findObjectIdByTagOrdinal,
  findTagPositionInTable,
  removeObjectFromLookupTable,
  removeObjectFromLookupTableById,
  type TagLookupNode,
} from "@/managers/tag-lookup-table";
import { findNearestInArea } from "@/managers/nearest-object";

/** First non-MG object id — retail SWMG StackPushObject uses mgo_index 0..0xfe. */
const FIRST_MODULE_OBJECT_ID = MiniGameObjectArray.CAPACITY + 1; // 0x100

export type { TagLookupNode };

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
  /**
   * Retail CSWSModule::object_lookup_table — sorted by tag; equal tags keep insertion order.
   * FindObjectByTagOrdinal @ 004c5fe0 / AddObjectToLookupTable @ 004c7de0.
   */
  static tagLookup: TagLookupNode[] = [];
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
      const obj = this.ObjectList.get(id) as ModuleObject & {
        destroyed?: boolean;
        serverDestroyed?: boolean;
        isRetainedCorpse?: boolean;
      };
      // Retail GetGameObject fails after event 0xb; KeepCorpse is client-only.
      if(obj?.destroyed || obj?.serverDestroyed || obj?.isRetainedCorpse){
        return undefined;
      }
      return obj;
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
    // Retail CSWS* ctor AddObject(aiMaster, VERY_LOW) — only if not already registered
    if(object.aiLevel === AILevel.INVALID){
      GameState.ServerAIMaster?.addObject?.(object);
    }
  }

  /**
   * Retail AddToArea / Load* registration: ObjectList + tag lookup after Tag is known.
   * Call at end of initProperties (after Tag field read), not mid-init.
   */
  static RegisterObject(object: ModuleObject){
    if(!object) return;
    this.AddObjectById(object);
    this.RemoveObjectFromLookupTableById(object.id);
    const tag = String(object.getTag?.() ?? '').toLowerCase();
    this.AddObjectToLookupTable(tag, object.id);
  }

  /**
   * Retail FindTagPositionInTable @ 004c5e60 — first index where tag >= needle (lower_bound).
   */
  static FindTagPositionInTable(tag: string): number {
    return findTagPositionInTable(this.tagLookup, tag);
  }

  /**
   * Retail AddObjectToLookupTable @ 004c7de0 — insert after last equal-tag entry.
   */
  static AddObjectToLookupTable(tag: string, id: number){
    addObjectToLookupTable(this.tagLookup, tag, id);
  }

  /**
   * Retail RemoveObjectFromLookupTable @ 004c5ef0 — remove by tag + id.
   */
  static RemoveObjectFromLookupTable(tag: string, id: number): boolean {
    return removeObjectFromLookupTable(this.tagLookup, tag, id);
  }

  /** Remove any lookup entries for this object id (tag may have changed). */
  static RemoveObjectFromLookupTableById(id: number){
    removeObjectFromLookupTableById(this.tagLookup, id);
  }

  /**
   * Map ModuleObjectType flags → NWScript OBJECT_TYPE bitmask for GetObjectByTag filters.
   */
  static getNWObjectTypeMask(object: ModuleObject): number {
    if(!object) return 0;
    let mask = 0;
    const t = object.objectType | 0;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleCreature) || BitWise.InstanceOf(t, ModuleObjectType.ModulePlayer)){
      mask |= NWModuleObjectType.CREATURE;
    }
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleItem)) mask |= NWModuleObjectType.ITEM;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleTrigger)) mask |= NWModuleObjectType.TRIGGER;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleDoor)) mask |= NWModuleObjectType.DOOR;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleAreaOfEffect)) mask |= NWModuleObjectType.AOE;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleWaypoint)) mask |= NWModuleObjectType.WAYPOINT;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModulePlaceable)) mask |= NWModuleObjectType.PLACEABLE;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleStore)) mask |= NWModuleObjectType.STORE;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleEncounter)) mask |= NWModuleObjectType.ENCOUNTER;
    if(BitWise.InstanceOf(t, ModuleObjectType.ModuleSound)) mask |= NWModuleObjectType.SOUND;
    return mask;
  }

  static RemoveObject(object: ModuleObject){
    if(!object) return;
    this.RemoveObjectFromLookupTableById(object.id);
    GameState.ServerAIMaster?.removeObject?.(object);
    this.RemoveObjectById(object.id);
    GameState.CursorManager.notifyObjectDestroyed(object);
  }

  static RemoveObjectById(id: number): boolean {
    if(isNaN(id)) return false;
    //Remove the object from the global list of objects
    if(id >= 1 && this.ObjectList.has(id)){
      const obj = this.ObjectList.get(id);
      if(obj){
        this.RemoveObjectFromLookupTableById(id);
        GameState.ServerAIMaster?.removeObject?.(obj);
      }
      return this.ObjectList.delete(id);
    }
    return false;
  }

  static Reset(){
    this.COUNT = FIRST_MODULE_OBJECT_ID;
    this.PLAYER_ID = ModuleObjectConstant.PLAYER_ID;
    this.ObjectList.clear();
    this.tagLookup.length = 0;
    MiniGameObjectArray.clear();
    GameState.ServerAIMaster?.Reset?.();
    // Clear Enemy/Mine Sighted latches so post-load rising edge is deterministic
    this.#enemySighted = false;
    this.#enemySightedLatch = 0;
    this.#mineSighted = false;
    this.#mineSightedLatch = 0;
    this.#stickyLosGrace = 0;
    this.#targetChanging = 0;
  }

  public static GetObjectByTag(sTag = '', iNum = 0, oType = NWModuleObjectType.ALL){

    sTag = sTag.toLowerCase();
    // Retail FindObjectByTagOrdinal matches "" like any tag against the module
    // tag lookup table. The PC's tag is empty, so an empty lookup resolves to
    // the player — scripts rely on this (e.g. k_pend_traskdl40 moves Trask to
    // GetObjectByTag("")). Alias both '' and 'player' to party[0].
    if(sTag === '' || sTag === 'player'){
      return PartyManager.party[0];
    }

    // Retail FindObjectByTagOrdinal @ 004c5fe0 / FindObjectByTagTypeOrdinal @ 004c60b0
    const filterType = oType | 0;
    const useTypeFilter = filterType !== NWModuleObjectType.ALL;
    const id = findObjectIdByTagOrdinal(
      this.tagLookup,
      sTag,
      iNum,
      useTypeFilter
        ? (oid) => {
            const obj = this.GetObjectById(oid);
            return !!obj && (this.getNWObjectTypeMask(obj) & filterType) !== 0;
          }
        : undefined
    );
    if(id === undefined){
      return undefined;
    }
    return this.GetObjectById(id);

  }

  public static GetNearestObjectByTag(sTag = '', oObject: ModuleObject, iNum = 0){
    sTag = sTag.toLowerCase();
    const area = this.module?.area;
    if(!area || !oObject?.position){
      return undefined;
    }
    return findNearestInArea({
      area,
      origin: oObject.position,
      nth: iNum,
      excludeId: oObject.id,
      matches: (obj) => (obj.getTag?.() || '').toLowerCase() === sTag,
    });
  }

  public static GetNearestObject(oType = 0, oObject: ModuleObject, iNum = 0){
    const area = this.module?.area;
    if(!area || !oObject?.position){
      return undefined;
    }
    const typeMask = oType | 0;
    const matchAll = (typeMask & NWModuleObjectType.ALL) === NWModuleObjectType.ALL;
    return findNearestInArea({
      area,
      origin: oObject.position,
      nth: iNum,
      excludeId: oObject.id,
      matches: (obj) => matchAll || (this.getNWObjectTypeMask(obj) & typeMask) !== 0,
    });
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
      results = results.concat(this.module.area.areaOfEffects);
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
      results = results.concat(this.module.area.areaOfEffects);
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

  /**
   * Single CREATURE_TYPE_* criterion for GetNearestCreature* (retail @ 0054b550).
   */
  private static creatureMatchesNearestCriterion(
    creature: ModuleCreature,
    oTarget: ModuleObject,
    criteriaType: CreatureType,
    criteriaValue: any,
  ): boolean {
    if(criteriaType < 0 || criteriaValue === 0xffffffff){
      return true;
    }
    switch(criteriaType){
      case CreatureType.RACIAL_TYPE:
      case CreatureType.PLAYER_CHAR:
      case CreatureType.CLASS:
      case CreatureType.HAS_SPELL_EFFECT:
      case CreatureType.DOES_NOT_HAVE_SPELL_EFFECT:
        return false;
      case CreatureType.REPUTATION:
        if(!oTarget) return false;
        switch(criteriaValue){
          case ReputationType.FRIEND:
            return creature.isFriendly(oTarget) && !!oTarget.hasLineOfSight?.(creature);
          case ReputationType.ENEMY:
            return creature.isHostile(oTarget) && !!oTarget.hasLineOfSight?.(creature);
          case ReputationType.NEUTRAL:
            return creature.isNeutral(oTarget) && !!oTarget.hasLineOfSight?.(creature);
          default:
            return false;
        }
      case CreatureType.IS_ALIVE:
        return !creature.isDead();
      case CreatureType.PERCEPTION:
        if(!oTarget?.perceptionList) return false;
        switch(criteriaValue){
          case 0:// PERCEPTION_SEEN_AND_HEARD
            return oTarget.perceptionList.filter( (o) => o.object == creature && !!(o.data & PerceptionMask.SEEN_AND_HEARD) ).length > 0;
          case 1:// PERCEPTION_NOT_SEEN_AND_NOT_HEARD
            return oTarget.perceptionList.filter( (o) => o.object == creature && !(o.data & PerceptionMask.SEEN_AND_HEARD) ).length > 0;
          case 2:// PERCEPTION_HEARD_AND_NOT_SEEN
            return oTarget.perceptionList.filter( (o) => o.object == creature && !(o.data & PerceptionMask.SEEN) && !!(o.data & PerceptionMask.HEARD) ).length > 0;
          case 3:// PERCEPTION_SEEN_AND_NOT_HEARD
            return oTarget.perceptionList.filter( (o) => o.object == creature && !!(o.data & PerceptionMask.SEEN) && !(o.data & PerceptionMask.HEARD) ).length > 0;
          case 4:// PERCEPTION_NOT_HEARD
            return oTarget.perceptionList.filter( (o) => o.object == creature && !(o.data & PerceptionMask.HEARD) ).length > 0;
          case 5:// PERCEPTION_HEARD
            return oTarget.perceptionList.filter( (o) => o.object == creature && !!(o.data & PerceptionMask.HEARD) ).length > 0;
          case 6:// PERCEPTION_NOT_SEEN
            return oTarget.perceptionList.filter( (o) => o.object == creature && !(o.data & PerceptionMask.SEEN) ).length > 0;
          case 7:// PERCEPTION_SEEN
            return oTarget.perceptionList.filter( (o) => o.object == creature && !!(o.data & PerceptionMask.SEEN) ).length > 0;
          default:
            return false;
        }
      default:
        return false;
    }
  }

  private static isNearestCreatureCandidate(obj: ModuleObject): obj is ModuleCreature {
    const t = obj?.objectType | 0;
    return BitWise.InstanceOf(t, ModuleObjectType.ModuleCreature)
      || BitWise.InstanceOf(t, ModuleObjectType.ModulePlayer);
  }

  public static GetNearestCreature(nFirstCriteriaType: CreatureType, nFirstCriteriaValue: any, oTarget: ModuleObject, nNth=1, nSecondCriteriaType=-1, nSecondCriteriaValue=-1, nThirdCriteriaType=-1,  nThirdCriteriaValue=-1, _list?: ModuleCreature[] ): ModuleCreature {
    const area = this.module?.area;
    if(!area || !oTarget?.position){
      return undefined;
    }

    const matches = (obj: ModuleObject): boolean => {
      if(!this.isNearestCreatureCandidate(obj)) return false;
      const creature = obj as ModuleCreature;
      if(creature.isDead()) return false;
      if(!this.creatureMatchesNearestCriterion(creature, oTarget, nFirstCriteriaType, nFirstCriteriaValue)) return false;
      if(nSecondCriteriaType >= 0 && !this.creatureMatchesNearestCriterion(creature, oTarget, nSecondCriteriaType, nSecondCriteriaValue)) return false;
      if(nThirdCriteriaType >= 0 && !this.creatureMatchesNearestCriterion(creature, oTarget, nThirdCriteriaType, nThirdCriteriaValue)) return false;
      return true;
    };

    return findNearestInArea({
      area,
      origin: oTarget.position,
      nth: Math.max(0, (nNth | 0) - 1),
      excludeId: oTarget.id,
      matches,
    }) as ModuleCreature;
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
    const area = this.module?.area;
    if(!area || !lLocation?.position){
      return undefined;
    }
    const oTarget = (PartyManager.party[0] || undefined) as ModuleObject;
    if(!oTarget && nFirstCriteriaType !== CreatureType.IS_ALIVE){
      return undefined;
    }
    const criteriaTarget = oTarget;

    const matches = (obj: ModuleObject): boolean => {
      if(!this.isNearestCreatureCandidate(obj)) return false;
      const creature = obj as ModuleCreature;
      if(creature.isDead()) return false;
      if(nFirstCriteriaType === CreatureType.IS_ALIVE){
        // IS_ALIVE only needs a live creature; other criteria still apply when set.
      }else if(!criteriaTarget){
        return false;
      }
      if(!this.creatureMatchesNearestCriterion(creature, criteriaTarget, nFirstCriteriaType, nFirstCriteriaValue)) return false;
      if(nSecondCriteriaType >= 0 && !this.creatureMatchesNearestCriterion(creature, criteriaTarget, nSecondCriteriaType, nSecondCriteriaValue)) return false;
      if(nThirdCriteriaType >= 0 && !this.creatureMatchesNearestCriterion(creature, criteriaTarget, nThirdCriteriaType, nThirdCriteriaValue)) return false;
      return true;
    };

    return findNearestInArea({
      area,
      origin: lLocation.position,
      nth: Math.max(0, (nNth | 0) - 1),
      matches,
    }) as ModuleCreature;
  }

  /**
   * Pass AL — GetNearestObjectToLocation (retail ExecuteCommandGetNearestObject @ 0054b550).
   */
  public static GetNearestObjectToLocation(oType = 0, lLocation: EngineLocation, iNum = 0){
    const area = this.module?.area;
    if(!area || !lLocation?.position){
      return undefined;
    }
    const typeMask = oType | 0;
    const matchAll = (typeMask & NWModuleObjectType.ALL) === NWModuleObjectType.ALL;
    return findNearestInArea({
      area,
      origin: lLocation.position,
      nth: iNum,
      matches: (obj) => matchAll || (this.getNWObjectTypeMask(obj) & typeMask) !== 0,
    });
  }

  /**
   * Pass AL — GetNearestTrapToObject (retail ExecuteCommandGetNearestMine @ 0054a090).
   * Trap objects = triggers/doors/placeables with trapFlag (or TRAP-type triggers).
   */
  public static GetNearestTrapToObject(oTarget: ModuleObject, nTrapDetected = 0): ModuleObject {
    const area = this.module?.area;
    if(!oTarget?.position || !area){
      return undefined;
    }
    return findNearestInArea({
      area,
      origin: oTarget.position,
      nth: 0,
      excludeId: oTarget.id,
      matches: (obj) => {
        const t = obj?.objectType | 0;
        let isTrap = false;
        if(BitWise.InstanceOf(t, ModuleObjectType.ModuleTrigger)){
          const trig = obj as ModuleTrigger;
          isTrap = trig.type == ModuleTriggerType.TRAP || !!trig.trapFlag;
        }else if(BitWise.InstanceOf(t, ModuleObjectType.ModuleDoor)){
          isTrap = !!(obj as ModuleDoor).trapFlag;
        }else if(BitWise.InstanceOf(t, ModuleObjectType.ModulePlaceable)){
          isTrap = !!(obj as ModulePlaceable).trapFlag;
        }
        if(!isTrap) return false;
        if(nTrapDetected && !obj.isTrapDetectedBy?.(oTarget)) return false;
        return true;
      },
    });
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
        // Do not steal UI focus from a live sticky selection while already in
        // combat — queued attacks keep the current combat target.
        if(
          enemyRising &&
          !isMine &&
          BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleCreature)
        ){
          if(!combat){
            GameState.AutoPauseManager.SignalAutoPauseEvent(AutoPauseState.EnemySighted);
          }
          if(!combat || !keepSticky){
            last = obj;
            keepSticky = true;
            forceLookAt = true;
            forceCameraFocus = true;
          }
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
   * Retail MainLoop skips while IsGlobalFading / IsGlobalFadeObscuring
   * (and while area_not_ready_to_display).
   */
  static TickSelectableObjects(delta: number = 0){
    const player = PartyManager.party[0];
    if(!player){
      return;
    }

    // Retail: DoPassiveSelection only after world fade is clear
    const fade = GameState.FadeOverlayManager;
    if(fade?.isFading?.() || fade?.isObscuring?.()){
      return;
    }
    if(GameState.loadingModule){
      return;
    }

    this.doPassiveSelection(player, delta);
  }

}