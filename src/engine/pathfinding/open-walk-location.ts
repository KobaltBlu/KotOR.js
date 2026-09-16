import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { isSafeWalkPoint } from "@/engine/pathfinding/safe-walk-point";
import {
  getWalkHeightAt,
  hasWalkLineClear,
  WalkLineHitCode,
} from "@/engine/pathfinding/walk-line-clear";
import { hasVisualLos } from "@/engine/pathfinding/visual-los";
import { countPlayerVisibility } from "@/engine/pathfinding/count-player-visibility";

/**
 * Find a walkable stand/spawn point near a center, or a point less visible
 * to players for stealthy placement.
 *
 * Safe search: expanding rings of isSafeWalkPoint (center first).
 * Non-visible: prefers candidates with lower countPlayerVisibility; on total
 * failure writes (−1,−1,−1) and returns false (spawn aborts / retries).
 */

const _probe = new THREE.Vector3();

/** Sentinel before any candidate has scored for player visibility. */
const NO_VISIBLE_CANDIDATE = 0x60;

export type OpenWalkLocationOptions = {
  /** Search radius (summon/encounter use 20). */
  radius?: number;
  /** Step / personal_space; defaults to owner appearance.perspace. */
  personalSpace?: number;
  /** When true, require a clear direct line to the search center (walk-straight). */
  requireLineOfSight?: boolean;
  /** Creature for perspace / creature-blocking tests. */
  owner?: ModuleObject;
  /**
   * When true, party members do not block isSafeWalkPoint.
   * Jump / safe-point checks leave this false by default.
   */
  allowPartyCreatures?: boolean;
};

/**
 * Snap Z to walkmesh height at the point.
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
  options: OpenWalkLocationOptions,
  out: THREE.Vector3
): boolean {
  _probe.set(x, y, center.z);
  _probe.z = computeHeightAtPoint(area, _probe);

  if(!isSafeWalkPoint(area, _probe, options.owner, {
    allowPartyCreatures: options.allowPartyCreatures,
  })){
    return false;
  }

  if(options.requireLineOfSight){
    const line = hasWalkLineClear(area, _probe, center, {
      personalSpace: options.personalSpace || getPathPersonalSpace(options.owner) || 0.35,
      owner: options.owner,
      checkCreatures: false,
    });
    // Accept clear line or creature-only block toward center
    if(line.code !== WalkLineHitCode.Ok && line.code !== WalkLineHitCode.Creature){
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
  options: OpenWalkLocationOptions,
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
export function findOpenWalkLocation(
  area: ModuleArea | undefined,
  center: THREE.Vector3,
  out: THREE.Vector3,
  options: OpenWalkLocationOptions = {}
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
 * Prefer a safe point with fewer player LOS hits (30 m + eye Z).
 * Candidates within 30 of center also need hasVisualLos from center.
 * On total failure sets out to (−1,−1,−1) and returns false.
 */
export function findHiddenWalkLocation(
  area: ModuleArea | undefined,
  center: THREE.Vector3,
  out: THREE.Vector3,
  options: OpenWalkLocationOptions = {}
): boolean {
  if(!area || !center || !out) return false;

  out.set(-1, -1, -1);
  const radius = options.radius ?? 20;
  const step = Math.max(0.25, options.personalSpace ?? getPathPersonalSpace(options.owner) ?? 0.35);
  const LOS_RANGE = 30.0;

  let bestScore = NO_VISIBLE_CANDIDATE;
  const candidate = new THREE.Vector3();

  const consider = (x: number, y: number, requireCenterLos: boolean): boolean => {
    _probe.set(x, y, center.z);
    _probe.z = computeHeightAtPoint(area, _probe);
    if(!isSafeWalkPoint(area, _probe, options.owner, {
      allowPartyCreatures: options.allowPartyCreatures,
    })) return false;

    if(requireCenterLos){
      const dx = center.x - _probe.x;
      const dy = center.y - _probe.y;
      const dz = center.z - _probe.z;
      if(dx * dx + dy * dy + dz * dz >= LOS_RANGE * LOS_RANGE) return false;
      if(!hasVisualLos(area, center, _probe)) return false;
    }

    const visible = countPlayerVisibility(area, _probe, bestScore);
    if(visible < bestScore){
      bestScore = visible;
      candidate.copy(_probe);
    }
    return visible === 0;
  };

  // Try center first (no center→self LOS gate)
  if(consider(center.x, center.y, false) && bestScore === 0){
    out.copy(candidate);
    return true;
  }

  // Expanding rings — personal-space step out to radius
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

  if(bestScore < NO_VISIBLE_CANDIDATE){
    out.copy(candidate);
    return true;
  }
  return false;
}
