import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import { getPathPersonalSpace } from "@engine/combat/attack-range";
import { GameState } from "@engine/runtime/GameState";
import { nudgeFriendlyCreatures } from "@engine/pathfinding/nudge-friendlies";
import { isCreature } from "@engine/module/guards/isCreature";
import {
  findGround,
  findWalkableAttachmentAt,
  queryDoorCrossing,
  testCreatureMovement,
  testDriveStepClear,
} from "@engine/movement/area-movement-queries";
import {
  MovementHitKind,
  MovementSource,
  MovementStatus,
  type MovementResult,
} from "@engine/movement/types";
import { commitMovement } from "@engine/movement/movement-committer";
import {
  setMovementAuthority,
} from "@engine/movement/creature-movement-state";
import { MovementAuthority } from "@engine/movement/types";

/**
 * Drive destination preparation (AIActionDrive) + per-frame DriveUpdateLocation.
 * Resolve is mutation-free aside from friend-nudge placement (authorized separately).
 *
 * Frame steps use thin drive probes (clip + one stadium) — not plot-grade
 * hasWalkLineClear binary/fan searches.
 */

const _from = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _next = new THREE.Vector3();
const _sample = new THREE.Vector3();
const _moveDir = new THREE.Vector3();
const _slide = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _hitNormal = new THREE.Vector3();
/** Scratch return for drivePrepareDestination — callers must .copy() immediately. */
const _prepareOut = new THREE.Vector3();

function projectOntoTangent(
  desiredX: number,
  desiredY: number,
  normalX: number,
  normalY: number,
  out: THREE.Vector3
): void {
  const nLen = Math.hypot(normalX, normalY);
  if(nLen < 1e-8){
    out.set(desiredX, desiredY, 0);
    return;
  }
  const nx = normalX / nLen;
  const ny = normalY / nLen;
  const vn = desiredX * nx + desiredY * ny;
  if(vn < 0){
    out.set(desiredX - nx * vn, desiredY - ny * vn, 0);
  }else{
    out.set(desiredX, desiredY, 0);
  }
}

/**
 * Resolve a drive step toward `ideal`: creature gate + bump, then one thin
 * probe; on block clip to clearT and project onto wall tangent (≤2 retries).
 * Returns a scratch Vector3 — caller must .copy() immediately (does not move owner).
 */
export function drivePrepareDestination(
  area: Area,
  origin: THREE.Vector3,
  ideal: THREE.Vector3,
  creature: Creature,
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
      if(!nudgeFriendlyCreatures(creature, blocker as Creature, ideal, origin)){
        return _prepareOut.copy(origin);
      }
    }else{
      return _prepareOut.copy(origin);
    }
  }

  const perspace = getPathPersonalSpace(creature);
  // AI drive: hard static tests (no soft-start door/placeable pre-scan).
  const probe = testDriveStepClear(area, origin, ideal, {
    owner: creature,
    personalSpace: perspace,
    softClearStartOverlap: false,
  });
  if(probe.clear){
    return _prepareOut.copy(ideal);
  }

  _moveDir.set(ideal.x - origin.x, ideal.y - origin.y, 0);
  const idealLen = _moveDir.length();
  if(idealLen < 1e-10){
    return _prepareOut.copy(origin);
  }
  _moveDir.normalize();

  const len =
    typeof stepLen === "number" && stepLen > 0 ? stepLen : idealLen;

  // Clip to first contact from the thin probe (copy before next probe).
  const clearT = Math.max(0, Math.min(1, probe.clearT));
  if(clearT > 1e-4){
    _sample.set(
      origin.x + (ideal.x - origin.x) * clearT,
      origin.y + (ideal.y - origin.y) * clearT,
      origin.z + (ideal.z - origin.z) * clearT
    );
  }else{
    _sample.copy(origin);
  }
  _hitNormal.copy(probe.normal);
  let nx = _hitNormal.x;
  let ny = _hitNormal.y;
  if(Math.hypot(nx, ny) < 1e-8){
    nx = -_moveDir.x;
    ny = -_moveDir.y;
  }

  projectOntoTangent(_moveDir.x * len, _moveDir.y * len, nx, ny, _slide);
  const slideLen = Math.hypot(_slide.x, _slide.y);
  if(slideLen < 1e-8){
    if(clearT > 1e-4){
      if(area.getNearestWalkablePoint){
        return _prepareOut.copy(area.getNearestWalkablePoint(_sample, perspace));
      }
      return _prepareOut.copy(_sample);
    }
    return _prepareOut.copy(origin);
  }

  // At most two shortened retries along the tangent.
  const factors = [1, 0.5];
  let bestX = 0;
  let bestY = 0;
  let bestZ = 0;
  let hasBest = false;
  let bestDot = -1;
  for(let r = 0; r < factors.length; r++){
    const scale = factors[r];
    _probe.set(
      origin.x + (_slide.x / slideLen) * len * scale,
      origin.y + (_slide.y / slideLen) * len * scale,
      origin.z
    );
    const retry = testDriveStepClear(area, origin, _probe, {
      owner: creature,
      personalSpace: perspace,
      softClearStartOverlap: false,
    });
    if(retry.clear){
      const ux = _slide.x / slideLen;
      const uy = _slide.y / slideLen;
      const dot = ux * _moveDir.x + uy * _moveDir.y;
      if(dot > bestDot){
        bestDot = dot;
        bestX = _probe.x;
        bestY = _probe.y;
        bestZ = _probe.z;
        hasBest = true;
      }
      break;
    }
    if(retry.clearT > 1e-4){
      const px = origin.x + (_probe.x - origin.x) * retry.clearT;
      const py = origin.y + (_probe.y - origin.y) * retry.clearT;
      const moved = Math.hypot(px - origin.x, py - origin.y);
      if(moved > 1e-4){
        const ux = (px - origin.x) / moved;
        const uy = (py - origin.y) / moved;
        const dot = ux * _moveDir.x + uy * _moveDir.y;
        if(dot > bestDot){
          bestDot = dot;
          bestX = px;
          bestY = py;
          bestZ = origin.z;
          hasBest = true;
        }
      }
    }
  }

  if(hasBest){
    const factor = Math.max(0.25, Math.min(1, bestDot > 0 ? bestDot : 0.25));
    if(creature){
      creature.locomotionScale = factor;
    }
    return _prepareOut.set(bestX, bestY, bestZ);
  }

  if(clearT > 1e-4){
    if(area.getNearestWalkablePoint){
      return _prepareOut.copy(area.getNearestWalkablePoint(_sample, perspace));
    }
    return _prepareOut.copy(_sample);
  }
  return _prepareOut.copy(origin);
}

/** @deprecated Prefer drivePrepareDestination — alias for ActionDrive callers. */
export const driveResolveMoveTarget = drivePrepareDestination;

function clipWalkablePoint(
  area: Area,
  origin: THREE.Vector3,
  ideal: THREE.Vector3,
  creature: Creature
): THREE.Vector3 {
  const perspace = getPathPersonalSpace(creature);
  const probe = testDriveStepClear(area, origin, ideal, {
    owner: creature,
    personalSpace: perspace,
    softClearStartOverlap: false,
  });
  if(probe.clear){
    return ideal.clone();
  }
  if(probe.clearT > 1e-4){
    _sample.copy(probe.clearPoint);
    if(area.getNearestWalkablePoint){
      return area.getNearestWalkablePoint(_sample, perspace);
    }
    return _sample.clone();
  }

  // Thin probe gave no usable clearT — fall back to walkable point samples.
  _from.copy(origin);
  const steps = 8;
  for(let i = 1; i <= steps; i++){
    const t = i / steps;
    _sample.set(
      origin.x + (ideal.x - origin.x) * t,
      origin.y + (ideal.y - origin.y) * t,
      origin.z + (ideal.z - origin.z) * t
    );
    if(typeof area.isPointWalkable === "function" && !area.isPointWalkable(_sample)){
      break;
    }
    _from.copy(_sample);
  }

  if(area.getNearestWalkablePoint){
    return area.getNearestWalkablePoint(_from, perspace);
  }
  return _from.clone();
}

/**
 * DriveUpdateLocation-style resolve: frame step toward prepared dest.
 * Does not mutate creature position — returns MovementResult for committer.
 */
export function resolveDriveStep(
  creature: Creature,
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
  creature: Creature,
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
export { queryDoorCrossing as getDoorCrossingQuery } from "@engine/movement/area-movement-queries";
