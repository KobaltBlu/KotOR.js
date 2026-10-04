import * as THREE from "three";
import type { ModuleArea } from "@engine/module/ModuleArea";
import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ComputedPath } from "@engine/pathfinding/ComputedPath";
import {
  hasWalkLineClear,
  WalkLineHitCode,
} from "@engine/pathfinding/walk-line-clear";
import {
  edgeCacheKey,
  getWalkmeshEdgeClearCached,
  setWalkmeshEdgeClearCached,
} from "@engine/pathfinding/walkmesh-edge-clear-cache";

export { invalidateWalkmeshEdgeClearCache } from "@engine/pathfinding/walkmesh-edge-clear-cache";

/**
 * Walk-line validation for computed path hops (smooth chords vs blocking edges).
 *
 * @file path-hops-clear.ts
 */

/** Sustained drive BLOCKED frames before treating a partial DetailedBlock as stale. */
export const WALKMESH_BLOCK_REPATH_FRAMES = 3;

/** Skip origin-duplicated / micro hops when validating path polylines. */
const HOP_EPS_SQ = 1e-6;

const _detour = new THREE.Vector3();

/**
 * True when a plot-graph / PTH edge chord stays on walkmesh (creatures ignored).
 * Rejects NonWalk face voids and hard DetailedBlock at the origin (clearT ≈ 0).
 * Uses personalSpace 0 so narrow walkable corridors (doorways) are not pruned by
 * appearance pad — the check is face/clip walkability, not creature radius.
 * Does not skip clipped-line checks — doorway voids must prune edges.
 */
export function isWalkmeshEdgeWalkClear(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  owner?: ModuleObject
): boolean {
  if(!area || !from || !to) return true;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if(dx * dx + dy * dy < HOP_EPS_SQ){
    return true;
  }

  const key = edgeCacheKey(from, to);
  const cached = getWalkmeshEdgeClearCached(area, key);
  if(cached !== undefined){
    return cached;
  }

  const hit = hasWalkLineClear(area, from, to, {
    owner,
    checkCreatures: false,
    personalSpace: 0,
  });
  let clear: boolean;
  if(hit.ok || hit.code === WalkLineHitCode.Creature){
    clear = true;
  }else if(hit.code === WalkLineHitCode.NonWalk){
    clear = false;
  }else if(hit.clearT < 0.05){
    // Hard clip at the start — cannot use this graph edge.
    clear = false;
  }else{
    // Partial detailed block along an otherwise usable corridor — allow the edge;
    // drive / hop validation handle sustained blocks.
    clear = hit.code !== WalkLineHitCode.Fail;
  }

  setWalkmeshEdgeClearCached(area, key, clear);
  return clear;
}

/**
 * True when the straight hop is blocked by walkmesh / static geometry
 * (not creatures — those use hex detour / pathBlockFailCount).
 */
export function isWalkmeshHopBlocked(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  owner?: ModuleObject,
  blockingTimer: number = 0
): boolean {
  if(!area || !from || !to) return false;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if(dx * dx + dy * dy < HOP_EPS_SQ){
    return false;
  }
  const hit = hasWalkLineClear(area, from, to, {
    owner,
    checkCreatures: false,
  });
  if(hit.ok) return false;
  if(hit.code === WalkLineHitCode.Creature) return false;
  if(hit.code === WalkLineHitCode.NonWalk) return true;
  // Fully blocked at the origin (clearT ≈ 0) — cannot advance this hop.
  if(hit.clearT < 0.05) return true;
  // Partial detailed block — wait a few blocked frames before forcing repath.
  return (blockingTimer | 0) >= WALKMESH_BLOCK_REPATH_FRAMES;
}

/**
 * Validate origin → each waypoint is walk-line clear (creatures ignored).
 * Areas without walkFaces skip validation (incomplete fixtures / unit tests).
 * Near-zero hops (duplicated origin points) are skipped.
 * Uses the same face-clear bar as plot-graph edges (personalSpace 0).
 */
export function pathHopsAreWalkClear(
  area: ModuleArea | undefined,
  origin: THREE.Vector3,
  path: ComputedPath | undefined,
  owner?: ModuleObject
): boolean {
  if(!area || !path?.points?.length) return false;
  if(!area.walkFaces?.length) return true;

  let prev = origin;
  for(let i = 0; i < path.points.length; i++){
    const next = path.points[i]?.vector;
    if(!next) return false;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if(dx * dx + dy * dy < HOP_EPS_SQ){
      prev = next;
      continue;
    }
    if(!isWalkmeshEdgeWalkClear(area, prev, next, owner)){
      return false;
    }
    prev = next;
  }
  return true;
}

/**
 * Pop leading waypoints that are walkmesh-blocked from `from` while more remain.
 * Leaves the final point even if blocked so callers can full-replot.
 */
export function dropWalkmeshBlockedPathPrefix(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  path: ComputedPath | undefined,
  owner?: ModuleObject,
  blockingTimer: number = 0
): number {
  if(!area || !path?.points?.length) return 0;
  let dropped = 0;
  while(path.points.length > 1){
    const next = path.points[0]?.vector;
    if(!next) break;
    if(!isWalkmeshHopBlocked(area, from, next, owner, blockingTimer)){
      break;
    }
    path.pop();
    dropped++;
  }
  return dropped;
}

const DETOUR_RADII = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];
const DETOUR_ANGLES = 16;

function isReachableEscapeStep(
  area: ModuleArea,
  from: THREE.Vector3,
  to: THREE.Vector3,
  owner?: ModuleObject
): boolean {
  // Escape ring steps ignore creature personal-space inflation — jammed doorway
  // pockets otherwise report DetailedBlock at clearT≈0 for every micro-step.
  const hit = hasWalkLineClear(area, from, to, {
    owner,
    checkCreatures: false,
    softClearStartOverlap: true,
    personalSpace: 0,
  });
  if(hit.ok || hit.code === WalkLineHitCode.Creature){
    return true;
  }
  // Hard void / non-walk face gap — never step through.
  if(hit.code === WalkLineHitCode.NonWalk){
    return false;
  }
  // Mild clip: require real forward progress along the chord.
  return hit.clearT >= 0.5;
}

/**
 * Ring-search a walk-line-clear intermediate from `from` toward `dest`.
 * Prefers the clear-to-dest candidate with the lowest remaining distance;
 * otherwise the reachable point that most reduces 2D distance to dest.
 * If `from` is off-walkmesh, rebases the search to the nearest walkable point.
 * Returns a cloned point, or undefined if none found.
 */
export function findWalkClearDetour(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  dest: THREE.Vector3,
  owner?: ModuleObject
): THREE.Vector3 | undefined {
  if(!area || !from || !dest) return undefined;
  if(typeof area.isPointWalkable !== "function") return undefined;

  let searchFrom = from;
  if(!area.isPointWalkable(from) && typeof area.getNearestWalkablePoint === "function"){
    const safe = area.getNearestWalkablePoint(from, 2.0);
    if(safe && area.isPointWalkable(safe)){
      const toDest = hasWalkLineClear(area, safe, dest, {
        owner,
        checkCreatures: false,
      });
      if(toDest.ok || toDest.code === WalkLineHitCode.Creature){
        return safe.clone();
      }
      searchFrom = safe;
    }
  }

  const baseDist = Math.hypot(dest.x - searchFrom.x, dest.y - searchFrom.y);
  let bestClearToDest: THREE.Vector3 | undefined;
  let bestClearToDestDist = Number.POSITIVE_INFINITY;
  let bestCloser: THREE.Vector3 | undefined;
  let bestCloserDist = baseDist;

  for(let ri = 0; ri < DETOUR_RADII.length; ri++){
    const radius = DETOUR_RADII[ri];
    let ringFoundClearToDest = false;
    for(let a = 0; a < DETOUR_ANGLES; a++){
      const ang = (a * Math.PI * 2) / DETOUR_ANGLES;
      _detour.set(
        searchFrom.x + Math.cos(ang) * radius,
        searchFrom.y + Math.sin(ang) * radius,
        searchFrom.z
      );
      if(!area.isPointWalkable(_detour)) continue;
      if(!isReachableEscapeStep(area, searchFrom, _detour, owner)){
        continue;
      }

      const d = Math.hypot(dest.x - _detour.x, dest.y - _detour.y);
      // Already have a clearer-to-dest candidate closer to dest — skip dest probe.
      if(d + 1e-4 >= bestClearToDestDist){
        if(d + 0.05 < bestCloserDist){
          bestCloserDist = d;
          bestCloser = _detour.clone();
        }
        continue;
      }

      const toHit = hasWalkLineClear(area, _detour, dest, {
        owner,
        checkCreatures: false,
      });
      if(toHit.ok || toHit.code === WalkLineHitCode.Creature){
        bestClearToDestDist = d;
        bestClearToDest = _detour.clone();
        ringFoundClearToDest = true;
        continue;
      }

      if(d + 0.05 < bestCloserDist){
        bestCloserDist = d;
        bestCloser = _detour.clone();
      }
    }
    // Inner rings are closer to the actor; once a ring yields a clear-to-dest
    // step, skip outer rings (avoids up to ~80 extra hasWalkLineClear probes).
    if(ringFoundClearToDest && bestClearToDest){
      return bestClearToDest;
    }
  }

  // Off-mesh start: at least step onto the rebased walkable point.
  if(
    !bestClearToDest &&
    !bestCloser &&
    searchFrom !== from &&
    area.isPointWalkable(searchFrom)
  ){
    return searchFrom.clone();
  }

  return bestClearToDest ?? bestCloser;
}
