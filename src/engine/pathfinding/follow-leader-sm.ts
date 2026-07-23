import * as THREE from "three";
import { GameState } from "@/GameState";
import { getPathPersonalSpace } from "@/combat/attack-range";
import {
  FOLLOW_COMFORT,
  FOLLOW_STUCK_ITERATIONS,
  FollowLeaderState,
  isFollowMovingState,
  resolveFollowEntryState,
  shouldFollowRun,
  type FollowLeaderRuntime,
} from "@/engine/pathfinding/follow-leader";
import { getFollowRateScale } from "@/engine/pathfinding/locomotion";
import { partyFollowPath } from "@/engine/pathfinding/party-follow-path";
import { walkUpdateLocation } from "@/engine/pathfinding/walk-update-location";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import { Utility } from "@/utility/Utility";

/** Repath when live follow goal drifts this far from path end. */
export const FOLLOW_PATH_REPATH_DRIFT = 1.25;
/** WaitDest holds this many frames before advancing (retail WaitDest stubs). */
const WAIT_DEST_FRAMES = 2;

export type FollowStepResult = {
  /** Spend remaining inner-loop budget (retail iVar14 == 1). */
  continueInner: boolean;
  /** Request JumpToPoint / teleport this frame. */
  teleport: boolean;
};

const _goal = new THREE.Vector3();
const _tmp = new THREE.Vector3();

export type FollowAvoidanceFn = (
  delta: number,
  offset: THREE.Vector3,
  faceTarget?: ModuleCreature
) => void;

/**
 * Drive one FollowLeader SM iteration (retail do/while switch @ 0051c360).
 */
export function stepFollowLeaderState(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  leader: ModuleCreature,
  offset: THREE.Vector3,
  delta: number,
  onAvoidance?: FollowAvoidanceFn
): FollowStepResult {
  const distLeader = Utility.Distance2D(owner.position, leader.position);
  const distOffset = Utility.Distance2D(owner.position, offset);

  runtime.goalX = offset.x;
  runtime.goalY = offset.y;
  runtime.goalZ = offset.z;

  // Entry override: far/stuck → Teleport; leaving comfort → FindPath
  const entry = resolveFollowEntryState(
    distLeader,
    distOffset,
    runtime.state,
    runtime.stuckTimer
  );
  if(entry === FollowLeaderState.Teleport){
    runtime.state = FollowLeaderState.Teleport;
  }else if(
    entry === FollowLeaderState.FindPath &&
    runtime.state === FollowLeaderState.Offset
  ){
    runtime.state = FollowLeaderState.FindPath;
  }

  runtime.stuckCounter++;
  if(runtime.stuckCounter > FOLLOW_STUCK_ITERATIONS){
    runtime.state = FollowLeaderState.Reset;
    runtime.stuckCounter = 0;
  }

  switch(runtime.state){
    case FollowLeaderState.Reset:
      runtime.state = FollowLeaderState.WaitingForPath;
      runtime.waitFrames = 0;
      return { continueInner: true, teleport: false };

    case FollowLeaderState.FindPath:
      return handleFindPath(runtime, owner, offset);

    case FollowLeaderState.WaitingForPath:
      return handleWaitingForPath(runtime, owner, leader, offset, distLeader, distOffset);

    case FollowLeaderState.OffsetWaitDest:
    case FollowLeaderState.PathWaitDest:
    case FollowLeaderState.ToOffsetWaitDest:
    case FollowLeaderState.ToPathWaitDest:
      return handleWaitDest(runtime);

    case FollowLeaderState.Offset:
      return handleOffset(runtime, owner, distOffset);

    case FollowLeaderState.MovingToPath:
    case FollowLeaderState.FollowingPath:
    case FollowLeaderState.MovingToOffset:
      return handleMoving(
        runtime, owner, leader, offset, delta, distLeader, distOffset, onAvoidance
      );

    case FollowLeaderState.Teleport:
      runtime.stuckTimer = 0;
      runtime.stuckCounter = 0;
      return { continueInner: false, teleport: true };

    default:
      runtime.state = FollowLeaderState.WaitingForPath;
      return { continueInner: true, teleport: false };
  }
}

function handleFindPath(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  offset: THREE.Vector3
): FollowStepResult {
  const ok = ensurePathToOffset(owner, offset);
  runtime.pathPointX = offset.x;
  runtime.pathPointY = offset.y;
  runtime.pathPointZ = offset.z;
  runtime.waitFrames = 0;
  // Retail: safe lateral → OffsetWaitDest (6); else PathWaitDest (7)
  runtime.state = ok
    ? FollowLeaderState.OffsetWaitDest
    : FollowLeaderState.PathWaitDest;
  return { continueInner: false, teleport: false };
}

function handleWaitingForPath(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  leader: ModuleCreature,
  offset: THREE.Vector3,
  distLeader: number,
  distOffset: number
): FollowStepResult {
  void leader;
  // Retail: ring count > 4 → pick back point; else hold briefly
  if(distOffset <= FOLLOW_COMFORT){
    runtime.state = FollowLeaderState.Offset;
    runtime.stuckTimer = 0;
    return { continueInner: false, teleport: false };
  }

  if(partyFollowPath.count < 3 && distOffset < FOLLOW_COMFORT + 0.5){
    return { continueInner: false, teleport: false };
  }

  if(distOffset >= FOLLOW_COMFORT || distLeader >= FOLLOW_COMFORT){
    const los = ensurePathToOffset(owner, offset);
    runtime.state = los
      ? FollowLeaderState.MovingToOffset
      : FollowLeaderState.FindPath;
    return { continueInner: true, teleport: false };
  }

  return { continueInner: false, teleport: false };
}

function handleWaitDest(runtime: FollowLeaderRuntime): FollowStepResult {
  // Retail WaitDest clears field11_0x44 and returns 2
  runtime.stuckCounter = 0;
  runtime.waitFrames++;
  if(runtime.waitFrames < WAIT_DEST_FRAMES){
    return { continueInner: false, teleport: false };
  }
  runtime.waitFrames = 0;
  if(
    runtime.state === FollowLeaderState.OffsetWaitDest ||
    runtime.state === FollowLeaderState.ToOffsetWaitDest
  ){
    runtime.state = FollowLeaderState.MovingToOffset;
  }else{
    runtime.state = FollowLeaderState.MovingToPath;
  }
  return { continueInner: true, teleport: false };
}

function handleOffset(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  distOffset: number
): FollowStepResult {
  runtime.stuckTimer = 0;
  runtime.lastSampleX = owner.position.x;
  runtime.lastSampleY = owner.position.y;
  runtime.lastSampleZ = owner.position.z;

  if(distOffset > FOLLOW_COMFORT + 0.25){
    runtime.state = FollowLeaderState.MovingToPath;
    return { continueInner: true, teleport: false };
  }
  return { continueInner: false, teleport: false };
}

function handleMoving(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  leader: ModuleCreature,
  offset: THREE.Vector3,
  delta: number,
  distLeader: number,
  distOffset: number,
  onAvoidance?: FollowAvoidanceFn
): FollowStepResult {
  if(distOffset > FOLLOW_COMFORT + 0.25){
    runtime.stuckTimer += delta;
  }else{
    runtime.stuckTimer = 0;
    runtime.state = FollowLeaderState.Offset;
    return { continueInner: false, teleport: false };
  }

  // Promote MovingToPath → FollowingPath once path exists
  if(runtime.state === FollowLeaderState.MovingToPath){
    const path = owner.getComputedPath();
    if(path?.points?.length){
      runtime.state = FollowLeaderState.FollowingPath;
    }
  }

  driveTowardOffset(
    owner,
    offset,
    leader,
    delta,
    shouldFollowRun(distLeader, distOffset),
    onAvoidance
  );
  runtime.stuckCounter = 0;
  return { continueInner: false, teleport: false };
}

/**
 * WalkUpdateLocation toward follow offset (shared by FollowLeader + ForceFollow).
 */
export function driveTowardOffset(
  owner: ModuleCreature,
  offset: THREE.Vector3,
  faceTarget: ModuleCreature | undefined,
  delta: number,
  run: boolean,
  onAvoidance?: (delta: number, offset: THREE.Vector3, faceTarget?: ModuleCreature) => void
){
  ensurePathToOffset(owner, offset);

  if(owner.blockingTimer >= 5 || owner.collisionTimer >= 0.5){
    owner.blockingTimer = 0;
    owner.collisionTimer = 0;
    onAvoidance?.(delta, offset, faceTarget);
  }

  const path = owner.getComputedPath();
  const point = path?.points?.[0];
  if(point && Utility.Distance2D(owner.position, point.vector) <= 0.5){
    path.pop();
  }
  const goal = path?.points?.[0]?.vector ?? offset;
  faceToward(owner, goal);

  owner.walk = !run;
  owner.force = 0;
  owner.moveDirOverride = undefined;
  owner.setAnimationState(run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING);

  let remaining = Utility.Distance2D(owner.position, goal);
  const pts = path?.points;
  if(pts?.length){
    remaining = Utility.Distance2D(owner.position, pts[0].vector);
    for(let i = 1; i < pts.length; i++){
      remaining += Utility.Distance2D(pts[i - 1].vector, pts[i].vector);
    }
  }

  walkUpdateLocation(owner, goal, run, delta, {
    remainingDistance: remaining,
    followScale: getFollowRateScale(Utility.Distance2D(owner.position, offset)),
  });
}

export function ensurePathToOffset(owner: ModuleCreature, offset: THREE.Vector3): boolean {
  const area = owner.area ?? GameState.module?.area;
  if(!area?.path?.traverseToPoint) return false;

  const path = owner.getComputedPath();
  const end = path?.points?.length
    ? path.points[path.points.length - 1].vector
    : undefined;
  const drift = end ? Utility.Distance2D(end, offset) : Infinity;
  if(path?.points?.length && drift <= FOLLOW_PATH_REPATH_DRIFT){
    return true;
  }

  let dest = offset;
  if(typeof area.getNearestWalkablePoint === 'function' && typeof area.isPointWalkable === 'function'){
    if(!area.isPointWalkable(offset)){
      dest = area.getNearestWalkablePoint(offset, 0.05);
    }
  }

  const computed = area.path.traverseToPoint(owner, owner.position, dest);
  if(!computed?.points?.length){
    return false;
  }
  computed.prunePathPoints();
  computed.smoothCorners();
  computed.fixWalkEdges(getPathPersonalSpace(owner));
  computed.setColor(owner.helperColor);
  computed.realtime = true;
  computed.timer = 20;
  owner.setComputedPath(computed);
  return true;
}

export function faceToward(owner: ModuleCreature, goal: THREE.Vector3){
  const dx = goal.x - owner.position.x;
  const dy = goal.y - owner.position.y;
  if(dx * dx + dy * dy < 1e-8) return;
  const atan = Math.atan2(-dy, -dx);
  owner.setFacing(atan + Math.PI / 2, false, TURN_SPEED_FAST);
}

export function copyOffsetGoal(offset: THREE.Vector3): THREE.Vector3 {
  return _goal.copy(offset);
}

export function samplePosition(owner: ModuleCreature, runtime: FollowLeaderRuntime){
  runtime.lastSampleX = owner.position.x;
  runtime.lastSampleY = owner.position.y;
  runtime.lastSampleZ = owner.position.z;
}

export function isActivelyApproaching(runtime: FollowLeaderRuntime): boolean {
  return isFollowMovingState(runtime.state);
}

/** Scratch vector for callers. */
export function getFollowTmp(): THREE.Vector3 {
  return _tmp;
}
