/**
 * Force Jump — destination math + creature loco path install (loco 5/6).
 *
 * @file force-jump-loco.ts
 */

import * as THREE from "three";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { ComputedPath } from "@/engine/pathfinding/ComputedPath";
import { getWalkHeightAt } from "@/engine/pathfinding/walk-line-clear";
import {
  CreatureLocoState,
  setCreatureLocoState,
} from "@/engine/pathfinding/creature-loco";
import { tickForcePushLoco } from "@/engine/pathfinding/force-push-loco";

const _dir = new THREE.Vector3();
const _dest = new THREE.Vector3();
const _origin = new THREE.Vector3();
const _end = new THREE.Vector3();

export type ForceJumpDestination = {
  dest: THREE.Vector3;
  dir: THREE.Vector3;
  ok: boolean;
};

/**
 * dest = target.pos − normalize(target − jumper) × desiredRange.
 * dir = normalize(target − jumper) (outward from jumper toward target).
 */
export function computeForceJumpDestination(
  jumperPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  desiredRange: number
): ForceJumpDestination {
  _dir.set(
    targetPos.x - jumperPos.x,
    targetPos.y - jumperPos.y,
    targetPos.z - jumperPos.z
  );
  const len = _dir.length();
  if(len < 1e-6){
    return {
      dest: targetPos.clone(),
      dir: new THREE.Vector3(0, 1, 0),
      ok: false,
    };
  }
  _dir.multiplyScalar(1 / len);
  _dest.set(
    targetPos.x - _dir.x * desiredRange,
    targetPos.y - _dir.y * desiredRange,
    targetPos.z - _dir.z * desiredRange
  );
  return {
    dest: _dest.clone(),
    dir: _dir.clone(),
    ok: true,
  };
}

/**
 * Target shove end = target.pos + dir × desiredRange (outward along jump dir).
 */
export function computeForceJumpTargetShoveDestination(
  targetPos: THREE.Vector3,
  dir: THREE.Vector3,
  desiredRange: number
): THREE.Vector3 {
  return new THREE.Vector3(
    targetPos.x + dir.x * desiredRange,
    targetPos.y + dir.y * desiredRange,
    targetPos.z + dir.z * desiredRange
  );
}

/**
 * Install 2-point XY path and Force Jump loco (5 jumper / 6 shoved target).
 * Seeds one creature loco frame with delta 0 (same as Force Push).
 */
export function installForceJumpPath(
  creature: ModuleCreature,
  start: THREE.Vector3,
  end: THREE.Vector3,
  loco: CreatureLocoState.ForceJump | CreatureLocoState.ForceJumpTarget
): void {
  _origin.copy(start);
  _end.copy(end);
  const z0 = getWalkHeightAt(creature.area, _origin);
  const z1 = getWalkHeightAt(creature.area, _end);
  if(Number.isFinite(z0)) _origin.z = z0;
  if(Number.isFinite(z1)) _end.z = z1;

  creature.setComputedPath?.(ComputedPath.FromVector3List([
    _origin.clone(),
    _end.clone(),
  ]));
  setCreatureLocoState(creature, loco);
  creature.forcePushDistanceTraveled = 0;
  creature.forcePushArrived = false;
  creature.forcePushArriveElapsed = 0;

  const dx = _end.x - _origin.x;
  const dy = _end.y - _origin.y;
  if(dx * dx + dy * dy < 1e-8){
    creature.forcePushArrived = true;
  }

  tickForcePushLoco(creature, 0);
}
