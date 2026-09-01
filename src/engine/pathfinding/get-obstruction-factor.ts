import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import { GameState } from "@/GameState";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { isLineOfSightBlockingFace } from "@/engine/pathfinding/walk-check-material-mask";
import { noNonWalkPolysDetailed } from "@/engine/pathfinding/no-non-walk-polys";
import { createWalkHitInfo } from "@/engine/pathfinding/walk-hit-info";

/**
 * Retail sound internal / GetObstructionFactor.
 *
 * Walks ClearLineOfSight from source → listener, accumulating Miles-style
 * obstruction: wall/placeable +0.4, door +0.55, capped at 1.0. After each hit,
 * advances 0.1 units past the hit toward the listener and continues.
 *
 * Applied as sample obstruction (oneshot) or volume × (1 − factor) (streaming).
 * KotOR.js approximates both via AudioEmitter gain × (1 − factor).
 *
 * @file get-obstruction-factor.ts
 */

/** Wall / invalid-object hit (OBJECT_INVALID path). */
export const OBSTRUCTION_WALL = 0.4;
/** Placeable hit (vtable IsPlaceable). */
export const OBSTRUCTION_PLACEABLE = 0.4;
/** Door hit (vtable IsDoor). */
export const OBSTRUCTION_DOOR = 0.55;
/** Step past hit along ray (0x3dcccccd). */
export const OBSTRUCTION_STEP = 0.1;
/** GetClosestRecentSound position epsilon. */
export const OBSTRUCTION_REUSE_DIST = 0.5;
/** GetClosestRecentSound max age (0xaf ms). */
export const OBSTRUCTION_REUSE_AGE_MS = 0xaf;
/** Per-call time budget in GetObstructionFactor (tmp38 < 100). */
export const OBSTRUCTION_CALL_BUDGET_MS = 100;

export type AudioObstructionHitKind = "wall" | "door" | "placeable";

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _cursor = new THREE.Vector3();

function obstructionForObjectId(objectId: number | undefined): number {
  if(objectId == null || objectId === 0x7f000000){
    return OBSTRUCTION_WALL;
  }
  const obj = GameState.ModuleObjectManager?.GetObjectById?.(objectId);
  if(!obj){
    return OBSTRUCTION_WALL;
  }
  if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
    return OBSTRUCTION_DOOR;
  }
  if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
    return OBSTRUCTION_PLACEABLE;
  }
  return OBSTRUCTION_WALL;
}

/**
 * One ClearLineOfSight-style probe; returns false if clear.
 * Fills hitPoint and optional blockingObjectId when blocked.
 */
function probeObstructionHit(
  area: ModuleArea,
  from: THREE.Vector3,
  to: THREE.Vector3,
  ignoreObjectIds: number[] | undefined,
  hitPoint: THREE.Vector3
): { blocked: boolean; objectId?: number } {
  const dist = from.distanceTo(to);
  if(dist < 0.05){
    return { blocked: false };
  }

  const walkHit = createWalkHitInfo();
  const detailed = noNonWalkPolysDetailed(area, from, to, {
    personalSpace: 0.001,
    ignoreObjectIds,
    hit: walkHit,
    skipMesh: true,
  });
  if(!detailed.clear){
    if(walkHit.hitPoint && walkHit.hitPoint.lengthSq() > 0){
      hitPoint.copy(walkHit.hitPoint);
    }else{
      hitPoint.copy(to);
    }
    return { blocked: true, objectId: detailed.blockingObjectId };
  }

  _dir.copy(to).sub(from).normalize();
  GameState.raycaster.ray.origin.copy(from);
  GameState.raycaster.ray.direction.copy(_dir);
  GameState.raycaster.far = dist;

  const rooms = area.rooms;
  if(!rooms?.length){
    return { blocked: false };
  }

  let bestDistSq = Infinity;
  let blocked = false;
  for(let r = 0; r < rooms.length; r++){
    const room = rooms[r];
    const wok = room?.collisionManager?.walkmesh;
    if(!wok?.faces?.length) continue;
    const intersects = wok.raycast
      ? wok.raycast(GameState.raycaster, wok.faces)
      : undefined;
    if(!intersects) continue;
    for(let k = 0; k < intersects.length; k++){
      const hit = intersects[k];
      if(hit.distance >= dist) continue;
      const wokFace = (hit as any).face;
      if(!wokFace || !isLineOfSightBlockingFace(wokFace)) continue;
      const d2 = hit.distance * hit.distance;
      if(d2 < bestDistSq){
        bestDistSq = d2;
        hitPoint.copy(from).addScaledVector(_dir, hit.distance);
        blocked = true;
      }
    }
  }

  return blocked ? { blocked: true } : { blocked: false };
}

/**
 * Retail GetObstructionFactor(sourceXYZ, listenerXYZ) → [0, 1].
 * 0 = clear path; 1 = fully obstructed.
 */
export function getObstructionFactor(
  area: ModuleArea | undefined,
  source: { x: number; y: number; z: number },
  listener: { x: number; y: number; z: number }
): number {
  if(!area){
    return 0;
  }

  _from.set(source.x, source.y, source.z);
  _to.set(listener.x, listener.y, listener.z);
  if(_from.distanceToSquared(_to) < 1e-6){
    return 0;
  }

  let factor = 0;
  _cursor.copy(_from);
  const ignoreIds: number[] = [];
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;

  // Retail loops while ClearLineOfSight fails and elapsed < 100ms.
  for(let guard = 0; guard < 64; guard++){
    if(typeof performance !== "undefined" && performance.now() - t0 >= OBSTRUCTION_CALL_BUDGET_MS){
      break;
    }

    const probe = probeObstructionHit(
      area,
      _cursor,
      _to,
      ignoreIds.length ? ignoreIds : undefined,
      _hit
    );
    if(!probe.blocked){
      break;
    }

    factor += obstructionForObjectId(probe.objectId);
    if(factor >= 1){
      return 1;
    }

    if(probe.objectId != null && probe.objectId !== 0x7f000000){
      if(ignoreIds.indexOf(probe.objectId) < 0){
        ignoreIds.push(probe.objectId);
      }
    }

    // Advance 0.1 past hit toward listener.
    _dir.copy(_to).sub(_hit);
    const len = _dir.length();
    if(len < 1e-4){
      break;
    }
    _dir.multiplyScalar(1 / len);
    _cursor.copy(_hit).addScaledVector(_dir, OBSTRUCTION_STEP);

    // Past listener → done.
    if(_cursor.distanceToSquared(_from) >= _from.distanceToSquared(_to)){
      break;
    }
  }

  return factor > 1 ? 1 : factor;
}

/** Gain multiplier for Miles obstruction / streaming (1 − factor). */
export function obstructionVolumeScale(factor: number): number {
  if(!Number.isFinite(factor) || factor <= 0) return 1;
  if(factor >= 1) return 0;
  return 1 - factor;
}
