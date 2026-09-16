import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { isStaticWalkClearDetailed } from "@/engine/pathfinding/static-walk-blockers";
import { isCreatureCapsuleClear } from "@/engine/pathfinding/creature-capsule-clear";
import { getRoomAtPoint } from "@/engine/pathfinding/walk-line-clear";

/**
 * Approximate isSafeWalkPoint (safe walk location helper).
 *
 * Tiny ±0.01 XY / ±0.1 Z probe through room static walk blockers (detailed) +
 * creature capsule clear (skipBumpable=0). Party creatures are not skipped;
 * default allowPartyCreatures=false matches that.
 *
 * @file safe-walk-point.ts
 */

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export type SafeWalkPointOptions = {
  /** When true, party members do not block (follow/teleport paths). Jump default false. */
  allowPartyCreatures?: boolean;
};

/**
 * True if `point` is a safe standing location for `owner`.
 */
export function isSafeWalkPoint(
  area: ModuleArea | undefined,
  point: THREE.Vector3,
  owner?: ModuleObject,
  options: SafeWalkPointOptions = {}
): boolean {
  if(!area || !point) return false;

  // Must be in a room (GetRoom)
  if(!getRoomAtPoint(area, point)){
    // Fallback: walkable face check when room lookup fails
    if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(point)){
      return false;
    }
  }

  const perspace = getPathPersonalSpace(owner) || 0.5;
  _a.set(point.x - 0.01, point.y - 0.01, point.z);
  _b.set(point.x + 0.01, point.y + 0.01, point.z);

  const polys = isStaticWalkClearDetailed(area, _a, _b, {
    personalSpace: perspace,
  });
  if(!polys.clear) return false;

  const creatures = isCreatureCapsuleClear(area, _a, _b, {
    owner,
    allowPartyCreatures: options.allowPartyCreatures === true,
    // Occupied cells hard-block (no start soft-clear).
    softClearStartOverlap: false,
  });
  return creatures.clear;
}
