import * as THREE from "three";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import { BitWise } from "@/utility/BitWise";

/**
 * Retail CSWSDoor::GetNearestActionPoint @ 00589240 /
 * CSWSPlaceable::GetNearestActionPoint @ 00584c20.
 *
 * Prefer nearer walkable candidate (mesh use positions / transition line).
 * Retail uses PositionWalkable — it does NOT shove the point by personal space.
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
 * Retail PositionWalkable gate: keep the point if walkable; otherwise a tiny
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

function getWalkmesh(obj: ModuleObject): OdysseyWalkMesh | undefined {
  return (obj as any)?.collisionManager?.walkmesh as OdysseyWalkMesh | undefined;
}

function pushMeshUsePositions(obj: ModuleObject, out: THREE.Vector3[]): void {
  const walkmesh = getWalkmesh(obj);
  if(!walkmesh?.getRelativeUsePositionWorld) return;

  if((obj as any).model?.matrix && walkmesh.matrixWorld){
    walkmesh.matrixWorld.copy((obj as any).model.matrix);
  }

  const p1 = walkmesh.getRelativeUsePositionWorld(1, _tmpA);
  const p2 = walkmesh.getRelativeUsePositionWorld(2, _tmpB);
  if(p1) out.push(p1.clone());
  if(p2) out.push(p2.clone());
}

/**
 * Among candidates, pick the nearest to `from` that is walkable (or soft-snapped).
 * Mirrors retail: nearer first, require PositionWalkable.
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
  door: ModuleDoor,
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
  placeable: ModulePlaceable,
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
 */
export function getNearestActionPoint(
  target: ModuleObject,
  from: THREE.Vector3,
  owner?: ModuleObject
): THREE.Vector3 {
  const perspace = getPathPersonalSpace(owner as any);
  if(BitWise.InstanceOfObject(target, ModuleObjectType.ModuleDoor)){
    return getDoorNearestActionPoint(target as ModuleDoor, from, perspace);
  }
  if(BitWise.InstanceOfObject(target, ModuleObjectType.ModulePlaceable)){
    return getPlaceableNearestActionPoint(target as ModulePlaceable, from, perspace);
  }
  return target.position.clone();
}

/**
 * @deprecated Prefer getDoorNearestActionPoint / pickNearestWalkable.
 * Kept for callers that imported the mesh-only helper.
 */
export function getMeshNearestActionPoint(
  obj: ModuleObject,
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
