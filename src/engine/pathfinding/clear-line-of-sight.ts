import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import { GameState } from "@/GameState";
import { isLineOfSightBlockingFace } from "@/engine/pathfinding/walk-check-material-mask";
import { noNonWalkPolysDetailed } from "@/engine/pathfinding/no-non-walk-polys";
import { createWalkHitInfo } from "@/engine/pathfinding/walk-hit-info";

/**
 * Approximate CSWSArea::ClearLineOfSight @ 0050c330.
 *
 * Retail order (Ghidra-validated):
 * 1. NoNonWalkPolysDetailed(…, personal_space=0.001, exclude source+target)
 *    — static doors/placeables only (not room walk-check mesh)
 * 2. Per-room CheckAABBLineOfSight with los_material_mask
 *    (`1 << (mat & 0x1f)` & mask — JS: surfacemat.lineofsight / blocksLineOfSight)
 *
 * @file clear-line-of-sight.ts
 */

const _dir = new THREE.Vector3();
const _fromEye = new THREE.Vector3();
const _toEye = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();

/**
 * True if eye-height ClearLineOfSight from→to succeeds.
 */
export function clearLineOfSight(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: {
    ignoreObject?: ModuleObject;
    ignoreSource?: ModuleObject;
    eyeHeight?: number;
    hitPoint?: THREE.Vector3;
  } = {}
): boolean {
  if(!area) return true;
  const eye = options.eyeHeight ?? 1.5;
  const a = _fromEye.set(from.x, from.y, from.z + eye);
  const b = _toEye.set(to.x, to.y, to.z + eye);
  const dist = a.distanceTo(b);
  if(dist < 0.05) return true;

  const ignoreIds: number[] = [];
  if(options.ignoreSource?.id != null) ignoreIds.push(options.ignoreSource.id);
  if(options.ignoreObject?.id != null) ignoreIds.push(options.ignoreObject.id);

  // Retail step 1: NoNonWalkPolysDetailed @ 0.001 (static objects)
  const walkHit = createWalkHitInfo();
  const detailed = noNonWalkPolysDetailed(area, a, b, {
    personalSpace: 0.001,
    ignoreObjectIds: ignoreIds.length ? ignoreIds : undefined,
    hit: walkHit,
    skipMesh: true,
  });
  if(!detailed.clear){
    if(options.hitPoint){
      if(walkHit.hitPoint && walkHit.hitPoint.lengthSq() > 0){
        options.hitPoint.copy(walkHit.hitPoint);
      }else{
        options.hitPoint.copy(b);
      }
    }
    return false;
  }

  _dir.copy(b).sub(a).normalize();
  GameState.raycaster.ray.origin.copy(a);
  GameState.raycaster.ray.direction.copy(_dir);
  GameState.raycaster.far = dist;

  // Retail step 2: CheckAABBLineOfSight / los_material_mask on room woks
  const rooms = area.rooms;
  if(!rooms?.length) return true;

  let bestDistSq = Infinity;
  let blocked = false;
  for(let r = 0; r < rooms.length; r++){
    const room = rooms[r];
    const wok = room?.collisionManager?.walkmesh;
    if(!wok?.aabbNodes?.length && !wok?.faces?.length) continue;
    const faces = wok.faces;
    const intersects = wok.raycast
      ? wok.raycast(GameState.raycaster, faces)
      : undefined;
    if(!intersects) continue;
    for(let k = 0; k < intersects.length; k++){
      const hit = intersects[k];
      if(hit.distance >= dist) continue;
      const wokFace = (hit as any).face;
      // Retail: only faces in los_material_mask
      if(wokFace && !isLineOfSightBlockingFace(wokFace)) continue;
      if(!wokFace) continue; // no metadata → skip (avoid false blocks)
      const d2 = hit.distance * hit.distance;
      if(d2 < bestDistSq){
        bestDistSq = d2;
        _hitPoint.copy(a).addScaledVector(_dir, hit.distance);
        blocked = true;
      }
    }
  }

  if(blocked){
    if(options.hitPoint) options.hitPoint.copy(_hitPoint);
    return false;
  }
  return true;
}
