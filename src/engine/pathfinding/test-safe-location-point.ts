import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { noNonWalkPolysDetailed } from "@/engine/pathfinding/no-non-walk-polys";
import { noCreaturesOnLine } from "@/engine/pathfinding/no-creatures-on-line";
import { getRoomAtPoint } from "@/engine/pathfinding/test-direct-line";

/**
 * Approximate TestSafeLocationPoint.
 *
 * : tiny ±0.01 XY / ±0.1 Z probe through room NoNonWalk + Detailed +
 * NoCreaturesOnLine (param skipBumpable=0). Retail does not skip party
 * creatures; default allowPartyCreatures=false matches that.
 *
 * @file test-safe-location-point.ts
 */

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

export type TestSafeLocationPointOptions = {
  /** When true, party members do not block (follow/teleport paths). Retail Jump default false. */
  allowPartyCreatures?: boolean;
};

/**
 * True if `point` is a safe standing location for `owner`.
 */
export function testSafeLocationPoint(
  area: ModuleArea | undefined,
  point: THREE.Vector3,
  owner?: ModuleObject,
  options: TestSafeLocationPointOptions = {}
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

  const polys = noNonWalkPolysDetailed(area, _a, _b, {
    personalSpace: perspace,
  });
  if(!polys.clear) return false;

  const creatures = noCreaturesOnLine(area, _a, _b, {
    owner,
    allowPartyCreatures: options.allowPartyCreatures === true,
    // Retail TestSafeLocationPoint: occupied cells hard-block (no start soft-clear).
    softClearStartOverlap: false,
  });
  return creatures.clear;
}
