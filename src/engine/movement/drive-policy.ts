import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { GameState } from "@/GameState";
import { nudgeFriendlyCreatures } from "@/engine/pathfinding/nudge-friendlies";
import { isCreature } from "@/module/guards/isCreature";
import {
  findGround,
  findWalkableAttachmentAt,
  queryDoorCrossing,
  testCreatureMovement,
  testStaticMovement,
  testWalkSegment,
  WalkLineHitCode,
} from "@/engine/movement/area-movement-queries";
import {
  MovementHitKind,
  MovementSource,
  MovementStatus,
  type MovementResult,
} from "@/engine/movement/types";
import { commitMovement } from "@/engine/movement/movement-committer";
import {
  setMovementAuthority,
} from "@/engine/movement/creature-movement-state";
import { MovementAuthority } from "@/engine/movement/types";

/**
 * Drive destination preparation (AIActionDrive) + per-frame DriveUpdateLocation.
 * Resolve is mutation-free aside from friend-nudge placement (authorized separately).
 */

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _next = new THREE.Vector3();
const _sample = new THREE.Vector3();
const _slideLeft = new THREE.Vector3();
const _slideRight = new THREE.Vector3();
const _slideProbe = new THREE.Vector3();
const _slideBest = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _lo = new THREE.Vector3();
const _hi = new THREE.Vector3();
const _mid = new THREE.Vector3();

function lineOk(code: WalkLineHitCode): boolean {
  return code === WalkLineHitCode.Ok;
}

/**
 * Resolve a drive step toward `ideal`: creature gate + bump, then direct-line
 * clip; on fail binary-search along the segment, then ±perpendicular wall-slide.
 * Returns a cloned target point (does not move the owner).
 */
export function drivePrepareDestination(
  area: ModuleArea,
  origin: THREE.Vector3,
  ideal: THREE.Vector3,
  creature: ModuleCreature,
  stepLen?: number
): THREE.Vector3 {
  const creatures = testCreatureMovement(area, origin, ideal, {
    owner: creature,
    allowPartyCreatures: false,
  });
  if(!creatures.clear && creatures.hit?.creatureId != null){
    const blocker =
      area.creatures?.find((c) => c.id === creatures.hit!.creatureId) ??
      GameState.PartyManager?.party?.find((c) => c.id === creatures.hit!.creatureId);
    if(isCreature(blocker)){
      if(!nudgeFriendlyCreatures(creature, blocker as ModuleCreature, ideal, origin)){
        return origin.clone();
      }
    }else{
      return origin.clone();
    }
  }

  const perspace = getPathPersonalSpace(creature);
  const full = testWalkSegment(area, origin, ideal, {
    owner: creature,
    personalSpace: perspace,
    softClearStartOverlap: true,
  });
  if(lineOk(full.code)){
    return ideal.clone();
  }

  let t = 0.5;
  let step = 0.25;
  let found = false;
  _slideBest.copy(origin);
  while(step > 0.005){
    _sample.set(
      origin.x + (ideal.x - origin.x) * t,
      origin.y + (ideal.y - origin.y) * t,
      origin.z + (ideal.z - origin.z) * t
    );
    const mid = testWalkSegment(area, origin, _sample, {
      owner: creature,
      personalSpace: perspace,
      softClearStartOverlap: true,
    });
    if(lineOk(mid.code)){
      _slideBest.copy(_sample);
      found = true;
      t += step;
    }else{
      t -= step;
    }
    step *= 0.5;
  }
  if(found){
    return _slideBest.clone();
  }

  _moveDir.set(ideal.x - origin.x, ideal.y - origin.y, 0);
  if(_moveDir.lengthSq() < 1e-10){
    return origin.clone();
  }
  _moveDir.normalize();
  _slideLeft.set(-_moveDir.y, _moveDir.x, 0);
  _slideRight.set(_moveDir.y, -_moveDir.x, 0);

  const len =
    typeof stepLen === "number" && stepLen > 0
      ? stepLen
      : Math.hypot(ideal.x - origin.x, ideal.y - origin.y);
  let leftOk = true;
  let rightOk = true;
  let leftDir = _slideLeft.clone().add(_moveDir).normalize();
  let rightDir = _slideRight.clone().add(_moveDir).normalize();
  let bestDot = -1;
  let best: THREE.Vector3 | undefined;

  for(let i = 0; i < 15 && (leftOk || rightOk); i++){
    if(leftOk){
      _slideProbe.set(
        origin.x + leftDir.x * len,
        origin.y + leftDir.y * len,
        origin.z
      );
      const hit = testWalkSegment(area, origin, _slideProbe, {
        owner: creature,
        personalSpace: perspace,
        softClearStartOverlap: true,
      });
      if(lineOk(hit.code)){
        const dot = leftDir.x * _moveDir.x + leftDir.y * _moveDir.y;
        if(dot > bestDot){
          bestDot = dot;
          best = _slideProbe.clone();
        }
        leftDir = leftDir.clone().add(_slideLeft).normalize();
      }else{
        leftOk = false;
      }
    }
    if(rightOk){
      _slideProbe.set(
        origin.x + rightDir.x * len,
        origin.y + rightDir.y * len,
        origin.z
      );
      const hit = testWalkSegment(area, origin, _slideProbe, {
        owner: creature,
        personalSpace: perspace,
        softClearStartOverlap: true,
      });
      if(lineOk(hit.code)){
        const dot = rightDir.x * _moveDir.x + rightDir.y * _moveDir.y;
        if(dot > bestDot){
          bestDot = dot;
          best = _slideProbe.clone();
        }
        rightDir = rightDir.clone().add(_slideRight).normalize();
      }else{
        rightOk = false;
      }
    }
  }

  if(best){
    const factor = Math.max(0.25, Math.min(1, bestDot > 0 ? bestDot : 0.25));
    if(creature){
      creature.locomotionScale = factor;
    }
    return best;
  }
  return origin.clone();
}

/** @deprecated Prefer drivePrepareDestination — alias for ActionDrive callers. */
export const driveResolveMoveTarget = drivePrepareDestination;

function clipWalkablePoint(
  area: ModuleArea,
  origin: THREE.Vector3,
  ideal: THREE.Vector3,
  creature: ModuleCreature
): THREE.Vector3 {
  const perspace = getPathPersonalSpace(creature);
  const hit = testStaticMovement(area, origin, ideal, {
    owner: creature,
    personalSpace: perspace,
    collectHitInfo: true,
    softClearStartOverlap: true,
  });
  if(hit.clear){
    return ideal.clone();
  }
  const walkHit = hit.walkHit;
  if(walkHit.clearT > 1e-4){
    _lo.copy(walkHit.clearPoint);
    if(area.getNearestWalkablePoint){
      return area.getNearestWalkablePoint(_lo, perspace);
    }
    return _lo.clone();
  }

  _lo.copy(origin);
  const steps = 8;
  for(let i = 1; i <= steps; i++){
    const t = i / steps;
    _sample.set(
      origin.x + (ideal.x - origin.x) * t,
      origin.y + (ideal.y - origin.y) * t,
      origin.z + (ideal.z - origin.z) * t
    );
    if(typeof area.isPointWalkable === "function" && !area.isPointWalkable(_sample)){
      _hi.copy(_sample);
      for(let b = 0; b < 6; b++){
        _mid.set(
          (_lo.x + _hi.x) * 0.5,
          (_lo.y + _hi.y) * 0.5,
          (_lo.z + _hi.z) * 0.5
        );
        if(area.isPointWalkable(_mid)){
          _lo.copy(_mid);
        }else{
          _hi.copy(_mid);
        }
      }
      break;
    }
    _lo.copy(_sample);
  }

  if(area.getNearestWalkablePoint){
    return area.getNearestWalkablePoint(_lo, perspace);
  }
  return _lo.clone();
}

/**
 * DriveUpdateLocation-style resolve: frame step toward prepared dest.
 * Does not mutate creature position — returns MovementResult for committer.
 */
export function resolveDriveStep(
  creature: ModuleCreature,
  dest: THREE.Vector3,
  running: boolean,
  delta: number,
  rateOverride?: number
): MovementResult {
  const origin = creature.position.clone();
  const emptyDisp = new THREE.Vector3();

  if(!creature?.area || !dest){
    return {
      source: MovementSource.Drive,
      status: MovementStatus.Blocked,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: emptyDisp,
      actualDistance: 0,
    };
  }

  const area = creature.area;
  const walk = creature.getWalkSpeed?.() || 1.7;
  const run = creature.getRunSpeed?.() || 5.4;
  let speed =
    typeof rateOverride === "number" && rateOverride > 0
      ? rateOverride
      : running
        ? run
        : walk;
  if(creature.movementSpeed > 0){
    speed *= creature.movementSpeed;
  }
  if(creature.locomotionScale > 0){
    speed *= creature.locomotionScale;
  }

  const step = Math.max(0, speed * Math.max(0, delta));
  if(step <= 1e-8){
    return {
      source: MovementSource.Drive,
      status: MovementStatus.Moving,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: emptyDisp,
      actualDistance: 0,
    };
  }

  _dir.set(dest.x - origin.x, dest.y - origin.y, 0);
  const distSq = _dir.lengthSq();
  if(distSq <= 1e-10){
    return {
      source: MovementSource.Drive,
      status: MovementStatus.Arrived,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: emptyDisp,
      actualDistance: 0,
    };
  }

  _dir.normalize();
  let arrived = false;
  if(distSq <= step * step){
    _next.copy(dest);
    arrived = true;
  }else{
    _next.set(
      origin.x + _dir.x * step,
      origin.y + _dir.y * step,
      origin.z
    );
  }

  const clipped = clipWalkablePoint(area, origin, _next, creature);
  if(
    Math.abs(clipped.x - origin.x) < 1e-5 &&
    Math.abs(clipped.y - origin.y) < 1e-5
  ){
    return {
      source: MovementSource.Drive,
      status: arrived ? MovementStatus.Arrived : MovementStatus.Blocked,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: emptyDisp,
      actualDistance: 0,
      incrementBlockingTimer: !arrived,
    };
  }

  const creatures = testCreatureMovement(area, origin, clipped, {
    owner: creature,
    allowPartyCreatures: true,
  });
  if(!creatures.clear){
    return {
      source: MovementSource.Drive,
      status: MovementStatus.Blocked,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: emptyDisp,
      actualDistance: 0,
      hit: creatures.hit,
      incrementBlockingTimer: true,
    };
  }

  const crossed = queryDoorCrossing(area, origin, clipped);
  if(crossed?.linkedOpen){
    return {
      source: MovementSource.Drive,
      status: MovementStatus.Blocked,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: emptyDisp,
      actualDistance: 0,
      crossedTransition: crossed.door,
      blockAfterDoorSignal: true,
      hit: { kind: MovementHitKind.Door, object: crossed.door },
      incrementBlockingTimer: true,
    };
  }

  const attach = findWalkableAttachmentAt(area, clipped, creature.room);
  const finalPos = clipped.clone();
  if(attach){
    finalPos.z = attach.z;
  }else{
    const ground = findGround(area, clipped, 0.1);
    if(ground) finalPos.z = ground.z;
  }

  const moved = Math.hypot(finalPos.x - origin.x, finalPos.y - origin.y);
  return {
    source: MovementSource.Drive,
    status: arrived ? MovementStatus.Arrived : MovementStatus.Moving,
    origin,
    finalPosition: finalPos,
    acceptedDisplacement: new THREE.Vector3(
      finalPos.x - origin.x,
      finalPos.y - origin.y,
      finalPos.z - origin.z
    ),
    actualDistance: moved,
    room: attach?.room,
    groundFace: attach?.face,
  };
}

/**
 * One frame of drive motion: resolve then commit once.
 * Returns retail-compatible 1/2/3 for ActionDrive / Walk callers.
 * @param sourceOverride When Walk/ForcePush call this helper, stamp their source.
 */
export function tickCreatureDrive(
  creature: ModuleCreature,
  dest: THREE.Vector3,
  running: boolean,
  delta: number,
  rateOverride?: number,
  sourceOverride?: MovementSource
): number {
  const source = sourceOverride ?? MovementSource.Drive;
  if(source === MovementSource.Walk){
    setMovementAuthority(creature, MovementAuthority.Walk);
  }else if(source === MovementSource.ForcePush){
    setMovementAuthority(creature, MovementAuthority.ForcedMovement);
  }else if(source === MovementSource.Jump){
    setMovementAuthority(creature, MovementAuthority.Jump);
  }else{
    setMovementAuthority(creature, MovementAuthority.Drive);
  }
  const result = resolveDriveStep(creature, dest, running, delta, rateOverride);
  result.source = source;
  commitMovement(creature, result, { delta });
  if(result.status === MovementStatus.Arrived) return 2;
  if(result.status === MovementStatus.Blocked) return 3;
  return 1;
}

// Re-export door helper for tests that imported getDoorCrossed from tick-creature-drive
export { queryDoorCrossing as getDoorCrossingQuery } from "@/engine/movement/area-movement-queries";
