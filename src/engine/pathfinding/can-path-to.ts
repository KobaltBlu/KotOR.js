import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { getPathPersonalSpace } from "@/combat/attack-range";
import {
  plotPath,
  PlotPathCode,
  type PathFindInfoLite,
} from "@/engine/pathfinding/plot-path";

/**
 * Pre-validate that a Check* Move destination is traversable (N6).
 * Routes through PlotPath façade (codes 1/2/3): Ready|Incomplete = ok, Fail = false.
 *
 * @file can-path-to.ts
 */

/**
 * True if creature can path to dest (PlotPath Ready or Incomplete).
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
  const result = plotPath(area, creature, info, { smooth: false });
  // Retail Check continues on Incomplete; only Fail → ERROR
  return result.code === PlotPathCode.Ready || result.code === PlotPathCode.Incomplete;
}
