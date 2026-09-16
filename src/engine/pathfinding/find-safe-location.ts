import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { testSafeLocationPoint } from "@/engine/pathfinding/test-safe-location-point";
import {
  getWalkHeightAt,
  testDirectLine,
  TestDirectLineCode,
} from "@/engine/pathfinding/test-direct-line";
import { clearLineOfSight } from "@/engine/pathfinding/clear-line-of-sight";
import { countVisibleToPlayers } from "@/engine/pathfinding/count-visible-to-players";

/**
 * find safe location
 * find non-visible location.
 *
 * Safe: expanding ring of TestSafeLocationPoint (center first).
 * NonVisible: prefers candidates with lower CountVisibleToPlayers; on total
 * failure writes (−1,−1,−1) and returns false (spawn aborts / retries).
 *
 * @file find-safe-location.ts
 */

const _probe = new THREE.Vector3();

export type FindSafeLocationOptions = {
  /** Search radius (summon/encounter use 20). */
  radius?: number;
  /** Step / personal_space; defaults to owner appearance.perspace. */
  personalSpace?: number;
  /** When true, require a clear direct line to the search center (walk-straight). */
  requireLineOfSight?: boolean;
  /** Creature for perspace / creature-blocking tests. */
  owner?: ModuleObject;
  /**
   * When true, party members do not block TestSafeLocationPoint.
   * Jump / safe-point checks leave this false by default.
   */
  allowPartyCreatures?: boolean;
};

/**
 * Snap Z to walkmesh (walk height approx via getWalkHeightAt).
 */
export function computeHeightAtPoint(
  area: ModuleArea | undefined,
  point: THREE.Vector3
): number {
  if(!area || !point) return point?.z ?? 0;
  const h = getWalkHeightAt(area, point);
  if(Number.isFinite(h)) return h;
  if(typeof area.getNearestWalkablePoint === 'function'){
    const nearest = area.getNearestWalkablePoint(point, 0.5);
    if(nearest) return nearest.z;
  }
  return point.z;
}

function tryCandidate(
  area: ModuleArea,
  center: THREE.Vector3,
  x: number,
  y: number,
  options: FindSafeLocationOptions,
  out: THREE.Vector3
): boolean {
  _probe.set(x, y, center.z);
  _probe.z = computeHeightAtPoint(area, _probe);

  if(!testSafeLocationPoint(area, _probe, options.owner, {
    allowPartyCreatures: options.allowPartyCreatures,
  })){
    return false;
  }

  if(options.requireLineOfSight){
    const line = testDirectLine(area, _probe, center, {
      personalSpace: options.personalSpace || getPathPersonalSpace(options.owner) || 0.35,
      owner: options.owner,
      checkCreatures: false,
    });
    // accepts Ok (1) or Creature (−3)
    if(line.code !== TestDirectLineCode.Ok && line.code !== TestDirectLineCode.Creature){
      return false;
    }
  }

  out.copy(_probe);
  return true;
}

function searchRing(
  area: ModuleArea,
  center: THREE.Vector3,
  r: number,
  step: number,
  options: FindSafeLocationOptions,
  out: THREE.Vector3
): boolean {
  const minX = center.x - r;
  const maxX = center.x + r;
  const minY = center.y - r;
  const maxY = center.y + r;

  for(let x = minX; x <= maxX + 1e-4; x += step){
    if(tryCandidate(area, center, x, minY, options, out)) return true;
    if(tryCandidate(area, center, x, maxY, options, out)) return true;
  }
  for(let y = minY + step; y < maxY - 1e-4; y += step){
    if(tryCandidate(area, center, minX, y, options, out)) return true;
    if(tryCandidate(area, center, maxX, y, options, out)) return true;
  }
  return false;
}

/**
 * Find a safe spawn/stand point near `center`.
 * @returns true and writes `out` on success; false leaves `out` as center (+height).
 */
export function findSafeLocation(
  area: ModuleArea | undefined,
  center: THREE.Vector3,
  out: THREE.Vector3,
  options: FindSafeLocationOptions = {}
): boolean {
  if(!area || !center || !out) return false;

  const radius = options.radius ?? 20;
  const step = Math.max(0.25, options.personalSpace ?? getPathPersonalSpace(options.owner) ?? 0.35);

  out.copy(center);
  out.z = computeHeightAtPoint(area, out);

  if(tryCandidate(area, center, center.x, center.y, options, out)){
    return true;
  }

  for(let r = step; r < radius; r += step){
    if(searchRing(area, center, r, step, options, out)){
      return true;
    }
  }

  return false;
}

/**
 * find non-visible location.
 * Prefers safe points with fewer player LOS hits via CountVisibleToPlayers
 * (30 m + eye Z); candidates within 30 of center need ClearLineOfSight from center.
 * On total failure sets out to (−1,−1,−1) and returns false.
 */
export function findNonVisibleLocation(
  area: ModuleArea | undefined,
  center: THREE.Vector3,
  out: THREE.Vector3,
  options: FindSafeLocationOptions = {}
): boolean {
  if(!area || !center || !out) return false;

  out.set(-1, -1, -1);
  const radius = options.radius ?? 20;
  const step = Math.max(0.25, options.personalSpace ?? getPathPersonalSpace(options.owner) ?? 0.35);
  const LOS_RANGE = 30.0;

  let bestScore = 0x60;
  const candidate = new THREE.Vector3();

  const consider = (x: number, y: number, requireCenterLos: boolean): boolean => {
    _probe.set(x, y, center.z);
    _probe.z = computeHeightAtPoint(area, _probe);
    if(!testSafeLocationPoint(area, _probe, options.owner, {
      allowPartyCreatures: options.allowPartyCreatures,
    })) return false;

    if(requireCenterLos){
      const dx = center.x - _probe.x;
      const dy = center.y - _probe.y;
      const dz = center.z - _probe.z;
      if(dx * dx + dy * dy + dz * dz >= LOS_RANGE * LOS_RANGE) return false;
      if(!clearLineOfSight(area, center, _probe)) return false;
    }

    const visible = countVisibleToPlayers(area, _probe, bestScore);
    if(visible < bestScore){
      bestScore = visible;
      candidate.copy(_probe);
    }
    return visible === 0;
  };

  // : try center first (no center→self LOS gate)
  if(consider(center.x, center.y, false) && bestScore === 0){
    out.copy(candidate);
    return true;
  }

  // Expanding rings — personal_space step, radius 20
  for(let r = step; r < radius; r += step){
    const minX = center.x - r;
    const maxX = center.x + r;
    const minY = center.y - r;
    const maxY = center.y + r;
    for(let x = minX; x <= maxX + 1e-4; x += step){
      if(consider(x, minY, true) && bestScore === 0){ out.copy(candidate); return true; }
      if(consider(x, maxY, true) && bestScore === 0){ out.copy(candidate); return true; }
    }
    for(let y = minY + step; y < maxY - 1e-4; y += step){
      if(consider(minX, y, true) && bestScore === 0){ out.copy(candidate); return true; }
      if(consider(maxX, y, true) && bestScore === 0){ out.copy(candidate); return true; }
    }
  }

  if(bestScore < 0x60){
    out.copy(candidate);
    return true;
  }
  return false;
}
