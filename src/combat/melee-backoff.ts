import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import {
  testDirectLine,
  TestDirectLineCode,
} from "@/engine/pathfinding/test-direct-line";
import * as THREE from "three";

/**
 * Retail AIActionPhysicalAttacks too-close branch @ 005bbbf0 —
 * Ideal back-off at DesiredAttackRange, then CServerExoApp::TestDirectLine
 * clip via CWalkHitInfo clear point when the line is blocked.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file melee-backoff.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

const _ideal = new THREE.Vector3();

export type MeleeBackoffResult = {
  /** Walk destination for MoveToPoint. */
  position: THREE.Vector3;
  /**
   * Retail updates DesiredAttackRange to |target − clearPoint| when the
   * TestDirectLine clip fires — callers may use this as arrive polish.
   */
  clippedDesired: number;
  /** True when the ideal point was reachable without clipping. */
  clear: boolean;
};

/**
 * Ideal stand point at `desired` meters from `target` on the attacker side
 * of the target (retail: target − normalize(towardTarget) * desired).
 */
export function getMeleeBackoffIdeal(
  attacker: ModuleCreature,
  target: ModuleObject,
  desired: number
): THREE.Vector3 {
  const dx = attacker.position.x - target.position.x;
  const dy = attacker.position.y - target.position.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1.0;
  return new THREE.Vector3(
    target.position.x + (dx / len) * desired,
    target.position.y + (dy / len) * desired,
    attacker.position.z
  );
}

/**
 * Point at `desired` meters from `target` along the attacker←target axis,
 * clipped by TestDirectLine (retail CWalkHitInfo when result ≠ 1).
 */
export function getMeleeBackoffPosition(
  attacker: ModuleCreature,
  target: ModuleObject,
  desired: number
): THREE.Vector3 {
  return resolveMeleeBackoff(attacker, target, desired).position;
}

/**
 * Full retail too-close resolve — ideal + TestDirectLine + clipped desired.
 */
export function resolveMeleeBackoff(
  attacker: ModuleCreature,
  target: ModuleObject,
  desired: number
): MeleeBackoffResult {
  const ideal = getMeleeBackoffIdeal(attacker, target, desired);
  _ideal.copy(ideal);

  const area = attacker.area;
  if(!area){
    return { position: ideal, clippedDesired: desired, clear: true };
  }

  const perspace = getPathPersonalSpace(attacker);
  const ignoreIds: number[] = [];
  if(attacker.id != null) ignoreIds.push(attacker.id);
  if(target.id != null) ignoreIds.push(target.id);

  // Retail CServerExoApp::TestDirectLine(..., personal_space, height, 1, &CWalkHitInfo)
  const hit = testDirectLine(area, attacker.position, ideal, {
    owner: attacker,
    personalSpace: perspace,
    checkCreatures: true,
    ignoreCreatureIds: ignoreIds,
    collectHitInfo: true,
  });

  if(hit.ok || hit.code === TestDirectLineCode.Ok){
    return { position: ideal, clippedDesired: desired, clear: true };
  }

  // Retail: VStack_90 = CWalkHitInfo clear point; desired = |target − clear|
  let clear = hit.clearPoint.clone();
  if(typeof area.getNearestWalkablePoint === 'function'){
    clear = area.getNearestWalkablePoint(clear, perspace);
  }

  const clippedDesired = Math.hypot(
    target.position.x - clear.x,
    target.position.y - clear.y
  );

  return {
    position: clear,
    clippedDesired: clippedDesired > 0 ? clippedDesired : desired,
    clear: false,
  };
}
