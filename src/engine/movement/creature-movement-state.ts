import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import * as THREE from "three";
import {
  MovementAuthority,
  MovementSource,
  type CreatureMovementState,
} from "@engine/movement/types";

export type { CreatureMovementState } from "@engine/movement/types";

/**
 * Per-creature movement/contact state + frame ownership helpers.
 */

let _globalFrameId = 0;

/** Advance once per engine tick (AIScheduler / Module.tick). */
export function advanceMovementFrame(): number {
  _globalFrameId = (_globalFrameId + 1) | 0;
  if(_globalFrameId <= 0) _globalFrameId = 1;
  return _globalFrameId;
}

export function getMovementFrameId(): number {
  return _globalFrameId;
}

export function createCreatureMovementState(): CreatureMovementState {
  return {
    authority: MovementAuthority.None,
    blockingObject: undefined,
    lastBlockingObject: undefined,
    collisionTime: 0,
    lastCommitFrame: 0,
    actualVelocity: new THREE.Vector3(),
    lastCommitSource: undefined,
  };
}

export function ensureMovementState(object: GameObject): CreatureMovementState {
  const anyObj = object as GameObject & { movementState?: CreatureMovementState };
  if(!anyObj.movementState){
    anyObj.movementState = createCreatureMovementState();
  }
  return anyObj.movementState;
}

export function setMovementAuthority(
  creature: Creature,
  authority: MovementAuthority
): void {
  const state = ensureMovementState(creature);
  state.authority = authority;
}

export function clearMovementAuthority(creature: Creature): void {
  const state = ensureMovementState(creature);
  state.authority = MovementAuthority.None;
}

/**
 * Map authority to the MovementSource stamped on results/commits.
 */
export function authorityToSource(authority: MovementAuthority): MovementSource {
  switch(authority){
    case MovementAuthority.PlayerControl: return MovementSource.PlayerControl;
    case MovementAuthority.Drive: return MovementSource.Drive;
    case MovementAuthority.Walk: return MovementSource.Walk;
    case MovementAuthority.FollowLeader: return MovementSource.FollowLeader;
    case MovementAuthority.ForcedMovement: return MovementSource.ForcePush;
    case MovementAuthority.Jump: return MovementSource.Jump;
    case MovementAuthority.SoftSeparate: return MovementSource.SoftSeparate;
    case MovementAuthority.FriendNudge: return MovementSource.FriendNudge;
    case MovementAuthority.Cutscene: return MovementSource.Cutscene;
    case MovementAuthority.ExternalForce: return MovementSource.ExternalForce;
    default: return MovementSource.Walk;
  }
}
