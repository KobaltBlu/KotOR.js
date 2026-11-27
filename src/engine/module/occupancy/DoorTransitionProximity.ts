import type { Door } from "@engine/module/Door";
import type { GameObject } from "@engine/module/GameObject";
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from "@engine/runtime/context";

const OUTER_PROXIMITY = 10;
const TRANSITION_PROXIMITY = 5;
const CLOSED_DOOR_PROXIMITY = 0.5;

export class DoorTransitionProximity {
  static update(
    door: Door,
    runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ): void {
    const leader = runtime.getParty?.()?.[0];
    if(!leader) return;

    const transitionMenu = runtime.getAreaTransitionController?.();
    if(!transitionMenu) return;
    const outerDistance = leader.position.distanceTo(door.position);
    if(outerDistance >= OUTER_PROXIMITY){
      transitionMenu.unsetTransitionObject(door);
      this.exitIfNeeded(door, leader);
      return;
    }

    door.testTransitionLine(leader);
    const linkedOpen = !!(door.getLinkedToModule() && door.isOpen());
    if(door.transitionDistance < TRANSITION_PROXIMITY){
      if(linkedOpen){
        transitionMenu.setTransitionObject(door);
      }
    }else{
      transitionMenu.unsetTransitionObject(door);
    }

    const enterDistance = linkedOpen
      ? TRANSITION_PROXIMITY
      : CLOSED_DOOR_PROXIMITY;
    if(door.transitionDistance < enterDistance){
      if(leader.lastDoorEntered !== door){
        leader.lastDoorEntered = door;
        door.onEnter(leader);
      }
      return;
    }

    this.exitIfNeeded(door, leader);
  }

  private static exitIfNeeded(door: Door, leader: GameObject): void {
    if(leader.lastDoorEntered !== door) return;
    leader.lastDoorExited = door;
    door.onExit(leader);
  }
}
