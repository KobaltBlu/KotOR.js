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
import { getFollowRateScale, pathApproachScale, walkSpeedFactorRamp } from "@/engine/pathfinding/locomotion";
import { partyFollowPath, FOLLOW_RING_SIZE } from "@/engine/pathfinding/party-follow-path";
import { testDirectLine, TestDirectLineCode } from "@/engine/pathfinding/test-direct-line";
import { testSafeLocationPoint } from "@/engine/pathfinding/test-safe-location-point";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import { Utility } from "@/utility/Utility";

/** Repath when live follow goal drifts this far from path end. */
export const FOLLOW_PATH_REPATH_DRIFT = 1.25;
/**
 * Min world displacement before Offset/Moving counts as a step for anim.
 * Below this, keep/clear pause so micro-chasing trail vs GetFollowPosition
 * cannot leave companions moonwalking in run after the leader stops.
 */
export const FOLLOW_STEP_ANIM_EPS = 0.02;

export type FollowStepResult = {
  /** Spend remaining inner-loop budget (iVar14 == 1). */
  continueInner: boolean;
  /** Request JumpToPoint / teleport this frame. */
  teleport: boolean;
};

const _goal = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _center = new THREE.Vector3();
const _lateral = new THREE.Vector3();
const _sample = new THREE.Vector3();
const _moveGoal = new THREE.Vector3();

/**
 * QuickWalk_FollowLeader rate: GetWalkRate / GetRunRate × movementSpeed.
 * Stealth activity forces walk (QuickWalk GetActivity(1)); without STEALTH_RUN
 * (0xc5) K2 GetWalkRate stays on walk even when otherwise running.
 */
export function getEffectiveFollowRate(owner: ModuleCreature, run: boolean): number {
  const stealth = !!owner.stealthMode;
  const hasStealthRun =
    typeof owner.getHasFeat === "function" &&
    owner.getHasFeat(CombatFeatType.STEALTH_RUN);
  // : stealth activity → GetWalkRate; STEALTH_RUN allows run while stealthed
  const useRun = run && (!stealth || hasStealthRun);
  const base = useRun
    ? (owner.getRunSpeed?.() || 5.4)
    : (owner.getWalkSpeed?.() || 1.7);
  const movement = typeof owner.movementSpeed === "number" && owner.movementSpeed > 0
    ? owner.movementSpeed
    : 1;
  return base * movement;
}

/**
 * Frame step budget — QuickWalk_FollowLeader outer uses
 * `dt_ms * rate_milli * 1e-06` (= delta * worldRate) after dist² bands.
 * walkSpeedFactor is still ramped for MoveTo handoff continuity.
 */
export function computeFollowStepBudget(
  owner: ModuleCreature,
  run: boolean,
  distForBands: number,
  remainingToGoal: number,
  delta: number
): number {
  const base = getEffectiveFollowRate(owner, run);
  const followScale = getFollowRateScale(distForBands);
  const rate = base * followScale;
  const dt = Math.max(0, delta);
  const approach = pathApproachScale(remainingToGoal, rate, dt);
  const prev = Number.isFinite(owner.walkSpeedFactor) ? owner.walkSpeedFactor : 0;
  owner.walkSpeedFactor = walkSpeedFactorRamp(prev, approach, dt);
  return dt * rate;
}

/**
 * Drive one FollowLeader SM iteration (do/while switch).
 */
export function stepFollowLeaderState(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  leader: ModuleCreature,
  offset: THREE.Vector3,
  delta: number
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
      return handleWaitDest(runtime, owner, delta);

    case FollowLeaderState.Offset:
      return handleOffset(
        runtime, owner, leader, offset, delta, distLeader, distOffset
      );

    case FollowLeaderState.MovingToPath:
    case FollowLeaderState.FollowingPath:
    case FollowLeaderState.MovingToOffset:
      return handleMoving(
        runtime, owner, leader, offset, delta, distLeader, distOffset
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
  // : safe lateral → OffsetWaitDest (6); else PathWaitDest (7)
  runtime.state = ok
    ? FollowLeaderState.OffsetWaitDest
    : FollowLeaderState.PathWaitDest;
  return { continueInner: false, teleport: false };
}

/**
 * WaitingForPath — hold until ring count > 4, then pick
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
  // : if (!(4 < count)) return 2 — hold
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

  // : hold while in-safety and leader within 7 units
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

  // Sample start: lastSample; seeded on Reset
  _sample.set(runtime.lastSampleX, runtime.lastSampleY, runtime.lastSampleZ);

  const area = owner.area;
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

/**
 * OffsetWaitDest / PathWaitDest
 * walk ring indices from cursor→goal; hold while writeHead not yet at goal,
 * else → Offset (1) or FollowingPath (3).
 */
function handleWaitDest(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  delta: number = 0
): FollowStepResult {
  // Do not clear stuckCounter here — WaitDest hold/thrash must still
  // accumulate toward Reset / Teleport when the companion never advances.
  const partyIdx = GameState.PartyManager?.party?.indexOf?.(owner) ?? -1;
  const slot = partyIdx === 2 ? 2 : 1;
  const writeHead = partyFollowPath.writeHead;
  let cursor = partyFollowPath.memberCursor[slot] ?? 0;
  const goalIdx = partyFollowPath.memberGoalIndex[slot] ?? cursor;

  // Walk forward from cursor toward writeHead looking for goalIdx
  let i = cursor;
  let foundGoal = false;
  let hitWriteHead = false;
  for(let steps = 0; steps < 100; steps++){
    if(i === writeHead){
      hitWriteHead = true;
      break;
    }
    if(i === goalIdx){
      foundGoal = true;
      break;
    }
    i = i < 99 ? i + 1 : 0;
  }

  if(hitWriteHead && !foundGoal){
    // Ring has not advanced to goal yet — keep waiting; tick stuck clock
    runtime.stuckTimer += Math.max(0, delta);
    return { continueInner: false, teleport: false };
  }

  if(foundGoal && goalIdx === cursor){
    // At goal index: stay waiting if pathPoint is closer to ring[cursor]
    // than Recalc goal (dist² compare)
    const p = partyFollowPath.points[cursor];
    if(p){
      const dPath =
        (p.x - runtime.pathPointX) ** 2 +
        (p.y - runtime.pathPointY) ** 2 +
        (p.z - runtime.pathPointZ) ** 2;
      const dGoal =
        (p.x - runtime.goalX) ** 2 +
        (p.y - runtime.goalY) ** 2 +
        (p.z - runtime.goalZ) ** 2;
      if(dPath <= dGoal){
        return { continueInner: false, teleport: false };
      }
    }
  }

  runtime.waitFrames = 0;
  if(
    runtime.state === FollowLeaderState.OffsetWaitDest ||
    runtime.state === FollowLeaderState.ToOffsetWaitDest
  ){
    // OffsetWaitDest → Offset (1) when already in formation band.
    // If still outside comfort, enter MovingToPath so we actually walk
    // otherwise FindPath↔WaitDest↔Offset thrash freezes companions far away.
    const distGoal = Math.hypot(
      owner.position.x - runtime.goalX,
      owner.position.y - runtime.goalY
    );
    runtime.state = distGoal > FOLLOW_COMFORT
      ? FollowLeaderState.MovingToPath
      : FollowLeaderState.Offset;
  }else{
    // PathWaitDest → FollowingPath (3)
    runtime.state = FollowLeaderState.FollowingPath;
  }
  return { continueInner: true, teleport: false };
}

/**
 * Offset — AdvancePointOnPath + formation lateral sample,
 * direct SetPosition toward that sample (no parkIdle). Leave → MovingToPath
 * only on LOS fail or distOffset ≥ FOLLOW_REPATH.
 */
function handleOffset(
  runtime: FollowLeaderRuntime,
  owner: ModuleCreature,
  leader: ModuleCreature,
  offset: THREE.Vector3,
  delta: number,
  distLeader: number,
  distOffset: number
): FollowStepResult {
  // Offset success path clears stuck counters
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
  const budget = computeFollowStepBudget(
    owner,
    run,
    distOffset,
    distOffset,
    delta
  );

  // Seed path cursor from Recalc center if unset
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

  // Offset — lerp formation laterals between ring[idx] and ring[idx−1]
  const idx = idxBox.value;
  const prevIdx = idx > 0 ? idx - 1 : FOLLOW_RING_SIZE - 1;
  const curr = partyFollowPath.points[idx];
  const prev = partyFollowPath.points[prevIdx];
  const bearingCurr = curr?.bearing ?? 0;
  const bearingPrev = prev?.bearing ?? bearingCurr;
  partyFollowPath.applyFormationLateral(
    slot, curr?.x ?? _center.x, curr?.y ?? _center.y, curr?.z ?? _center.z, bearingCurr, _lateral
  );
  if(prev && curr){
    partyFollowPath.applyFormationLateral(
      slot, prev.x, prev.y, prev.z, bearingPrev, _tmp
    );
    const segDx = curr.x - prev.x;
    const segDy = curr.y - prev.y;
    const segDz = curr.z - prev.z;
    const segLen = Math.sqrt(segDx * segDx + segDy * segDy + segDz * segDz) || 1;
    const advDx = _center.x - prev.x;
    const advDy = _center.y - prev.y;
    const advDz = _center.z - prev.z;
    const t = Math.min(1, Math.max(0, Math.sqrt(advDx * advDx + advDy * advDy + advDz * advDz) / segLen));
    _lateral.set(
      _tmp.x + (_lateral.x - _tmp.x) * t,
      _tmp.y + (_lateral.y - _tmp.y) * t,
      _tmp.z + (_lateral.z - _tmp.z) * t
    );
  }
  // Prefer live GetFollowPosition only when ring is cold
  if(partyFollowPath.count <= FOLLOW_RING_WARM_COUNT){
    _lateral.copy(offset);
  }else if(Utility.Distance2D(_lateral, offset) > FOLLOW_REPATH){
    _lateral.copy(offset);
  }

  const area = owner.area;
  _sample.set(runtime.lastSampleX, runtime.lastSampleY, runtime.lastSampleZ);
  if(
    Math.abs(_sample.x) < 1e-8 &&
    Math.abs(_sample.y) < 1e-8 &&
    Math.abs(_sample.z) < 1e-8
  ){
    _sample.copy(owner.position);
  }

  // : LOS sample → new lateral; fail → MovingToPath when still outside
  // comfort. If already within FOLLOW_COMFORT, stay Offset and park — otherwise
  // ActionFollowLeader's inner loop thrash Offset↔Moving forever (LOS fail then
  // comfort re-enter), leaving companions stuck on RUNNING with zero displacement.
  if(area && !hasFollowLos(area, owner, _sample, _lateral)){
    const sampleDist = Utility.Distance2D(owner.position, _sample);
    if(sampleDist > 0.5 && hasFollowLos(area, owner, owner.position, _lateral)){
      _sample.copy(owner.position);
      runtime.lastSampleX = owner.position.x;
      runtime.lastSampleY = owner.position.y;
      runtime.lastSampleZ = owner.position.z;
    }else if(distOffset <= FOLLOW_COMFORT){
      runtime.lastSampleX = owner.position.x;
      runtime.lastSampleY = owner.position.y;
      runtime.lastSampleZ = owner.position.z;
      runtime.offsetStepped = false;
      owner.force = 0;
      owner.speed = 0;
      owner.walk = false;
      owner.clearLocomotionAnimation?.();
      return { continueInner: false, teleport: false };
    }else{
      // Refresh sample to feet before pathing so a later Offset re-entry is live
      runtime.lastSampleX = owner.position.x;
      runtime.lastSampleY = owner.position.y;
      runtime.lastSampleZ = owner.position.z;
      runtime.state = FollowLeaderState.MovingToPath;
      // Do not continueInner — same-frame comfort re-enter would thrash with LOS fail
      return { continueInner: false, teleport: false };
    }
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
    // FollowLeader — after Advance burns budget into state,
    // SetPosition toward that sample (not WalkUpdate trapezoid).
    const beforeX = owner.position.x;
    const beforeY = owner.position.y;
    applyFollowSetPosition(owner, _lateral, budget, delta, run);
    const moved = Math.hypot(owner.position.x - beforeX, owner.position.y - beforeY);
    runtime.offsetStepped = moved >= FOLLOW_STEP_ANIM_EPS;
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
  distOffset: number
): FollowStepResult {
  // Enter Offset only at/under comfort (hysteresis vs FOLLOW_REPATH leave)
  if(distOffset <= FOLLOW_COMFORT){
    runtime.stuckTimer = 0;
    runtime.state = FollowLeaderState.Offset;
    // Seed path cursor from Recalc center for AdvancePointOnPath
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
    // Keep sample at feet when re-entering Offset from Moving* so a stale
    // sample behind an NPC cannot immediately bounce us back to MovingToPath.
    runtime.lastSampleX = owner.position.x;
    runtime.lastSampleY = owner.position.y;
    runtime.lastSampleZ = owner.position.z;
    // continueInner so Offset can Advance/park this frame; Offset LOS-in-comfort
    // now parks instead of bouncing back to Moving.
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
  const moved = driveTowardOffset(
    owner,
    offset,
    delta,
    run
  );
  if(moved === FollowMoveResult.BlockedByWorldCreature){
    runtime.state = FollowLeaderState.Teleport;
    runtime.stuckTimer = 0;
  }else if(moved === FollowMoveResult.Blocked){
    owner.setComputedPath?.(undefined);
    runtime.state = FollowLeaderState.FindPath;
    runtime.stuckTimer = 0;
  }else{
    runtime.stuckCounter = 0;
  }
  return { continueInner: false, teleport: false };
}

/**
 * FollowLeader outer SetPosition toward last sample.
 * Budget already burned by AdvancePointOnPath; step toward sample with
 * TestDirectLine / TestSafeLocationPoint gate.
 * @returns world units actually displaced this call
 */
function applyFollowSetPosition(
  owner: ModuleCreature,
  goal: THREE.Vector3,
  budget: number,
  delta: number,
  run: boolean
): number {
  if(owner.blockingTimer >= 5 || owner.collisionTimer >= 0.5){
    owner.blockingTimer = 0;
    owner.collisionTimer = 0;
  }

  const dx = goal.x - owner.position.x;
  const dy = goal.y - owner.position.y;
  const dist = Math.hypot(dx, dy);
  if(dist < 1e-6 || budget <= 0){
    faceToward(owner, goal);
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.clearLocomotionAnimation?.();
    return 0;
  }

  const step = Math.min(budget, dist);
  const beforeX = owner.position.x;
  const beforeY = owner.position.y;
  _tmp.set(
    owner.position.x + (dx / dist) * step,
    owner.position.y + (dy / dist) * step,
    owner.position.z
  );

  const area = owner.area;
  if(area){
    const hit = testDirectLine(area, owner.position, _tmp, {
      owner,
      personalSpace: getPathPersonalSpace(owner),
      allowPartyCreatures: true,
    });
    if(!hit.ok && hit.code !== TestDirectLineCode.Ok){
      if(hit.clearPoint){
        _tmp.copy(hit.clearPoint);
      }else if(!testSafeLocationPoint(area, _tmp, owner, {
        allowPartyCreatures: true,
      })){
        faceToward(owner, goal);
        owner.clearLocomotionAnimation?.();
        return 0;
      }
    }
    if(typeof area.getNearestWalkablePoint === 'function'){
      _tmp.copy(area.getNearestWalkablePoint(_tmp, getPathPersonalSpace(owner) * 0.5));
    }
  }

  faceToward(owner, goal);
  owner.force = 0;
  owner.speed = 0;
  owner.moveDirOverride = undefined;
  const moved = Math.hypot(_tmp.x - beforeX, _tmp.y - beforeY);
  if(moved < FOLLOW_STEP_ANIM_EPS){
    owner.walk = false;
    owner.clearLocomotionAnimation?.();
    // Still snap residual so we don't micro-chase forever
    if(moved > 1e-8){
      owner.setPosition(_tmp);
    }
    return moved;
  }

  owner.walk = !run;
  owner.setAnimationState(run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING);
  owner.setPosition(_tmp);
  return moved;
}

export enum FollowMoveResult {
  OK = 1,
  Arrived = 2,
  Blocked = 3,
  BlockedByWorldCreature = 4,
}

function isPartyCreatureId(id: number | undefined): boolean {
  if(id == null) return false;
  const party = GameState.PartyManager?.party;
  if(!party?.length) return false;
  return party.some((creature) => creature?.id === id);
}

/**
 * FollowLeader Moving* step: direct TestDirectLine to the next follow
 * path/sample point. Unlike generic creature walk update, this does not call
 * BumpFriends, so followers cannot shove ambient creatures out of the way.
 */
function applyFollowDirectMove(
  owner: ModuleCreature,
  goal: THREE.Vector3,
  budget: number,
  delta: number,
  run: boolean
): FollowMoveResult {
  const dx = goal.x - owner.position.x;
  const dy = goal.y - owner.position.y;
  const dist = Math.hypot(dx, dy);
  if(dist < 1e-6){
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.clearLocomotionAnimation?.();
    return FollowMoveResult.Arrived;
  }
  if(budget <= 0){
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.clearLocomotionAnimation?.();
    return FollowMoveResult.OK;
  }

  const step = Math.min(budget, dist);
  const beforeX = owner.position.x;
  const beforeY = owner.position.y;
  _tmp.set(
    owner.position.x + (dx / dist) * step,
    owner.position.y + (dy / dist) * step,
    owner.position.z
  );

  const area = owner.area;
  if(area){
    const hit = testDirectLine(area, owner.position, _tmp, {
      owner,
      personalSpace: Math.max(0.05, getPathPersonalSpace(owner) - 0.1),
      allowPartyCreatures: true,
    });
    if(!hit.ok && hit.code !== TestDirectLineCode.Ok){
      owner.force = 0;
      owner.speed = 0;
      if(
        hit.code === TestDirectLineCode.Creature &&
        !isPartyCreatureId(hit.blockingCreatureId)
      ){
        return FollowMoveResult.BlockedByWorldCreature;
      }
      return FollowMoveResult.Blocked;
    }
    if(typeof area.getNearestWalkablePoint === 'function'){
      _tmp.copy(area.getNearestWalkablePoint(_tmp, getPathPersonalSpace(owner) * 0.5));
    }
  }

  owner.force = 0;
  owner.speed = 0;
  owner.moveDirOverride = undefined;
  const moved = Math.hypot(_tmp.x - beforeX, _tmp.y - beforeY);
  if(moved < FOLLOW_STEP_ANIM_EPS){
    owner.walk = false;
    owner.clearLocomotionAnimation?.();
    if(moved > 1e-8){
      owner.setPosition(_tmp);
    }
    return dist - moved <= FOLLOW_STEP_ANIM_EPS
      ? FollowMoveResult.Arrived
      : FollowMoveResult.OK;
  }

  owner.walk = !run;
  owner.setAnimationState(run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING);
  owner.setPosition(_tmp);
  return step >= dist ? FollowMoveResult.Arrived : FollowMoveResult.OK;
}

/**
 * direct-line motion toward follow offset / path sample (Moving* states).
 */
export function driveTowardOffset(
  owner: ModuleCreature,
  offset: THREE.Vector3,
  delta: number,
  run: boolean
): FollowMoveResult {
  ensurePathToOffset(owner, offset);

  if(owner.blockingTimer >= 5 || owner.collisionTimer >= 0.5){
    owner.blockingTimer = 0;
    owner.collisionTimer = 0;
  }

  const path = owner.getComputedPath();
  const point = path?.points?.[0];
  if(point && Utility.Distance2D(owner.position, point.vector) <= 0.5){
    path.pop();
  }
  _moveGoal.copy(path?.points?.[0]?.vector ?? offset);
  faceToward(owner, _moveGoal);

  owner.force = 0;
  owner.moveDirOverride = undefined;

  const distGoal = Utility.Distance2D(owner.position, offset);
  const budget = computeFollowStepBudget(
    owner,
    run,
    distGoal,
    Utility.Distance2D(owner.position, _moveGoal),
    delta
  );
  return applyFollowDirectMove(owner, _moveGoal, budget, delta, run);
}

export function ensurePathToOffset(owner: ModuleCreature, offset: THREE.Vector3): boolean {
  const area = owner.area;
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
