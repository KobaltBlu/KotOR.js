import EngineLocation from "@engine/runtime/EngineLocation";
import { CreatureType } from "@core/enums/nwscript/CreatureType";
import { NWModuleObjectType } from "@core/enums/nwscript/NWModuleObjectType";
import { GameObjectType } from "@core/enums/module/GameObjectType";
import { GameObjectConstant } from "@core/enums/module/GameObjectConstant";
import { AILevel } from "@core/enums/module/AILevel";
import { ReputationType } from "@core/enums/nwscript/ReputationType";
import { GFFDataType } from "@core/enums/resource/GFFDataType";
import { BitWise } from "@core/utility/BitWise";
import { PartyManager } from "@engine/managers/PartyManager";
import * as THREE from "three";
import type { Module } from "@engine/module/Module";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { Door } from "@engine/module/Door";
import type { GameObject } from "@engine/module/GameObject";
import type { Placeable } from "@engine/module/Placeable";
import type { Trigger } from "@engine/module/Trigger";
import { PerceptionMask } from "@engine/enums/engine/PerceptionMask";
import { GameState } from "@engine/runtime/GameState";
import { ModuleTriggerType } from "@core/enums/module/ModuleTriggerType";
import { hasVisualLos } from "@engine/pathfinding/visual-los";
import { FollowerCamera } from "@engine/render/FollowerCamera";
import { AutoPauseState } from "@engine/enums/engine/AutoPauseState";
import { EngineState } from "@engine/enums/engine/EngineState";
import { MiniGameObjectArray } from "@engine/module/minigame/MiniGameObjectArray";
import { GFFField } from "@core/resource/GFFField";

import { isCreature } from "@engine/module/guards/isCreature";
import { isDoor } from "@engine/module/guards/isDoor";
import { isPlaceable } from "@engine/module/guards/isPlaceable";
import { isTrigger } from "@engine/module/guards/isTrigger";

/**
 * NWScript shape constants (GetObjectInShape).
 */
export const ShapeType = {
  SPELLCYLINDER: 0,
  CONE: 1,
  CUBE: 2,
  SPELLCONE: 3,
  SPHERE: 4,
} as const;

/** SPELLCYLINDER off-axis radius squared (1.5²). */
export const SPELLCYLINDER_RADIUS_SQ = 2.25;

/** SPELLCONE forward half-angle cos(30°) ≈ 0.866. */
export const SPELLCONE_MIN_DOT = 0.866;
/** First non-MG object id — SWMG StackPushObject uses mgo_index 0..0xfe. */
const FIRST_GAME_OBJECT_ID = MiniGameObjectArray.CAPACITY + 1; // 0x100

/** object_lookup_table node. */
export type TagLookupNode = { tag: string; id: number };

export type NearestCandidate = { obj: GameObject; distSq: number };

export type FindNearestInAreaOptions = {
  area: Area;
  origin: THREE.Vector3;
  /** 0-based nth (NWScript stack uses 1-based; callers subtract 1). */
  nth: number;
  /** Source object id to skip (GetNearestObject / ByTag / Creature). */
  excludeId?: number;
  matches: (obj: GameObject) => boolean;
};

/** GetNearestObjects / DoPassiveSelection range (√900). */
const NEAREST_OBJECT_RANGE = 30;
const NEAREST_OBJECT_RANGE_SQ = NEAREST_OBJECT_RANGE * NEAREST_OBJECT_RANGE;
/** Front cone cos(~30°) from GetNearestObjects. */
const FRONT_CONE_DOT = 0.866;
/** Origin offset behind player for front-cone test. */
const FRONT_CONE_ORIGIN_BACK = 4;
/** LOS grace while sticky target briefly occluded. */
const STICKY_LOS_GRACE_SEC = 1.0;
/** Combat dead-target grace (target_changing = 0x3fc00000). */
const TARGET_CHANGING_SEC = 1.5;
/** Enemy / mine sighted latch. */
const SIGHTED_LATCH_SEC = 10.0;

type NearestValid = { ok: boolean; hostile: boolean };
type NearestLists = { around: GameObject[]; front: GameObject[] };

/**
 * GameObjectManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file GameObjectManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class GameObjectManager {

  static objSearchIndex: number;
  static module: Module;

  static ObjectList: Map<any, GameObject> = new Map();
  /**
   * object_lookup_table — sorted by tag; equal tags keep insertion order.
   * FindObjectByTagOrdinal / AddObjectToLookupTable.
   */
  static tagLookup: TagLookupNode[] = [];
  /** Start above mgo_index range (0..0xfe) so module ids never collide with SWMG object ids. */
  static COUNT: number = FIRST_GAME_OBJECT_ID;
  static PLAYER_ID = GameObjectConstant.PLAYER_ID;

  static GetObjectById(id: GameObject|number = -1){

    if(id == GameObjectConstant.OBJECT_INVALID)
      return undefined;

    // MG StackPushObject uses mgo_index; 0xff = empty / invalid for MG.
    if(id === MiniGameObjectArray.INVALID_INDEX)
      return undefined;

    if(typeof id === 'object' && id != null){
      return id;
    }

    if(this.ObjectList.has(id)){
      const obj = this.ObjectList.get(id) as GameObject & {
        destroyed?: boolean;
        serverDestroyed?: boolean;
        isRetainedCorpse?: boolean;
      };
      // GetGameObject fails after event 0xb; KeepCorpse is client-only.
      if(obj?.destroyed || obj?.serverDestroyed || obj?.isRetainedCorpse){
        return undefined;
      }
      return obj;
    }

    // SWMG_* StackPopObject → GetMiniGameObject(mgo_index).
    if(typeof id === 'number' && id >= 0 && id < MiniGameObjectArray.CAPACITY){
      return MiniGameObjectArray.get(id);
    }

    return undefined;

  }

  /**
   * Client-side id resolve for actions/UI. Unlike GetObjectById (script GetGameObject),
   * this still finds KeepCorpse shells after event 0xb (removed from ObjectList /
   * filtered as retained) by scanning area.creatures.
   */
  static GetClientObjectById(id: GameObject|number = -1): GameObject | undefined {
    if(id == GameObjectConstant.OBJECT_INVALID)
      return undefined;

    if(typeof id === 'object' && id != null){
      return id;
    }

    if(typeof id !== 'number' || isNaN(id)){
      return undefined;
    }

    const fromList = this.ObjectList.get(id) as GameObject & {
      destroyed?: boolean;
      isRetainedCorpse?: boolean;
    } | undefined;
    if(fromList && !fromList.destroyed){
      return fromList;
    }

    const area = GameState.module?.area;
    if(area?.creatures){
      for(let i = 0; i < area.creatures.length; i++){
        const cre = area.creatures[i];
        if(cre && cre.id === id && !cre.destroyed){
          return cre;
        }
      }
    }
    // Party members are removed from area.creatures on join — still resolve
    // by id for action params / UI (same as GetObjectsInShape).
    const party = PartyManager.party;
    if(party){
      for(let i = 0; i < party.length; i++){
        const pm = party[i];
        if(pm && pm.id === id && !(pm as Creature).destroyed){
          return pm;
        }
      }
    }
    if(PartyManager.Player && PartyManager.Player.id === id && !PartyManager.Player.destroyed){
      return PartyManager.Player;
    }
    if(area?.placeables){
      for(let i = 0; i < area.placeables.length; i++){
        const plc = area.placeables[i];
        if(plc && plc.id === id && !plc.destroyed){
          return plc;
        }
      }
    }

    return undefined;
  }

  static GetNextObjectId(){
    return this.COUNT++;
  }

  static ResetPlayerId(){
    this.PLAYER_ID = GameObjectConstant.PLAYER_ID;
  };

  static GetNextPlayerId(){
    console.log('GetNextPlayerId', this.PLAYER_ID);
    return this.PLAYER_ID--;
  }

  /**
   * Char / player pool — next_char_id range (0x7F000001..0x7FFFFFFF).
   * Module pool is everything below OBJECT_INVALID (0x7F000000).
   */
  static isCharPoolId(id: number): boolean {
    return (
      typeof id === 'number' &&
      !isNaN(id) &&
      id > GameObjectConstant.OBJECT_INVALID &&
      id <= GameObjectConstant.PLAYER_ID
    );
  }

  /** Missing / OBJECT_INVALID — needs AddInternalObject-style assignment. */
  static isObjectIdUnset(id: number | undefined | null): boolean {
    return (
      id == null ||
      id === 0 ||
      id === GameObjectConstant.OBJECT_INVALID ||
      (typeof id === 'number' && isNaN(id))
    );
  }

  /**
   * True PC only — char-pool assignment (isPlayerCharacter).
   * Companions (isPM) use the module pool.
   */
  static isPlayerCharacterObject(object: GameObject): boolean {
    if(!object) return false;
    if(object.isPlayer) return true;
    return BitWise.InstanceOf(object.objectType, GameObjectType.PlayerCharacter);
  }

  /** Allocate a free id from the module or char pool (never overwrites). */
  static allocateFreeObjectId(useCharPool: boolean): number {
    let id = useCharPool ? this.GetNextPlayerId() : this.GetNextObjectId();
    while(this.ObjectList.has(id)){
      id = useCharPool ? this.GetNextPlayerId() : this.GetNextObjectId();
    }
    return id;
  }

  /** Realloc in the same pool as requestedId (AddObjectAtPos collision). */
  static allocateFreeObjectIdMatchingPool(requestedId: number): number {
    return this.allocateFreeObjectId(this.isCharPoolId(requestedId));
  }

  /** Stamp live id + template ObjectId so saves stay consistent. */
  static persistObjectId(object: GameObject, id: number): void {
    object.id = id;
    const root = object.template?.RootNode;
    if(!root) return;
    if(root.hasField('ObjectId')){
      root.getFieldByLabel('ObjectId').setValue(id);
    }else{
      root.addField(new GFFField(GFFDataType.DWORD, 'ObjectId')).setValue(id);
    }
  }

  /**
   * AddInternalObject + AddObjectAtPos — never silently overwrite another object.
   * PC → char pool; everyone else (incl. party NPCs) → module pool.
   */
  static AddObjectById(object: GameObject){
    if(!object) return;

    if(this.isObjectIdUnset(object.id)){
      const useCharPool = this.isPlayerCharacterObject(object);
      this.persistObjectId(object, this.allocateFreeObjectId(useCharPool));
    }else{
      const existing = this.ObjectList.get(object.id);
      if(existing && existing !== object){
        // Collision — realloc in the pool of the requested id.
        this.persistObjectId(
          object,
          this.allocateFreeObjectIdMatchingPool(object.id)
        );
      }
    }

    this.ObjectList.set(object.id, object);
    // * ctor AddObject(aiMaster, PRIORITY_LOW) — only if not already registered
    if(object.aiLevel === AILevel.INVALID){
      GameState.module?.aiScheduler.addObject(object);
    }
  }

  /**
   * AddToArea / Load* registration: ObjectList + tag lookup after Tag is known.
   * Call at end of initProperties (after Tag field read), not mid-init.
   */
  static RegisterObject(object: GameObject){
    if(!object) return;
    this.AddObjectById(object);
    this.RemoveObjectFromLookupTableById(object.id);
    const tag = String(object.getTag?.() ?? '').toLowerCase();
    this.AddObjectToLookupTable(tag, object.id);
  }

  static isInSphere(
    point: THREE.Vector3,
    center: THREE.Vector3,
    radius: number
  ): boolean {
    return point.distanceToSquared(center) <= radius * radius;
  }

  static isInCube(
    point: THREE.Vector3,
    center: THREE.Vector3,
    halfExtent: number
  ): boolean {
    return (
      Math.abs(point.x - center.x) <= halfExtent &&
      Math.abs(point.y - center.y) <= halfExtent &&
      Math.abs(point.z - center.z) <= halfExtent
    );
  }

  /**
   * case 0 — corridor from origin to target end, 1.5m off-axis radius.
   */
  static isInSpellCylinder(
    point: THREE.Vector3,
    origin: THREE.Vector3,
    end: THREE.Vector3,
    length: number
  ): boolean {
    const axis = end.clone().sub(origin);
    const axisLen = axis.length();
    if(axisLen < 1e-5){
      return GameObjectManager.isInSphere(point, origin, 1.5);
    }
    axis.multiplyScalar(1 / axisLen);
    const toPoint = point.clone().sub(origin);
    const along = toPoint.dot(axis);
    if(along < 0 || along > Math.max(length, axisLen)) return false;
    const closest = origin.clone().addScaledVector(axis, along);
    return point.distanceToSquared(closest) <= SPELLCYLINDER_RADIUS_SQ;
  }

  /**
   * case 1 — cone that widens toward the end.
   */
  static isInCone(
    point: THREE.Vector3,
    origin: THREE.Vector3,
    end: THREE.Vector3,
    size: number
  ): boolean {
    const axis = end.clone().sub(origin);
    const axisLen = axis.length();
    if(axisLen < 1e-5) return false;
    const toPoint = point.clone().sub(origin);
    const dir = axis.clone().multiplyScalar(1 / axisLen);
    const along = toPoint.dot(dir);
    if(along <= 0 || along > axisLen) return false;
    const closest = origin.clone().addScaledVector(dir, along);
    const radiusAt = (along / axisLen) * size;
    return point.distanceToSquared(closest) <= radiusAt * radiusAt;
  }

  /**
   * case 3 — forward cone with cosθ ≥ 0.866 and distance ≤ size.
   */
  static isInSpellCone(
    point: THREE.Vector3,
    origin: THREE.Vector3,
    end: THREE.Vector3,
    size: number
  ): boolean {
    const axis = end.clone().sub(origin);
    const axisLen = axis.length();
    if(axisLen < 1e-5) return false;
    const toPoint = point.clone().sub(origin);
    const distSq = toPoint.lengthSq();
    if(distSq > size * size) return false;
    const dir = axis.multiplyScalar(1 / axisLen);
    const toDir = toPoint.normalize();
    return dir.dot(toDir) >= SPELLCONE_MIN_DOT;
  }

  /**
   * True when `point` lies in the shape described by nShape.
   */
  static isPointInShape(
    shape: number,
    point: THREE.Vector3,
    center: THREE.Vector3,
    size: number,
    origin?: THREE.Vector3
  ): boolean {
    const from = origin || center;
    switch(shape){
      case ShapeType.SPELLCYLINDER:
        return GameObjectManager.isInSpellCylinder(point, from, center, size);
      case ShapeType.CONE:
        return GameObjectManager.isInCone(point, from, center, size);
      case ShapeType.CUBE:
        return GameObjectManager.isInCube(point, center, size);
      case ShapeType.SPELLCONE:
        return GameObjectManager.isInSpellCone(point, from, center, size);
      case ShapeType.SPHERE:
      default:
        return GameObjectManager.isInSphere(point, center, size);
    }
  }

  /**
   * FindTagPositionInTable — first index where tag >= needle (lower_bound).
   */
  static findTagPositionInTable(table: TagLookupNode[], tag: string): number {
    const needle = (tag ?? '').toLowerCase();
    let lo = 0;
    let hi = table.length;
    while(lo < hi){
      const mid = (lo + hi) >> 1;
      if(table[mid].tag < needle){
        lo = mid + 1;
      }else{
        hi = mid;
      }
    }
    return lo;
  }

  /** Insert after last equal-tag entry. */
  static addObjectToLookupTable(table: TagLookupNode[], tag: string, id: number): void {
    const key = (tag ?? '').toLowerCase();
    let i = GameObjectManager.findTagPositionInTable(table, key);
    while(i < table.length && table[i].tag === key){
      i++;
    }
    table.splice(i, 0, { tag: key, id });
  }

  /** Remove by tag + id. */
  static removeObjectFromLookupTable(table: TagLookupNode[], tag: string, id: number): boolean {
    const key = (tag ?? '').toLowerCase();
    let i = GameObjectManager.findTagPositionInTable(table, key);
    while(i < table.length){
      if(table[i].tag !== key) break;
      if(table[i].id === id){
        table.splice(i, 1);
        return true;
      }
      i++;
    }
    return false;
  }

  /** Remove every entry for this object id. */
  static removeObjectFromLookupTableById(table: TagLookupNode[], id: number): void {
    for(let i = table.length - 1; i >= 0; i--){
      if(table[i].id === id){
        table.splice(i, 1);
      }
    }
  }

  /**
   * FindObjectByTagOrdinal — return id at firstMatch + nth among equal tags.
   */
  static findObjectIdByTagOrdinal(
    table: TagLookupNode[],
    tag: string,
    nth: number,
    matchesType?: (id: number) => boolean
  ): number | undefined {
    const key = (tag ?? '').toLowerCase();
    let i = GameObjectManager.findTagPositionInTable(table, key);
    let remaining = nth | 0;
    while(i < table.length && table[i].tag === key){
      const id = table[i].id;
      if(!matchesType || matchesType(id)){
        if(remaining <= 0){
          return id;
        }
        remaining--;
      }
      i++;
    }
    return undefined;
  }

  /** Insert candidate into ascending distSq list. */
  static insertByDistSq(candidates: NearestCandidate[], obj: GameObject, distSq: number): void {
    let i = 0;
    while(i < candidates.length && candidates[i].distSq <= distSq){
      i++;
    }
    candidates.splice(i, 0, { obj, distSq });
  }

  /**
   * Nearest-object spiral walk:
   * start at GetFirstObjectIndiceByX, expand +1/-1/+2/-2…, insert by distSq,
   * abort a direction when |dx|² already exceeds the current nth-furthest distSq.
   */
  static findNearestInArea(opts: FindNearestInAreaOptions): GameObject | undefined {
    const { area, origin, matches } = opts;
    const nth = Math.max(0, opts.nth | 0);
    const excludeId = opts.excludeId;
    if(!area || !origin){
      return undefined;
    }

    area.ensureGameObjectsSorted();
    const table = area.gameObjects;
    if(!table.length){
      return undefined;
    }

    let start = area.getFirstObjectIndexByX(origin.x);
    if(excludeId !== undefined){
      let found = false;
      for(let i = start; i < table.length; i++){
        if(table[i]?.id === excludeId){
          start = i;
          found = true;
          break;
        }
      }
      if(!found){
        return undefined;
      }
    }

    const candidates: NearestCandidate[] = [];
    const seen = new Set<number>();
    let stopPos = false;
    let stopNeg = false;

    const consider = (idx: number, direction: 1 | -1) => {
      if(idx < 0){
        stopNeg = true;
        return;
      }
      if(idx >= table.length){
        stopPos = true;
        return;
      }
      const obj = table[idx];
      if(!obj) return;
      const id = obj.id | 0;
      if(excludeId !== undefined && id === excludeId) return;
      if(seen.has(id)) return;
      seen.add(id);
      if(!matches(obj)) return;

      const dx = obj.position.x - origin.x;
      const dy = obj.position.y - origin.y;
      const dz = obj.position.z - origin.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dxSq = dx * dx;

      if(candidates.length > nth && dxSq > candidates[nth].distSq){
        if(direction > 0) stopPos = true;
        else stopNeg = true;
        return;
      }
      GameObjectManager.insertByDistSq(candidates, obj, distSq);
    };

    for(let mag = 1; mag <= table.length; mag++){
      if(stopPos && stopNeg) break;
      if(!stopPos) consider(start + mag, 1);
      if(!stopNeg) consider(start - mag, -1);
    }

    return candidates[nth]?.obj;
  }

  /**
   * FindTagPositionInTable on the manager table.
   */
  static FindTagPositionInTable(tag: string): number {
    return GameObjectManager.findTagPositionInTable(this.tagLookup, tag);
  }

  /**
   * AddObjectToLookupTable — insert after last equal-tag entry.
   */
  static AddObjectToLookupTable(tag: string, id: number){
    GameObjectManager.addObjectToLookupTable(this.tagLookup, tag, id);
  }

  /**
   * RemoveObjectFromLookupTable — remove by tag + id.
   */
  static RemoveObjectFromLookupTable(tag: string, id: number): boolean {
    return GameObjectManager.removeObjectFromLookupTable(this.tagLookup, tag, id);
  }

  /** Remove any lookup entries for this object id (tag may have changed). */
  static RemoveObjectFromLookupTableById(id: number){
    GameObjectManager.removeObjectFromLookupTableById(this.tagLookup, id);
  }

  /**
   * Map GameObjectType flags → NWScript OBJECT_TYPE bitmask for GetObjectByTag filters.
   */
  static getNWObjectTypeMask(object: GameObject): number {
    if(!object) return 0;
    let mask = 0;
    const t = object.objectType | 0;
    if(BitWise.InstanceOf(t, GameObjectType.Creature) || BitWise.InstanceOf(t, GameObjectType.PlayerCharacter)){
      mask |= NWModuleObjectType.CREATURE;
    }
    if(BitWise.InstanceOf(t, GameObjectType.Item)) mask |= NWModuleObjectType.ITEM;
    if(BitWise.InstanceOf(t, GameObjectType.Trigger)) mask |= NWModuleObjectType.TRIGGER;
    if(BitWise.InstanceOf(t, GameObjectType.Door)) mask |= NWModuleObjectType.DOOR;
    if(BitWise.InstanceOf(t, GameObjectType.AreaEffect)) mask |= NWModuleObjectType.AOE;
    if(BitWise.InstanceOf(t, GameObjectType.Waypoint)) mask |= NWModuleObjectType.WAYPOINT;
    if(BitWise.InstanceOf(t, GameObjectType.Placeable)) mask |= NWModuleObjectType.PLACEABLE;
    if(BitWise.InstanceOf(t, GameObjectType.Store)) mask |= NWModuleObjectType.STORE;
    if(BitWise.InstanceOf(t, GameObjectType.Encounter)) mask |= NWModuleObjectType.ENCOUNTER;
    if(BitWise.InstanceOf(t, GameObjectType.Sound)) mask |= NWModuleObjectType.SOUND;
    return mask;
  }

  static RemoveObject(object: GameObject){
    if(!object) return;
    this.RemoveObjectFromLookupTableById(object.id);
    GameState.module?.aiScheduler.removeObject(object);
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
        GameState.module?.aiScheduler.removeObject(obj);
      }
      return this.ObjectList.delete(id);
    }
    return false;
  }

  static Reset(){
    this.COUNT = FIRST_GAME_OBJECT_ID;
    this.PLAYER_ID = GameObjectConstant.PLAYER_ID;
    this.ObjectList.clear();
    this.tagLookup.length = 0;
    MiniGameObjectArray.clear();
    GameState.module?.aiScheduler.reset();
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
    // FindObjectByTagOrdinal matches "" like any tag against the module
    // tag lookup table. The PC's tag is empty, so an empty lookup resolves to
    // the player — scripts rely on this (e.g. k_pend_traskdl40 moves Trask to
    // GetObjectByTag("")). Alias both '' and 'player' to party[0].
    if(sTag === '' || sTag === 'player'){
      return PartyManager.party[0];
    }

    // FindObjectByTagOrdinal / FindObjectByTagTypeOrdinal
    const filterType = oType | 0;
    const useTypeFilter = filterType !== NWModuleObjectType.ALL;
    const id = GameObjectManager.findObjectIdByTagOrdinal(
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

  public static GetNearestObjectByTag(sTag = '', oObject: GameObject, iNum = 0){
    sTag = sTag.toLowerCase();
    const area = this.module?.area;
    if(!area || !oObject?.position){
      return undefined;
    }
    return GameObjectManager.findNearestInArea({
      area,
      origin: oObject.position,
      nth: iNum,
      excludeId: oObject.id,
      matches: (obj) => (obj.getTag?.() || '').toLowerCase() === sTag,
    });
  }

  public static GetNearestObject(oType = 0, oObject: GameObject, iNum = 0){
    const area = this.module?.area;
    if(!area || !oObject?.position){
      return undefined;
    }
    const typeMask = oType | 0;
    const matchAll = (typeMask & NWModuleObjectType.ALL) === NWModuleObjectType.ALL;
    return GameObjectManager.findNearestInArea({
      area,
      origin: oObject.position,
      nth: iNum,
      excludeId: oObject.id,
      matches: (obj) => matchAll || (this.getNWObjectTypeMask(obj) & typeMask) !== 0,
    });
  }

  public static GetFirstObjectInArea(oArea = this.module.area, oType = 0){

    if(!(BitWise.InstanceOf(oArea?.objectType, GameObjectType.Area))){
      console.error(oArea);
      oArea = this.module.area;
    }
      

    GameObjectManager.objSearchIndex = 0;

    let results: GameObject[] = [];
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
      return results[GameObjectManager.objSearchIndex];
    }
    return undefined;
  }

  public static GetNextObjectInArea(oArea = this.module.area, oType = 0){
    if(!(BitWise.InstanceOf(oArea?.objectType, GameObjectType.Area))){
      console.error(oArea);
      oArea = this.module.area;
    }
    ++GameObjectManager.objSearchIndex;

    let results: GameObject[] = [];
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

    if(GameObjectManager.objSearchIndex < results.length-1){
      return results[GameObjectManager.objSearchIndex];
    }
    return undefined;
  }

  /**
   * Single CREATURE_TYPE_* criterion for GetNearestCreature*.
   */
  private static creatureMatchesNearestCriterion(
    creature: Creature,
    oTarget: GameObject,
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

  private static isNearestCreatureCandidate(obj: GameObject): obj is Creature {
    const t = obj?.objectType | 0;
    return BitWise.InstanceOf(t, GameObjectType.Creature)
      || BitWise.InstanceOf(t, GameObjectType.PlayerCharacter);
  }

  public static GetNearestCreature(nFirstCriteriaType: CreatureType, nFirstCriteriaValue: any, oTarget: GameObject, nNth=1, nSecondCriteriaType=-1, nSecondCriteriaValue=-1, nThirdCriteriaType=-1,  nThirdCriteriaValue=-1, _list?: Creature[] ): Creature {
    const area = this.module?.area;
    if(!area || !oTarget?.position){
      return undefined;
    }

    const matches = (obj: GameObject): boolean => {
      if(!this.isNearestCreatureCandidate(obj)) return false;
      const creature = obj as Creature;
      if(creature.isDead()) return false;
      if(!this.creatureMatchesNearestCriterion(creature, oTarget, nFirstCriteriaType, nFirstCriteriaValue)) return false;
      if(nSecondCriteriaType >= 0 && !this.creatureMatchesNearestCriterion(creature, oTarget, nSecondCriteriaType, nSecondCriteriaValue)) return false;
      if(nThirdCriteriaType >= 0 && !this.creatureMatchesNearestCriterion(creature, oTarget, nThirdCriteriaType, nThirdCriteriaValue)) return false;
      return true;
    };

    return GameObjectManager.findNearestInArea({
      area,
      origin: oTarget.position,
      nth: Math.max(0, (nNth | 0) - 1),
      excludeId: oTarget.id,
      matches,
    }) as Creature;
  }

  /**
   * Pass AL — GetNearestCreatureToLocation (ExecuteCommandGetNearestObject).
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
  ): Creature {
    const area = this.module?.area;
    if(!area || !lLocation?.position){
      return undefined;
    }
    const oTarget = (PartyManager.party[0] || undefined) as GameObject;
    if(!oTarget && nFirstCriteriaType !== CreatureType.IS_ALIVE){
      return undefined;
    }
    const criteriaTarget = oTarget;

    const matches = (obj: GameObject): boolean => {
      if(!this.isNearestCreatureCandidate(obj)) return false;
      const creature = obj as Creature;
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

    return GameObjectManager.findNearestInArea({
      area,
      origin: lLocation.position,
      nth: Math.max(0, (nNth | 0) - 1),
      matches,
    }) as Creature;
  }

  /**
   * Pass AL — GetNearestObjectToLocation (ExecuteCommandGetNearestObject).
   */
  public static GetNearestObjectToLocation(oType = 0, lLocation: EngineLocation, iNum = 0){
    const area = this.module?.area;
    if(!area || !lLocation?.position){
      return undefined;
    }
    const typeMask = oType | 0;
    const matchAll = (typeMask & NWModuleObjectType.ALL) === NWModuleObjectType.ALL;
    return GameObjectManager.findNearestInArea({
      area,
      origin: lLocation.position,
      nth: iNum,
      matches: (obj) => matchAll || (this.getNWObjectTypeMask(obj) & typeMask) !== 0,
    });
  }

  /**
   * Pass AL — GetNearestTrapToObject (ExecuteCommandGetNearestMine).
   * Trap objects = triggers/doors/placeables with trapFlag (or TRAP-type triggers).
   */
  public static GetNearestTrapToObject(oTarget: GameObject, nTrapDetected = 0): GameObject {
    const area = this.module?.area;
    if(!oTarget?.position || !area){
      return undefined;
    }
    return GameObjectManager.findNearestInArea({
      area,
      origin: oTarget.position,
      nth: 0,
      excludeId: oTarget.id,
      matches: (obj) => {
        const t = obj?.objectType | 0;
        let isTrap = false;
        if(BitWise.InstanceOf(t, GameObjectType.Trigger)){
          const trig = obj as Trigger;
          isTrap = trig.type == ModuleTriggerType.TRAP || !!trig.trapFlag;
        }else if(BitWise.InstanceOf(t, GameObjectType.Door)){
          isTrap = !!(obj as Door).trapFlag;
        }else if(BitWise.InstanceOf(t, GameObjectType.Placeable)){
          isTrap = !!(obj as Placeable).trapFlag;
        }
        if(!isTrap) return false;
        if(nTrapDetected && !obj.isTrapDetectedBy?.(oTarget)) return false;
        return true;
      },
    });
  }

  public static GetObjectsInShape(
    shape = -1, size = 1, target: EngineLocation, lineOfSight = false, oType = -1, origin = new THREE.Vector3
  ) : GameObject[] {

    let object_pool: GameObject[] = [];
    let results: GameObject[] = [];

    /*
    int    GameObjectType.CREATURE         = 1;
    int    GameObjectType.ITEM             = 2;
    int    GameObjectType.TRIGGER          = 4;
    int    GameObjectType.DOOR             = 8;
    int    GameObjectType.AOE   = 16;
    int    GameObjectType.WAYPOINT         = 32;
    int    GameObjectType.PLACEABLE        = 64;
    int    GameObjectType.STORE            = 128;
    int    GameObjectType.ENCOUNTER        = 256;
    int    GameObjectType.SOUND            = 512;
    int    OBJECT_TYPE_ALL              = 32767;
    */

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
      if(BitWise.InstanceOf(object_pool[i]?.objectType, GameObjectType.GameObject)){
        if(!GameObjectManager.isPointInShape(shape, object_pool[i].position, center, size, originPos)){
          continue;
        }
        if(lineOfSight){
          const from = originPos;
          if(!hasVisualLos(this.module?.area, from, object_pool[i].position, {
            ignoreObject: object_pool[i],
            eyeHeight: 1.5,
          })){
            continue;
          }
        }
        results.push(object_pool[i]);
      }
    }

    return results;
  }

  public static GetAttackerByIndex(oTarget: GameObject, index: number = 0): GameObject {
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

  static playerSelectableObjects: GameObject[] = [];
  static playerHoverableObjects: GameObject[] = [];
  /** Hostile flags parallel to playerSelectableObjects (GetNearestObjects arg2). */
  static #nearestHostileFlags = new WeakMap<GameObject, boolean>();
  static #currentVisibleObject: GameObject;
  static #currentVisibleObjectIndex: number = 0;
  /** Sticky LOS grace timer. */
  static #stickyLosGrace = 0;
  /** Combat dead-target grace (target_changing). */
  static #targetChanging = 0;
  /** Enemy first-sight latch (enemy_sighted +). */
  static #enemySighted = false;
  static #enemySightedLatch = 0;
  /** Mine first-sight latch (+). */
  static #mineSighted = false;
  static #mineSightedLatch = 0;
  static #cachedFront: GameObject[] = [];

  static #tmpForward = new THREE.Vector3();
  static #tmpBehind = new THREE.Vector3();
  static #tmpDelta = new THREE.Vector3();

  /**
   * ValidNearestObjectType.
   */
  static validNearestObjectType(player: GameObject, obj: GameObject): NearestValid {
    if(!obj || obj === player || !obj.area){
      return { ok: false, hostile: false };
    }

    if(isCreature(obj)){
      const cre = obj as Creature;
      const deadOrCorpse = (typeof cre.isDead === 'function' && cre.isDead())
        || !!(cre as Creature).isRetainedCorpse;
      if(deadOrCorpse){
        // KeepCorpse / DeadSelectable loot shells — friendly pick only (not combat).
        const lootable = (typeof cre.isUseable === 'function' && cre.isUseable())
          || (typeof cre.canLootAsCorpse === 'function' && cre.canLootAsCorpse(player));
        if(!lootable){
          return { ok: false, hostile: false };
        }
        return { ok: true, hostile: false };
      }
      // Pool membership: SEEN in perception list OR spot detection (no LOS yet).
      // Line of sight is enforced later in passive selection.
      const viewer = player as Creature;
      const seen = typeof viewer.hasSeenObject === 'function'
        ? viewer.hasSeenObject(cre)
        : false;
      if(!seen){
        const spotOk = typeof viewer.doSpotDetection === 'function'
          ? viewer.doSpotDetection(cre)
          : false;
        if(!spotOk){
          return { ok: false, hostile: false };
        }
      }
      const hostile = typeof cre.isHostile === 'function'
        ? cre.isHostile(player)
        : false;
      return { ok: true, hostile };
    }

    if(isTrigger(obj)){
      const trig = obj as Trigger;
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

    if(isPlaceable(obj)){
      const plc = obj as Placeable;
      if(!plc.isUseable()){
        return { ok: false, hostile: false };
      }
      // ValidNearest placeable: hostile only when
      // != 0 && reputation < 11. That field is not GFF-loaded
      // and stays 0 for normal containers, so nearest-hostile is never set.
      return { ok: true, hostile: false };
    }

    if(isDoor(obj)){
      const door = obj as Door;
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
   * GetNearestObjects (both ranges 30).
   * around: yaw-sorted; front: distance-sorted within ~30° cone from 4u behind.
   */
  static getNearestObjects(player: GameObject): NearestLists {
    const area = GameState.module?.area;
    if(!player || !area){
      return { around: [], front: [] };
    }

    const candidates: GameObject[] = [
      ...GameState.PartyManager.party,
      ...area.placeables,
      ...area.doors,
      ...area.creatures,
      ...area.triggers.filter((t) => t.type === ModuleTriggerType.TRAP),
    ];

    // Match Creature locomotion forward (rotation.z + π/2)
    const facing = player.getFacing();
    const forwardAngle = facing + Math.PI / 2;
    this.#tmpForward.set(Math.cos(forwardAngle), Math.sin(forwardAngle), 0).normalize();
    this.#tmpBehind
      .copy(player.position)
      .addScaledVector(this.#tmpForward, -FRONT_CONE_ORIGIN_BACK);

    type AroundEntry = { obj: GameObject; yaw: number; hostile: boolean };
    type FrontEntry = { obj: GameObject; distSq: number; hostile: boolean };
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

  static isNearestHostile(obj: GameObject | undefined): boolean {
    if(!obj) return false;
    return this.#nearestHostileFlags.get(obj) === true;
  }

  /** Line of sight from PC to target — 30u range, eye height 1.5. */
  static canSeeObject(player: GameObject, obj: GameObject): boolean {
    if(!player || !obj) return false;
    return player.hasLineOfSight(obj, NEAREST_OBJECT_RANGE, {
      ignorePerceptionRange: true,
      eyeHeight: 1.5,
    });
  }

  /**
   * Present a selected object (reticle / look-at / optional camera focus).
   * @param doLookAt - creature LookAt toward the target
   * @param doCameraFocus - Tab / select-nearest and enemy/mine first-sight
   * may also set camera focus. Continuous combat-mode auto-focus is
   * intentionally omitted: FollowerCamera.focusObject yaw moves the floating
   * target menu and breaks BTN_TARGET clicks (security / attack).
   */
  static showObject(
    obj: GameObject | undefined,
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

    // Camera focus only when LookAt is also requested.
    if(doLookAt && doCameraFocus){
      FollowerCamera.setFocusObject(obj);
    }else if(doLookAt && !doCameraFocus){
      // New passive / mouse acquisition should not keep a prior Tab focus yaw
      FollowerCamera.clearFocusObject();
    }
  }

  /**
   * Rebuild selectable / hoverable caches from nearby objects.
   * Does not mutate current selection (passive selection owns that).
   */
  static GetSelectableObjectsInRange(player: GameObject): GameObject[] {
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

  /** True when object is a trap trigger suitable for mine first-sight force-pick. */
  static #isMineTarget(obj: GameObject): boolean {
    return (
      isTrigger(obj) &&
      (obj as Trigger).type === ModuleTriggerType.TRAP
    );
  }

  /**
   * Passive target selection while exploring / in combat.
   */
  static doPassiveSelection(player: GameObject, delta: number = 0){
    if(!player){
      this.showObject(undefined, false, false);
      return;
    }

    // Rebuild nearest lists every tick
    this.GetSelectableObjectsInRange(player);

    const around = this.playerSelectableObjects;
    const front = this.#cachedFront;
    let last = GameState.CursorManager.selectedObject;
    const combat = !!GameState.CursorManager?.isClientCombatMode?.();
    const paused = GameState.State === EngineState.PAUSED;

    // First pass: creatures → hostile pool, trap triggers → mine pool.
    // Placeables/doors never open either scan.
    let hasHostileInPool = false;
    let hasMineInPool = false;
    for(let i = 0; i < around.length; i++){
      const obj = around[i];
      if(!this.isNearestHostile(obj)) continue;
      if(this.#isMineTarget(obj)){
        hasMineInPool = true;
      }else if(isCreature(obj)){
        hasHostileInPool = true;
      }
    }

    const inAround = (obj: GameObject | undefined) =>
      !!obj && around.indexOf(obj) !== -1;

    let keepSticky = false;
    let forceLookAt = false;
    let forceCameraFocus = false;

    // Combat dead-target grace when last left the pool (target_changing)
    if(last && !inAround(last) && combat && hasHostileInPool){
      const cre = isCreature(last)
        ? (last as Creature)
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

    // Sticky: keep current selection while it remains in the pool
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

    // Enemy / mine line-of-sight scan + first-sight force acquisition
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

        // skips force-pick while paused; first match wins, scan continues for latches
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

        // Enemy first-sight force-pick: creatures only (not placeables/doors).
        // Rising edge always updates selection; auto-pause only when not
        // already in client combat mode.
        if(
          enemyRising &&
          !isMine &&
          isCreature(obj)
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

    // Latch refresh / decay 
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
      // Sticky + visible: LookAt only when force-sight is set
      this.showObject(last, forceLookAt, forceCameraFocus);
      return;
    }

    const firstCanSee = (list: GameObject[], hostileOnly: boolean): GameObject | undefined => {
      for(let i = 0; i < list.length; i++){
        const obj = list[i];
        if(hostileOnly && !this.isNearestHostile(obj)) continue;
        if(!this.canSeeObject(player, obj)) continue;
        return obj;
      }
      return undefined;
    };

    let pick: GameObject | undefined;
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
      // Nothing visible — clear selection presentation
      this.showObject(undefined, false, false);
    }
  }

  /**
   * Cycle to the next / previous selectable object.
   * @param previous - true = previous in the list
   */
  static selectNearestObject(previous: boolean = false): GameObject | undefined {
    const player = PartyManager.party[0] ?? GameState.PartyManager.getCurrentPlayer();
    if(!player) return undefined;

    // Refresh pool if empty
    if(!this.playerSelectableObjects.length){
      this.GetSelectableObjectsInRange(player);
    }

    const list = this.playerSelectableObjects;
    if(!list.length) return undefined;

    const combat = !!GameState.CursorManager?.isClientCombatMode?.();
    // Out of combat: prefer hostile creatures when any exist
    let hostileOnly = false;
    if(!combat){
      for(let i = 0; i < list.length; i++){
        const obj = list[i];
        if(
          this.isNearestHostile(obj) &&
          isCreature(obj) &&
          this.canSeeObject(player, obj)
        ){
          hostileOnly = true;
          break;
        }
      }
    }

    const matches = (obj: GameObject) => {
      if(!this.canSeeObject(player, obj)) return false;
      if(!hostileOnly) return true;
      return (
        isCreature(obj) &&
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

    // Walk until a matching visible object (cycle loop)
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
   * Run passive selection every tick (rebuilds nearest lists internally).
   * Skipped while a global fade is active or obscuring, and while a module is loading.
   */
  static TickSelectableObjects(delta: number = 0){
    const player = PartyManager.party[0];
    if(!player){
      return;
    }

    // Passive selection only after world fade is clear
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