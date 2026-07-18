import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { PathPoint } from "@/engine/pathfinding/PathPoint";
import { ComputedPath } from "@/engine/pathfinding/ComputedPath";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { hasDirectLine } from "@/engine/pathfinding/test-direct-line";
import { plotGridPath } from "@/engine/pathfinding/plot-grid-path";

/**
 * Pre-validate that a Check* Move destination is traversable (N6).
 * Mirrors PlotPathInArea: LOS → PTH A* → PlotGridPath.
 * Returns false when all stages fail — retail Check* ERROR.
 *
 * @file can-path-to.ts
 */

/**
 * True if creature can path to dest (LOS, PTH A*, or PlotGridPath).
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

  // Retail PlotPathInArea stage 1
  if(hasDirectLine(area, creature.position, target, creature)){
    return true;
  }

  const pathApi = area.path;
  if(!pathApi?.points?.length){
    // No PTH: retail PlotGridPath
    const grid = plotGridPath(area, creature.position, target, {
      owner: creature,
      personalSpace: getPathPersonalSpace(creature),
      checkCreatures: true,
    });
    if(!grid?.length) return false;
    const last = grid[grid.length - 1];
    return last.distanceToSquared(target) < 1.0;
  }

  pathApi.reset();

  const originPoint = PathPoint.FromVector3(creature.position);
  originPoint.setArea(area);
  const destPoint = PathPoint.FromVector3(target);
  destPoint.setArea(area);

  const closestOrigin = pathApi.getClosestPathPoint(creature.position);
  const closestDest = pathApi.getClosestPathPoint(target);
  if(!closestOrigin || !closestDest){
    return false;
  }

  originPoint.addConnection(closestOrigin);
  closestOrigin.addConnection(originPoint);
  closestDest.addConnection(destPoint);
  destPoint.addConnection(closestDest);

  originPoint.connections = pathApi.points.slice(0).filter((p) => {
    return p.hasLOS(originPoint, creature);
  });

  const path = new ComputedPath(creature, originPoint, destPoint);
  path.setOwner(creature);
  path.search();

  for(let i = 0; i < pathApi.points.length; i++){
    const p = pathApi.points[i];
    p.removeConnection(originPoint);
    p.removeConnection(destPoint);
  }

  if(!path.points.length){
    // PTH A* failed — retail PlotPathInArea still tries PlotGridPath
    const grid = plotGridPath(area, creature.position, target, {
      owner: creature,
      personalSpace: getPathPersonalSpace(creature),
      checkCreatures: true,
    });
    if(!grid?.length) return false;
    const gridLast = grid[grid.length - 1];
    return gridLast.distanceToSquared(target) < 1.0;
  }
  const last = path.points[path.points.length - 1];
  return last === destPoint || last?.end === true ||
    last?.vector.distanceToSquared(target) < 4.0;
}
