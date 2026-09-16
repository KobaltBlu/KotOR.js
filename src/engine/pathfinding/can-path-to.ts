import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { getPathPersonalSpace } from "@/combat/attack-range";
import {
  buildWalkPath,
  WalkPathCode,
  type PathFindInfoLite,
} from "@/engine/pathfinding/build-walk-path";

/**
 * Pre-validate that a Check* Move destination is traversable (N6).
 * Routes through buildWalkPath façade (codes 1/2/3): Ready|Incomplete = ok, Fail = false.
 *
 * @file can-path-to.ts
 */

/**
 * True if creature can path to dest (buildWalkPath Ready or Incomplete).
 */
export function canPathToPoint(
  creature: ModuleCreature,
  dest: THREE.Vector3
): boolean {
  const area = creature.area;
  if(!area) return false;

  let target = dest.clone();
  if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(target)){
    if(typeof area.getNearestWalkablePoint !== 'function'){
      return false;
    }
    target = area.getNearestWalkablePoint(target, getPathPersonalSpace(creature));
    if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(target)){
      return false;
    }
  }

  const info: PathFindInfoLite = {
    ownerId: creature.id,
    origin: creature.position.clone(),
    dest: target.clone(),
  };
  const result = buildWalkPath(area, creature, info, { smooth: false });
  // Check continues on Incomplete; only Fail → ERROR
  return result.code === WalkPathCode.Ready || result.code === WalkPathCode.Incomplete;
}
