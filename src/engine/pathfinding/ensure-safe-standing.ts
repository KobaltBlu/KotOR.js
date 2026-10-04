import * as THREE from "three";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import { getPathPersonalSpace } from "@engine/combat/attack-range";
import { isSafeWalkPoint } from "@engine/pathfinding/safe-walk-point";
import { findOpenWalkLocation } from "@engine/pathfinding/open-walk-location";
import { teleportObject } from "@engine/movement/teleport";

/**
 * Recover a creature that is on a walk face but inside the personal-space
 * wall buffer (walkable feet, unsafe capsule). Used when AI MoveTo ends on
 * a PreferWalkable lip that WASD cannot leave.
 *
 * @returns true if the creature was teleported to a safe stand.
 */

const _safeStand = new THREE.Vector3();

export function ensureSafeStandingPosition(creature: ModuleCreature): boolean {
  const area = creature?.area;
  if(!area || !creature.position){
    return false;
  }
  if(isSafeWalkPoint(area, creature.position, creature)){
    return false;
  }

  const perspace = getPathPersonalSpace(creature) || 0.5;
  const radius = Math.max(2, perspace * 2);
  if(
    !findOpenWalkLocation(area, creature.position, _safeStand, {
      radius,
      personalSpace: perspace,
      owner: creature,
    })
  ){
    return false;
  }

  teleportObject(creature, _safeStand, 0, 0, {
    caller: "ensureSafeStandingPosition",
  });
  return true;
}
