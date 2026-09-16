import * as THREE from "three";
import { getCreaturePersonalSpace, getPathPersonalSpace } from "@/combat/attack-range";
import { getNearestActionPoint } from "@/combat/nearest-action-point";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { Utility } from "@/utility/Utility";

import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isPlaceable } from "@/module/guards/isPlaceable";
import { isTrigger } from "@/module/guards/isTrigger";

/**
 * use-range helpers (GetUseRange / GetIsInUseRange).
 *
 * Creature targets: cre_personal_space(self) + cre_personal_space(target) + 0.3
 * Door / placeable: personal_space + 0.75 (+5 for corpse placeables) at nearest action point
 * Trigger: personal_space + 0.5
 * GetIsInUseRange adds +0.1 slack, ClearLineOfSight to the use point (not object origin),
 * then compares 2D distance² to that point.
 */

export type UseRangeResult = {
  ok: boolean;
  point: THREE.Vector3;
  range: number;
};

export function getUseRange(
  owner: ModuleCreature,
  target: ModuleObject,
  _attackDoorMode: boolean = false
): UseRangeResult {
  let range = getPathPersonalSpace(owner);

  if(isCreature(target)){
    range = getCreaturePersonalSpace(owner) + getCreaturePersonalSpace(target) + 0.3;
    return {
      ok: true,
      point: new THREE.Vector3(target.position.x, target.position.y, target.position.z),
      range,
    };
  }

  if(isTrigger(target)){
    range = range + 0.5;
    return {
      ok: true,
      point: new THREE.Vector3(target.position.x, target.position.y, target.position.z),
      range,
    };
  }

  if(isDoor(target)){
    range = range + 0.75;
    return {
      ok: true,
      point: getNearestActionPoint(target, owner.position, owner),
      range,
    };
  }

  if(isPlaceable(target)){
    range = range + 0.75;
    if(target.isCorpse){
      range = range + 5.0;
    }
    return {
      ok: true,
      point: getNearestActionPoint(target, owner.position, owner),
      range,
    };
  }

  // Item / default: personal space only at object position
  return {
    ok: true,
    point: new THREE.Vector3(target.position.x, target.position.y, target.position.z),
    range,
  };
}

/**
 * GetIsInUseRange:
 * GetUseRange → ClearLineOfSight(eye→usePoint) → dist² ≤ (useRange + extra + 0.1)².
 * Doors/placeables use the nearest action point, not object origin.
 */
export function isInUseRange(
  owner: ModuleCreature,
  target: ModuleObject,
  extraRange: number = 0.0
): boolean {
  if(!owner || !target){
    return false;
  }
  if(owner.area && target.area && owner.area !== target.area){
    return false;
  }

  const use = getUseRange(owner, target, false);
  if(!use.ok){
    return false;
  }

  const allow = use.range + extraRange + 0.1;
  const dist = Utility.Distance2D(owner.position, use.point);
  if(dist * dist > allow * allow){
    return false;
  }

  // Already on / at the use point — no meaningful LOS segment (still calls
  // ClearLineOfSight, but a zero-length ray is undefined in three.js).
  if(dist < 0.05){
    return true;
  }

  // ClearLineOfSight to use point, excluding source + target ids.
  // Skip room walkmesh face tests — those false-block door/placeable use.
  return owner.hasLineOfSight(target, Math.max(allow + 2.0, dist + 2.0), {
    ignorePerceptionRange: true,
    eyeHeight: 1.5,
    ignoreObject: target,
    toPosition: use.point,
    skipRoomWalkmesh: true,
  });
}

/**
 * Front-queue MoveToPoint into use range. Returns true if a move was queued.
 */
export function queueMoveIntoUseRange(
  owner: ModuleCreature,
  target: ModuleObject,
  groupId: number = -1,
  options: {
    extraRange?: number;
    run?: boolean;
    timeout?: number;
  } = {}
): boolean {
  if(isInUseRange(owner, target, options.extraRange ?? 0)){
    return false;
  }

  const use = getUseRange(owner, target, false);
  // use.point is already PositionWalkable-gated; do not re-snap with owner
  // perspace — that shoved doorway destinations deep into the room.
  const dest = use.point;

  const move = new GameState.ActionFactory.ActionMoveToPoint(undefined, groupId);
  move.setParameter(0, ActionParameterType.FLOAT, dest.x);
  move.setParameter(1, ActionParameterType.FLOAT, dest.y);
  move.setParameter(2, ActionParameterType.FLOAT, dest.z);
  move.setParameter(3, ActionParameterType.DWORD, target.area?.id ?? owner.area?.id ?? 0);
  move.setParameter(4, ActionParameterType.DWORD, target.id);
  move.setParameter(5, ActionParameterType.INT, options.run === false ? 0 : 1);
  // Move arrive = useRange + extra (GetIsInUseRange adds another +0.1 slack)
  move.setParameter(6, ActionParameterType.FLOAT, use.range + (options.extraRange ?? 0));
  move.setParameter(7, ActionParameterType.INT, 0);
  move.setParameter(8, ActionParameterType.FLOAT, options.timeout ?? 30.0);
  owner.actionQueue.addFront(move);
  return true;
}
