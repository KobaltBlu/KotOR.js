import * as THREE from "three";
import { ActionType } from "@core/enums/actions/ActionType";
import { ModuleDoorOpenState } from "@core/enums/module/ModuleDoorOpenState";
import type { Area } from "@engine/module/Area";
import type { Door } from "@engine/module/Door";

/**
 * Doors that are about to stop blocking a walk.
 *
 * Retail plans a move over several frames, so a door told to open in the same
 * script as the move (AssignCommand(oDoor, ActionOpenDoor(oDoor)) followed by
 * ActionMoveToObject) is open before planning gives up. Our plot resolves in
 * one tick, so a mover uses this to wait for such a door instead of failing.
 *
 * @file door-opening.ts
 */

/** How far from the straight walk line a door can sit and still count as on it. */
const DOOR_LINE_PAD = 2.5;

const _seg = new THREE.Line3();
const _closest = new THREE.Vector3();

/** True when a closed door has an open queued for itself or is mid-open. */
export function isDoorAboutToOpen(door: Door): boolean {
  if(!door || door.isOpen()) return false;
  const pending = door.alsoOpenState;
  if(pending === ModuleDoorOpenState.OPEN1 || pending === ModuleDoorOpenState.OPEN2){
    return true;
  }
  const queue = door.actionQueue;
  if(!queue) return false;
  for(let i = 0, len = queue.length; i < len; i++){
    const action = queue[i];
    if(action?.type !== ActionType.ActionOpenDoor) continue;
    const target = action.getParameter?.(0) ?? action.target;
    if(!target || target === door) return true;
  }
  return false;
}

/** The first door near the straight line from → to that is about to open. */
export function findOpeningDoorOnLine(
  area: Area | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3,
  pad: number = DOOR_LINE_PAD
): Door | undefined {
  const doors = area?.doors;
  if(!doors?.length) return undefined;
  _seg.start.set(from.x, from.y, 0);
  _seg.end.set(to.x, to.y, 0);
  const padSq = pad * pad;
  for(let i = 0, len = doors.length; i < len; i++){
    const door = doors[i];
    if(!isDoorAboutToOpen(door)) continue;
    _seg.closestPointToPoint(
      _closest.set(door.position.x, door.position.y, 0),
      true,
      _closest
    );
    const dx = _closest.x - door.position.x;
    const dy = _closest.y - door.position.y;
    if(dx * dx + dy * dy <= padSq) return door;
  }
  return undefined;
}
