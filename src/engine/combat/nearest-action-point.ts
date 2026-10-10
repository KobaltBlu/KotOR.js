import * as THREE from "three";
import { getPathPersonalSpace } from "@engine/combat/attack-range";
import type { Door } from "@engine/module/Door";
import type { GameObject } from "@engine/module/GameObject";
import type { Placeable } from "@engine/module/Placeable";
import type { OdysseyWalkMesh } from "@engine/odyssey/OdysseyWalkMesh";

import { isDoor } from "@engine/module/guards/isDoor";
import { isPlaceable } from "@engine/module/guards/isPlaceable";

/**
 * GetNearestActionPoint
 * GetNearestActionPoint.
 *
 * Prefer nearer walkable candidate (mesh use positions / transition line).
 * uses PositionWalkable — it does NOT shove the point by personal space.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file nearest-action-point.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _closest = new THREE.Vector3();

type AreaWalk = {
  isPointWalkable?: (p: THREE.Vector3) => boolean;
  getNearestWalkablePoint?: (p: THREE.Vector3, r?: number) => THREE.Vector3;
};

/**
 * PositionWalkable gate: keep the point if walkable; otherwise a tiny
 * snap only. Passing owner perspace into getNearestWalkablePoint pushed
 * doorway points deep into the room ("walk away then use").
 */
function preferWalkable(
  area: AreaWalk | undefined,
  point: THREE.Vector3
): THREE.Vector3 {
  if(area?.isPointWalkable?.(point)){
    return point.clone();
  }
  if(area?.getNearestWalkablePoint){
    return area.getNearestWalkablePoint(point, 0.05);
  }
  return point.clone();
}

function getWalkmesh(obj: GameObject): OdysseyWalkMesh | undefined {
  return (obj as any)?.collisionManager?.walkmesh as OdysseyWalkMesh | undefined;
}

function pushMeshUsePositions(obj: GameObject, out: THREE.Vector3[]): void {
  const walkmesh = getWalkmesh(obj);
  if(!walkmesh?.getRelativeUsePositionWorld) return;

  // Position lives on container (not model.matrix). Sync before LocalToWorld so
  // spawned placeables/bodybags with identity mat4 get absolute use points.
  const container = (obj as any).container as THREE.Object3D | undefined;
  if(container?.matrixWorld && walkmesh.matrixWorld){
    container.updateMatrixWorld?.(true);
    walkmesh.matrixWorld.copy(container.matrixWorld);
  }else if((obj as any).model?.matrixWorld && walkmesh.matrixWorld){
    (obj as any).model.updateMatrixWorld?.(true);
    walkmesh.matrixWorld.copy((obj as any).model.matrixWorld);
  }

  const p1 = walkmesh.getRelativeUsePositionWorld(1, _tmpA);
  const p2 = walkmesh.getRelativeUsePositionWorld(2, _tmpB);
  if(p1) out.push(p1.clone());
  if(p2) out.push(p2.clone());
}

/**
 * Among candidates, pick the nearest to `from` that is walkable (or soft-snapped).
 * matches engine behavior: nearer first, require PositionWalkable.
 */
function pickNearestWalkable(
  area: AreaWalk | undefined,
  from: THREE.Vector3,
  candidates: THREE.Vector3[]
): THREE.Vector3 | undefined {
  let best: THREE.Vector3 | undefined;
  let bestDist = Infinity;

  for(let i = 0; i < candidates.length; i++){
    const raw = candidates[i];
    const walked = preferWalkable(area, raw);
    // Reject snaps that drift far from the candidate (bad walkmesh shove)
    if(walked.distanceToSquared(raw) > 1.0){
      if(!area?.isPointWalkable?.(raw)){
        continue;
      }
    }
    const d = from.distanceToSquared(walked);
    if(d < bestDist){
      bestDist = d;
      best = walked;
    }
  }
  return best;
}

/** Door: mesh hooks + transition line; nearer walkable wins. */
export function getDoorNearestActionPoint(
  door: Door,
  from: THREE.Vector3,
  _ownerPerspace: number = 0.35
): THREE.Vector3 {
  const candidates: THREE.Vector3[] = [];
  pushMeshUsePositions(door, candidates);

  if(!door.transitionLine){
    door.generateTransitionLine?.();
  }
  if(door.transitionLine){
    door.transitionLine.closestPointToPoint(from, true, _closest);
    _closest.z = door.position.z;
    candidates.push(_closest.clone());
  }

  if(!candidates.length){
    return preferWalkable(door.area, door.position);
  }

  const picked = pickNearestWalkable(door.area, from, candidates);
  if(picked){
    return picked;
  }

  // Last resort: nearest raw candidate to the caller (no snap)
  let best = candidates[0];
  let bestDist = from.distanceToSquared(best);
  for(let i = 1; i < candidates.length; i++){
    const d = from.distanceToSquared(candidates[i]);
    if(d < bestDist){
      bestDist = d;
      best = candidates[i];
    }
  }
  return best.clone();
}

/**
 * Placeable: mesh relative_use_position first; else ±facing offsets.
 */
export function getPlaceableNearestActionPoint(
  placeable: Placeable,
  from: THREE.Vector3,
  ownerPerspace: number = 0.35
): THREE.Vector3 {
  const candidates: THREE.Vector3[] = [];
  pushMeshUsePositions(placeable, candidates);

  if(!candidates.length){
    const origin = placeable.position;
    let forwardX = 0;
    let forwardY = 1;
    const container = (placeable as any).container;
    if(container?.matrix){
      forwardX = container.matrix.elements[4];
      forwardY = container.matrix.elements[5];
      const len = Math.sqrt(forwardX * forwardX + forwardY * forwardY) || 1;
      forwardX /= len;
      forwardY /= len;
    }else if(typeof placeable.getFacing === 'function'){
      const facing = placeable.getFacing();
      forwardX = Math.cos(facing);
      forwardY = Math.sin(facing);
    }

    const offset = Math.max(0.75, ownerPerspace + 0.4);
    candidates.push(new THREE.Vector3(
      origin.x + forwardX * offset,
      origin.y + forwardY * offset,
      origin.z
    ));
    candidates.push(new THREE.Vector3(
      origin.x - forwardX * offset,
      origin.y - forwardY * offset,
      origin.z
    ));
  }

  const picked = pickNearestWalkable(placeable.area, from, candidates);
  if(picked){
    return picked;
  }

  let best = candidates[0];
  let bestDist = from.distanceToSquared(best);
  for(let i = 1; i < candidates.length; i++){
    const d = from.distanceToSquared(candidates[i]);
    if(d < bestDist){
      bestDist = d;
      best = candidates[i];
    }
  }
  return best.clone();
}

/**
 * Nearest interact / bash approach point for doors & placeables; otherwise object origin.
 *
 * Combat approach has no surround / open-spot picker — creature attack
 * destinations are the target origin (arrive via Desired/MaxAttackRange);
 * doors/placeables use GetNearestActionPoint.
 */
export function getNearestActionPoint(
  target: GameObject,
  from: THREE.Vector3,
  owner?: GameObject
): THREE.Vector3 {
  const perspace = getPathPersonalSpace(owner as any);
  if(isDoor(target)){
    return getDoorNearestActionPoint(target as Door, from, perspace);
  }
  if(isPlaceable(target)){
    return getPlaceableNearestActionPoint(target as Placeable, from, perspace);
  }
  return target.position.clone();
}

/**
 * Attack-approach destination for `attacker` toward `target`.
 * Same as getNearestActionPoint — not a surround/best-slot search.
 */
export function getAttackApproachPoint(
  target: GameObject,
  attacker: GameObject
): THREE.Vector3 {
  return getNearestActionPoint(target, attacker.position, attacker);
}

/**
 * @deprecated Prefer getDoorNearestActionPoint / pickNearestWalkable.
 * Kept for callers that imported the mesh-only helper.
 */
export function getMeshNearestActionPoint(
  obj: GameObject,
  from: THREE.Vector3
): THREE.Vector3 | undefined {
  const candidates: THREE.Vector3[] = [];
  pushMeshUsePositions(obj, candidates);
  if(!candidates.length) return undefined;
  let best = candidates[0];
  let bestDist = from.distanceToSquared(best);
  for(let i = 1; i < candidates.length; i++){
    const d = from.distanceToSquared(candidates[i]);
    if(d < bestDist){
      bestDist = d;
      best = candidates[i];
    }
  }
  return best.clone();
}
