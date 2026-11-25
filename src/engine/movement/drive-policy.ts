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
} from "@engine/movement/area-movement-queries";
import {
  MovementHitKind,
  MovementSource,
  MovementStatus,
  type MovementHit,
  type MovementResult,
} from "@engine/movement/types";
import { commitMovement } from "@engine/movement/movement-committer";
import { solveCollideAndSlide } from "@engine/movement/collide-and-slide";
import { makeStaticSlideProbe } from "@engine/movement/static-slide-probe";
import {
  setMovementAuthority,
} from "@engine/movement/creature-movement-state";
import { MovementAuthority } from "@engine/movement/types";

/**
 * Drive destination preparation (AIActionDrive) + per-frame DriveUpdateLocation.
 * Resolve is mutation-free aside from friend-nudge placement (authorized separately).
 *
 * Frame steps use the shared collide-and-slide solver over thin drive probes
 * (not plot-grade hasWalkLineClear binary/fan searches).
 */

const _dir = new THREE.Vector3();
const _next = new THREE.Vector3();
const _desired = new THREE.Vector3();
/** Scratch return for drivePrepareDestination — callers must .copy() immediately. */
const _prepareOut = new THREE.Vector3();

type DriveSolve = {
  position: THREE.Vector3;
  moved: number;
  unobstructed: boolean;
  hit?: MovementHit;
};

/**
 * Static collide-and-slide for AI / follow / scripted drive (same solver as
 * PlayerControl). Uses path perspace so steps agree with the path planner.
 * Soft start lets a creature already grazing a placeable step out of it.
 */
function solveDriveStatic(
  area: Area,
  creature: Creature,
  origin: THREE.Vector3,
  target: THREE.Vector3,
  /** undefined = skip creature legs (prepare: frame step re-tests them). */
  creatureLegs?: { allowPartyCreatures: boolean }
): DriveSolve {
  const perspace = getPathPersonalSpace(creature);
  _desired.set(target.x - origin.x, target.y - origin.y, 0);
  let creatureHit: MovementHit | undefined;
  const solve = solveCollideAndSlide(origin, _desired, {
    area,
    radius: perspace,
    probe: makeStaticSlideProbe(area, {
      owner: creature,
      personalSpace: perspace,
      softClearStartOverlap: true,
    }),
    validateLeg: creatureLegs
      ? (from, to) => {
        const cr = testCreatureMovement(area, from, to, {
          owner: creature,
          allowPartyCreatures: creatureLegs.allowPartyCreatures,
        });
        if(!cr.clear && !creatureHit) creatureHit = cr.hit;
        return cr.clear;
      }
      : undefined,
  });
  return {
    position: solve.position,
    moved: solve.moved,
    unobstructed: solve.unobstructed,
    hit: creatureHit ?? solve.hit,
  };
}

/**
 * Resolve a drive destination toward `ideal`: creature gate + friend nudge,
 * then static collide-and-slide. Lowers `locomotionScale` while sliding
 * (ActionDrive resets it each resolve).
 * Returns a scratch Vector3 — caller must .copy() immediately (does not move owner).
 */
export function drivePrepareDestination(
  area: Area,
  origin: THREE.Vector3,
  ideal: THREE.Vector3,
  creature: Creature,
  _stepLen?: number
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

  const idealLen = Math.hypot(ideal.x - origin.x, ideal.y - origin.y);
  if(idealLen < 1e-10){
    return _prepareOut.copy(origin);
  }

  const solve = solveDriveStatic(area, creature, origin, ideal);
  if(solve.unobstructed){
    return _prepareOut.copy(ideal);
  }
  if(solve.moved < 1e-6){
    return _prepareOut.copy(origin);
  }
  if(creature){
    const ux = (solve.position.x - origin.x) / solve.moved;
    const uy = (solve.position.y - origin.y) / solve.moved;
    const dot =
      (ux * (ideal.x - origin.x) + uy * (ideal.y - origin.y)) / idealLen;
    creature.locomotionScale = Math.max(0.25, Math.min(1, dot > 0 ? dot : 0.25));
  }
  return _prepareOut.set(solve.position.x, solve.position.y, origin.z);
}

/** @deprecated Prefer drivePrepareDestination — alias for ActionDrive callers. */
export const driveResolveMoveTarget = drivePrepareDestination;

/** Below this a blocked step counts as Blocked (not sub-mm "Moving" creep). */
const BLOCKED_CREEP = 1e-3;

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

  const solve = solveDriveStatic(area, creature, origin, _next, {
    allowPartyCreatures: true,
  });
  if(!solve.unobstructed) arrived = false;
  if(solve.moved < (solve.unobstructed ? 1e-5 : BLOCKED_CREEP)){
    const blockedByCreature = solve.hit?.kind === MovementHitKind.Creature;
    return {
      source: MovementSource.Drive,
      status: arrived ? MovementStatus.Arrived : MovementStatus.Blocked,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: emptyDisp,
      actualDistance: 0,
      hit: blockedByCreature ? solve.hit : undefined,
      incrementBlockingTimer: !arrived,
    };
  }
  const clipped = solve.unobstructed ? _next.clone() : solve.position;

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
