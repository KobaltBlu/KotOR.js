import * as THREE from "three";
import { GameState } from "@/GameState";
import { getPathPersonalSpace } from "@/combat/attack-range";
import {
  FOLLOW_COMFORT,
  FOLLOW_REPATH,
  FOLLOW_RING_WARM_COUNT,
  FOLLOW_SAFETY_DIST_SQ,
  FOLLOW_STUCK_ITERATIONS,
  FollowLeaderState,
  isFollowMovingState,
  resolveFollowEntryState,
  shouldFollowRun,
  type FollowLeaderRuntime,
} from "@/engine/pathfinding/follow-leader";
import { getFollowRateScale } from "@/engine/pathfinding/locomotion";
import { partyFollowPath } from "@/engine/pathfinding/party-follow-path";
import { testDirectLine, TestDirectLineCode } from "@/engine/pathfinding/test-direct-line";
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
const _center = new THREE.Vector3();
const _lateral = new THREE.Vector3();
const _sample = new THREE.Vector3();

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
  runtime.offsetStepped = false;

  // Entry override: far/stuck → Teleport; leaving comfort → FindPath
  const entry = resolveFollowEntryState(
    distLeader,
    distOffset,
    runtime.state,
    runtime.stuckTimer,
    partyFollowPath.count
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
      runtime.lastSampleX = owner.position.x;
      runtime.lastSampleY = owner.position.y;
      runtime.lastSampleZ = owner.position.z;
      return { continueInner: true, teleport: false };

    case FollowLeaderState.FindPath:
      return handleFindPath(runtime, owner, offset);

    case FollowLeaderState.WaitingForPath:
      return handleWaitingForPath(runtime, owner, leader, offset);

    case FollowLeaderState.OffsetWaitDest:
    case FollowLeaderState.PathWaitDest:
    case FollowLeaderState.ToOffsetWaitDest:
    case FollowLeaderState.ToPathWaitDest:
      return handleWaitDest(runtime);

    case FollowLeaderState.Offset:
      return handleOffset(
        runtime, owner, leader, offset, delta, distLeader, distOffset, onAvoidance
      );

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

/**
 * Retail WaitingForPath @ 005127d0 — hold until ring count > 4, then pick
 * trail back-point; safety gate; LOS to lateral → MovingToOffset, else center
 * → MovingToPath, else FindPath.
 */
function handleWaitingForPath(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  leader: ModuleCreature,
  offset: THREE.Vector3
): FollowStepResult {
  void offset;
  // Retail: if (!(4 < count)) return 2 — hold
  if(partyFollowPath.count <= FOLLOW_RING_WARM_COUNT){
    runtime.stuckCounter = 0;
    runtime.stuckTimer = 0;
    return { continueInner: false, teleport: false };
  }

  const partyIndex = GameState.PartyManager?.party?.indexOf(owner) ?? 1;
  const idx = partyIndex >= 1 && partyIndex <= 2 ? partyIndex : 1;

  if(!partyFollowPath.pickWaitingForPathGoal(idx, _center)){
    return { continueInner: false, teleport: false };
  }

  runtime.pathPointX = _center.x;
  runtime.pathPointY = _center.y;
  runtime.pathPointZ = _center.z;

  const dx = leader.position.x - owner.position.x;
  const dy = leader.position.y - owner.position.y;
  const dz = leader.position.z - owner.position.z;
  const distLeaderSq = dx * dx + dy * dy + dz * dz;

  // Retail field22_0x70: hold while in-safety and leader within 7 units
  if(runtime.inSafetyRange !== 0 && distLeaderSq < FOLLOW_SAFETY_DIST_SQ){
    runtime.stuckCounter = 0;
    runtime.stuckTimer = 0;
    return { continueInner: false, teleport: false };
  }
  runtime.inSafetyRange = 0;
  if(owner.partyFollowInfo){
    owner.partyFollowInfo.inSafetyRange = 0;
  }

  if(!partyFollowPath.getApproachGoal(idx, _lateral)){
    _lateral.copy(_center);
  }
  runtime.goalX = _lateral.x;
  runtime.goalY = _lateral.y;
  runtime.goalZ = _lateral.z;

  // Sample start: lastSample (retail field17); seeded on Reset
  _sample.set(runtime.lastSampleX, runtime.lastSampleY, runtime.lastSampleZ);

  const area = owner.area ?? GameState.module?.area;
  if(area && hasFollowLos(area, owner, _sample, _lateral)){
    runtime.state = FollowLeaderState.MovingToOffset;
    return { continueInner: false, teleport: false };
  }
  if(area && hasFollowLos(area, owner, _sample, _center)){
    runtime.state = FollowLeaderState.MovingToPath;
    return { continueInner: false, teleport: false };
  }

  runtime.state = FollowLeaderState.FindPath;
  return { continueInner: true, teleport: false };
}

function hasFollowLos(
  area: NonNullable<ModuleCreature["area"]>,
  owner: ModuleCreature,
  from: THREE.Vector3,
  to: THREE.Vector3
): boolean {
  const hit = testDirectLine(area, from, to, {
    owner,
    personalSpace: Math.max(0.05, getPathPersonalSpace(owner) - 0.1),
    allowPartyCreatures: true,
  });
  return hit.ok || hit.code === TestDirectLineCode.Ok;
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

/**
 * Retail Offset @ 00511290 — AdvancePointOnPath + formation lateral sample,
 * continuous WalkUpdate toward that sample (no parkIdle). Leave → MovingToPath
 * only on LOS fail or distOffset ≥ FOLLOW_REPATH.
 */
function handleOffset(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  leader: ModuleCreature,
  offset: THREE.Vector3,
  delta: number,
  distLeader: number,
  distOffset: number,
  onAvoidance?: FollowAvoidanceFn
): FollowStepResult {
  // Retail Offset success path clears field11_0x44
  runtime.stuckTimer = 0;
  runtime.stuckCounter = 0;
  runtime.offsetStepped = false;

  if(distOffset >= FOLLOW_REPATH){
    runtime.state = FollowLeaderState.MovingToPath;
    return { continueInner: true, teleport: false };
  }

  const partyIdx = GameState.PartyManager?.party?.indexOf?.(owner) ?? -1;
  const slot = partyIdx === 2 ? 2 : 1;

  const run = shouldFollowRun(distLeader, distOffset, runtime.wasRunning);
  runtime.wasRunning = run;
  const rate = run
    ? (owner.getRunSpeed?.() || 5.4)
    : (owner.getWalkSpeed?.() || 1.7);
  const followScale = getFollowRateScale(distOffset);
  const budget = Math.max(0, rate * Math.max(0, delta) * followScale);

  // Seed path cursor (retail field6) from Recalc center if unset
  if(
    Math.abs(runtime.pathPointX) < 1e-8 &&
    Math.abs(runtime.pathPointY) < 1e-8 &&
    Math.abs(runtime.pathPointZ) < 1e-8
  ){
    if(partyFollowPath.getFollowGoal(slot, _center)){
      runtime.pathPointX = _center.x;
      runtime.pathPointY = _center.y;
      runtime.pathPointZ = _center.z;
    }else{
      runtime.pathPointX = owner.position.x;
      runtime.pathPointY = owner.position.y;
      runtime.pathPointZ = owner.position.z;
    }
  }

  _sample.set(runtime.pathPointX, runtime.pathPointY, runtime.pathPointZ);
  const idxBox = { value: 0 };
  partyFollowPath.advancePointOnPath(budget, slot, _sample, _center, idxBox);
  runtime.pathPointX = _center.x;
  runtime.pathPointY = _center.y;
  runtime.pathPointZ = _center.z;

  const bearing = partyFollowPath.points[idxBox.value]?.bearing ?? 0;
  partyFollowPath.applyFormationLateral(
    slot, _center.x, _center.y, _center.z, bearing, _lateral
  );
  // Prefer live GetFollowPosition when ring lateral is cold / far from offset
  if(Utility.Distance2D(_lateral, offset) > FOLLOW_COMFORT){
    _lateral.copy(offset);
  }

  const area = owner.area ?? GameState.module?.area;
  _sample.set(runtime.lastSampleX, runtime.lastSampleY, runtime.lastSampleZ);
  if(
    Math.abs(_sample.x) < 1e-8 &&
    Math.abs(_sample.y) < 1e-8 &&
    Math.abs(_sample.z) < 1e-8
  ){
    _sample.copy(owner.position);
  }

  // Retail: LOS field17 → new lateral; fail → MovingToPath
  if(area && !hasFollowLos(area, owner, _sample, _lateral)){
    runtime.state = FollowLeaderState.MovingToPath;
    return { continueInner: true, teleport: false };
  }

  runtime.lastSampleX = _lateral.x;
  runtime.lastSampleY = _lateral.y;
  runtime.lastSampleZ = _lateral.z;
  runtime.goalX = _lateral.x;
  runtime.goalY = _lateral.y;
  runtime.goalZ = _lateral.z;

  const distToSample = Utility.Distance2D(owner.position, _lateral);
  const sampleMoved =
    Math.hypot(
      _lateral.x - _sample.x,
      _lateral.y - _sample.y
    ) > 0.02;

  if(distToSample > 0.05 || sampleMoved){
    driveTowardOffset(owner, _lateral, leader, delta, run, onAvoidance);
    runtime.offsetStepped = true;
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
  // Enter Offset only at/under comfort (hysteresis vs FOLLOW_REPATH leave)
  if(distOffset <= FOLLOW_COMFORT){
    runtime.stuckTimer = 0;
    runtime.state = FollowLeaderState.Offset;
    // Seed path cursor (retail field6) from Recalc center for AdvancePointOnPath
    const partyIdx = GameState.PartyManager?.party?.indexOf?.(owner) ?? -1;
    const slot = partyIdx === 2 ? 2 : 1;
    if(partyFollowPath.getFollowGoal(slot, _center)){
      runtime.pathPointX = _center.x;
      runtime.pathPointY = _center.y;
      runtime.pathPointZ = _center.z;
    }else{
      runtime.pathPointX = owner.position.x;
      runtime.pathPointY = owner.position.y;
      runtime.pathPointZ = owner.position.z;
    }
    return { continueInner: true, teleport: false };
  }
  runtime.stuckTimer += delta;

  // Promote MovingToPath → FollowingPath once path exists
  if(runtime.state === FollowLeaderState.MovingToPath){
    const path = owner.getComputedPath();
    if(path?.points?.length){
      runtime.state = FollowLeaderState.FollowingPath;
    }
  }

  const run = shouldFollowRun(distLeader, distOffset, runtime.wasRunning);
  runtime.wasRunning = run;
  driveTowardOffset(
    owner,
    offset,
    leader,
    delta,
    run,
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
  // traverseToPoint already runs SmoothSelection + SmoothCorner (budgeted)
  computed.fixWalkEdges(getPathPersonalSpace(owner));
  computed.setColor?.(owner.helperColor);
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
