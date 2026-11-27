import type * as THREE from "three";
import type { GameObject } from "@engine/module/GameObject";
import type { AreaRoom } from "@engine/module/area/AreaRoom";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";

/**
 * Movement lifecycle types.
 *
 * PROPOSE (MovementIntent) → RESOLVE (policy) → COMMIT ONCE (MovementResult).
 * Intents and results are mutation-free; only MovementCommitter / teleport mutate.
 */

/** Who produced the movement request. */
export enum MovementSource {
  Drive = "Drive",
  Walk = "Walk",
  FollowLeader = "FollowLeader",
  PlayerControl = "PlayerControl",
  ForcePush = "ForcePush",
  Jump = "Jump",
  SoftSeparate = "SoftSeparate",
  FriendNudge = "FriendNudge",
  Cutscene = "Cutscene",
  ExternalForce = "ExternalForce",
  Teleport = "Teleport",
}

/**
 * Per-frame locomotion owner. Exactly one normal commit authority may apply
 * XY movement for a creature in a frame.
 */
export enum MovementAuthority {
  None = "None",
  PlayerControl = "PlayerControl",
  Drive = "Drive",
  Walk = "Walk",
  FollowLeader = "FollowLeader",
  ForcedMovement = "ForcedMovement",
  Jump = "Jump",
  SoftSeparate = "SoftSeparate",
  FriendNudge = "FriendNudge",
  Cutscene = "Cutscene",
  ExternalForce = "ExternalForce",
}

/**
 * Explicit semantic policies — not a flag bag.
 * Sequencing and retail behavior live in the matching policy module.
 */
export enum MovementPolicy {
  Drive = "Drive",
  Walk = "Walk",
  PlayerControl = "PlayerControl",
  ForcePush = "ForcePush",
  Jump = "Jump",
  FollowLeader = "FollowLeader",
  SoftSeparate = "SoftSeparate",
  FriendNudge = "FriendNudge",
  ExternalForce = "ExternalForce",
}

export enum MovementStatus {
  Moving = "Moving",
  Arrived = "Arrived",
  Blocked = "Blocked",
}

/**
 * Retail DriveUpdateLocation / WalkUpdateLocation numeric results.
 * Translate only at action compatibility boundaries.
 */
export enum DriveUpdateResultCompat {
  OK = 1,
  ARRIVED = 2,
  BLOCKED = 3,
}

export function movementStatusToDriveCompat(status: MovementStatus): DriveUpdateResultCompat {
  switch(status){
    case MovementStatus.Arrived: return DriveUpdateResultCompat.ARRIVED;
    case MovementStatus.Blocked: return DriveUpdateResultCompat.BLOCKED;
    default: return DriveUpdateResultCompat.OK;
  }
}

export function driveCompatToMovementStatus(code: number): MovementStatus {
  if(code === DriveUpdateResultCompat.ARRIVED) return MovementStatus.Arrived;
  if(code === DriveUpdateResultCompat.BLOCKED) return MovementStatus.Blocked;
  return MovementStatus.Moving;
}

export enum MovementHitKind {
  None = "None",
  Walkmesh = "Walkmesh",
  Static = "Static",
  Door = "Door",
  Placeable = "Placeable",
  Creature = "Creature",
  Transition = "Transition",
}

export interface MovementHit {
  kind: MovementHitKind;
  object?: GameObject;
  position?: THREE.Vector3;
  normal?: THREE.Vector3;
  distance?: number;
  /** Blocking creature id when kind is Creature. */
  creatureId?: number;
  /** Static/door/placeable id when available. */
  objectId?: number;
}

/**
 * Mutation-free movement request. Sources produce intents only.
 */
export interface MovementIntent {
  source: MovementSource;
  origin: THREE.Vector3;
  /**
   * Requested displacement for this frame.
   * Does not imply the entire displacement will be accepted.
   */
  desiredDisplacement: THREE.Vector3;
  actorRadius: number;
  actorHeight: number;
  policy: MovementPolicy;
  /** Optional absolute destination (Drive/Walk one-point target). */
  destination?: THREE.Vector3;
  delta?: number;
}

/**
 * Descriptive resolve outcome. Returning this must not mutate the creature.
 */
export interface MovementResult {
  source: MovementSource;
  status: MovementStatus;
  origin: THREE.Vector3;
  finalPosition: THREE.Vector3;
  acceptedDisplacement: THREE.Vector3;
  actualDistance: number;
  hit?: MovementHit;
  room?: AreaRoom;
  groundFace?: OdysseyFace3;
  crossedTransition?: GameObject;
  /** When true, committer should fire linked-door OnClicked and not apply XY. */
  blockAfterDoorSignal?: boolean;
  /** Discrete path-block increment for Walk/Drive stuck bookkeeping. */
  incrementBlockingTimer?: boolean;
}

export interface CreatureMovementState {
  authority: MovementAuthority;
  blockingObject?: GameObject;
  lastBlockingObject?: GameObject;
  /** Seconds of continuous contact — formerly collisionTimer increments from CM. */
  collisionTime: number;
  lastCommitFrame: number;
  actualVelocity: THREE.Vector3;
  /** Dev: last commit source for dual-commit diagnostics. */
  lastCommitSource?: MovementSource;
}
