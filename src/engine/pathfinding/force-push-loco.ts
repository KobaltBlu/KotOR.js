import * as THREE from "three";
import type { Creature } from "@engine/module/Creature";
import { ComputedPath } from "@engine/pathfinding/ComputedPath";
import {
  getWalkHeightAt,
  hasWalkLineClear,
  WalkLineHitCode,
} from "@engine/pathfinding/walk-line-clear";
import {
  DriveUpdateResult,
  tickCreatureDrive,
} from "@engine/pathfinding/tick-creature-drive";
import { MovementSource } from "@engine/movement/types";
import { getPathPersonalSpace } from "@engine/combat/attack-range";
import { isCreature } from "@engine/module/guards/isCreature";
import { ModuleCreatureAmbientState } from "@core/enums/module/ModuleCreatureAmbientState";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import {
  FORCE_PUSH_LOCO_STATE,
  CreatureLocoState,
  getCreatureLocoState,
  isForcePushLocoActive,
  setCreatureLocoState,
} from "@engine/pathfinding/creature-loco";

/**
 * Force Push onApply helpers and high-speed slide locomotion.
 */

export {
  FORCE_PUSH_LOCO_STATE,
  isForcePushLocoActive,
} from "@engine/pathfinding/creature-loco";

/** World units/sec while force-push loco is active. */
export const FORCE_PUSH_SPEED = 25.0;

/** Default push distance when effect float[3] is 0. */
export const FORCE_PUSH_DEFAULT_DISTANCE = 5.0;

/** Land / get-up clip lengths used for fp_*_played after arrival. */
export const FORCE_PUSH_ANIM_LAND = 1.0666699409484863;
export const FORCE_PUSH_ANIM_GETUP = 1.466670036315918;

const _origin = new THREE.Vector3();
const _dest = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _face = new THREE.Vector3();

export type ForcePushApplyIntsFloats = {
  getInt(index: number): number;
  getFloat(index: number): number;
};

export type ForcePushOrigin = {
  origin: THREE.Vector3;
  ignoreWalkLineClear: boolean;
};

/**
 * Resolve push origin: creator position (untargeted) or effect floats (targeted).
 * Returns undefined when untargeted and creator is missing.
 */
export function resolveForcePushOrigin(
  effect: ForcePushApplyIntsFloats,
  creatorPos: THREE.Vector3 | undefined
): ForcePushOrigin | undefined {
  const targeted = (effect.getInt(0) | 0) !== 0;
  if(!targeted){
    if(!creatorPos) return undefined;
    return {
      origin: creatorPos.clone(),
      ignoreWalkLineClear: false,
    };
  }
  return {
    origin: new THREE.Vector3(
      effect.getFloat(0),
      effect.getFloat(1),
      effect.getFloat(2)
    ),
    ignoreWalkLineClear: (effect.getInt(1) | 0) !== 0,
  };
}

/** Push distance from float[3], defaulting to 5. */
export function resolveForcePushDistance(effect: ForcePushApplyIntsFloats): number {
  const d = effect.getFloat(3);
  return d !== 0 && Number.isFinite(d) ? d : FORCE_PUSH_DEFAULT_DISTANCE;
}

/**
 * dest = position + normalize(position − origin) * distance.
 * faceDir = −pushDir (face toward origin).
 */
export function computeForcePushDestination(
  position: THREE.Vector3,
  origin: THREE.Vector3,
  distance: number
): { dest: THREE.Vector3; dir: THREE.Vector3; faceDir: THREE.Vector3; ok: boolean } {
  _dir.set(
    position.x - origin.x,
    position.y - origin.y,
    position.z - origin.z
  );
  const len = _dir.length();
  if(len < 1e-6){
    return {
      dest: position.clone(),
      dir: new THREE.Vector3(0, 0, 0),
      faceDir: new THREE.Vector3(0, 1, 0),
      ok: false,
    };
  }
  _dir.multiplyScalar(1 / len);
  _dest.set(
    position.x + _dir.x * distance,
    position.y + _dir.y * distance,
    position.z + _dir.z * distance
  );
  _face.set(-_dir.x, -_dir.y, -_dir.z);
  return {
    dest: _dest.clone(),
    dir: _dir.clone(),
    faceDir: _face.clone(),
    ok: true,
  };
}

/**
 * Facing radian for a horizontal direction vector (KotOR forward = cos/sin(z+π/2)).
 */
export function facingFromDirection(dirX: number, dirY: number): number {
  return Math.atan2(dirY, dirX) - Math.PI / 2;
}

/**
 * Clip force-push destination against walkmesh / creatures:
 * clear → keep dest; hard fail → stay put; otherwise use farthest clear point.
 */
export function clipForcePushDestination(
  creature: Creature,
  dest: THREE.Vector3,
  ignoreWalkLineClear: boolean
): THREE.Vector3 {
  if(ignoreWalkLineClear || !creature.area){
    return dest.clone();
  }

  const perspace = getPathPersonalSpace(creature);
  const ignoreIds: number[] = [];
  if(creature.id != null) ignoreIds.push(creature.id);

  const height = creature.getAppearance?.()?.height ?? 0;
  const hit = hasWalkLineClear(creature.area, creature.position, dest, {
    owner: creature,
    personalSpace: perspace,
    checkCreatures: true,
    ignoreCreatureIds: ignoreIds,
    collectHitInfo: true,
    maxHeightDelta: height > 0 ? Math.max(2.5, height) : undefined,
  });

  if(hit.ok || hit.code === WalkLineHitCode.Ok){
    return dest.clone();
  }

  // Hard fail: stay put
  if(hit.code === WalkLineHitCode.Fail){
    return creature.position.clone();
  }

  // Non-walk / detailed / creature: use clear point
  let clear = hit.clearPoint.clone();
  if(typeof creature.area.getNearestWalkablePoint === "function"){
    clear = creature.area.getNearestWalkablePoint(clear, perspace);
  }
  return clear;
}

/**
 * Install a two-point XY push path and force-push loco state.
 * Seeds one locomotion frame with delta 0 to initialize timers.
 */
export function installForcePushPath(
  creature: Creature,
  start: THREE.Vector3,
  end: THREE.Vector3
): void {
  _origin.copy(start);
  _dest.copy(end);
  const z0 = getWalkHeightAt(creature.area, _origin);
  const z1 = getWalkHeightAt(creature.area, _dest);
  if(Number.isFinite(z0)) _origin.z = z0;
  if(Number.isFinite(z1)) _dest.z = z1;

  creature.setComputedPath?.(ComputedPath.FromVector3List([
    _origin.clone(),
    _dest.clone(),
  ]));
  setCreatureLocoState(creature, FORCE_PUSH_LOCO_STATE);
  creature.forcePushDistanceTraveled = 0;
  creature.forcePushArrived = false;
  creature.forcePushArriveElapsed = 0;

  const dx = _dest.x - _origin.x;
  const dy = _dest.y - _origin.y;
  if(dx * dx + dy * dy < 1e-8){
    creature.forcePushArrived = true;
  }

  // Seed timers with a zero-delta locomotion tick on apply.
  tickForcePushLoco(creature, 0);
}

export function clearForcePushLoco(creature: Creature): void {
  if(!creature) return;
  setCreatureLocoState(creature, CreatureLocoState.PathWalk);
  creature.forcePushDistanceTraveled = 0;
  creature.forcePushArrived = false;
  creature.forcePushArriveElapsed = 0;
}

/**
 * Stamp the creator's current attack for attack-summary feedback
 * (FORCEPUSH set-state on the active attack).
 */
export function stampForcePushAttackSummary(
  creator: Creature | undefined,
  target: Creature
): void {
  if(!isCreature(creator)){
    return;
  }
  const round = creator.combatRound;
  if(!round?.attackList?.length) return;
  const idx = round.currentAttack | 0;
  if(idx < 0 || idx >= round.attackList.length) return;
  const attack = round.attackList[idx];
  if(!attack) return;
  attack.setStateType = 9;
  attack.setStateApplied = true;
  if(target?.id != null){
    attack.reactObject = target;
  }
}

export type ForcePushLocoResult = "moving" | "arrived" | "idle";

/**
 * Per-frame Force Push locomotion at FORCE_PUSH_SPEED.
 * Uses tickCreatureDrive for walkmesh clipping.
 */
export function tickForcePushLoco(
  creature: Creature,
  delta: number
): ForcePushLocoResult {
  if(!isForcePushLocoActive(creature)){
    return "idle";
  }
  const result = stepForcePushLoco(creature, delta);
  if(result === "arrived" && delta > 0){
    endForcePushLocoOnArrival(creature);
  }
  return result;
}

/**
 * Leaving loco 4/5/6 once the quick-walk arrives drops the creature to the
 * paused loco state, so a jumper or shoved creature can path-walk again.
 * The zero-delta seed tick on install never ends the slide.
 */
function endForcePushLocoOnArrival(creature: Creature): void {
  if(!creature.forcePushArrived) return;
  setCreatureLocoState(creature, CreatureLocoState.Paused);
  creature.forcePushDistanceTraveled = 0;
  creature.setComputedPath?.(undefined);
}

function stepForcePushLoco(
  creature: Creature,
  delta: number
): ForcePushLocoResult {

  if(creature.forcePushArrived){
    return "arrived";
  }

  const path = creature.getComputedPath?.();
  const points = path?.points;
  if(!points || points.length < 2){
    creature.forcePushArrived = true;
    return "arrived";
  }

  const end = points[points.length - 1].vector;
  const start = points[0].vector;
  const speed =
    getCreatureLocoState(creature) === FORCE_PUSH_LOCO_STATE
      ? FORCE_PUSH_SPEED
      : Math.hypot(end.x - start.x, end.y - start.y) * 3.030303;

  if(delta <= 0 || speed <= 0){
    return "moving";
  }

  const beforeX = creature.position.x;
  const beforeY = creature.position.y;
  const loco = getCreatureLocoState(creature);
  const source =
    loco === CreatureLocoState.ForceJump ||
    loco === CreatureLocoState.ForceJumpTarget
      ? MovementSource.Jump
      : MovementSource.ForcePush;
  const result = tickCreatureDrive(
    creature,
    end,
    false,
    delta,
    speed,
    source
  );

  const moved = Math.hypot(
    creature.position.x - beforeX,
    creature.position.y - beforeY
  );
  creature.forcePushDistanceTraveled =
    (creature.forcePushDistanceTraveled || 0) + moved;

  if(
    result === DriveUpdateResult.ARRIVED ||
    result === DriveUpdateResult.BLOCKED
  ){
    creature.forcePushDistanceTraveled = 0;
    creature.forcePushArrived = true;
    return "arrived";
  }

  const rem = Math.hypot(
    end.x - creature.position.x,
    end.y - creature.position.y
  );
  if(rem < 1e-4){
    creature.forcePushArrived = true;
    return "arrived";
  }

  return "moving";
}

/**
 * Force Push recovery: the pushed / land / get-up sequence outlives the
 * 0.1 s FORCEPUSH state. Started by EffectForcePushed, ticked every frame.
 */
export function startForcePushSequence(creature: Creature): void {
  if(!creature) return;
  creature.forcePushSequenceActive = true;
  creature.forcePushAnimPhase = -1;
  creature.fp_push_played = false;
  creature.fp_land_played = false;
  creature.fp_getup_played = false;
  creature.forcePushArriveElapsed = 0;
}

/** Pushed creature still sliding, lying down or getting up. */
export function isForcePushRecovering(creature: Creature | undefined): boolean {
  return !!creature?.forcePushSequenceActive;
}

/**
 * Per-frame recovery tick: advances the land / get-up timers once the slide
 * has arrived and ends the sequence after get-up.
 */
export function tickForcePushSequence(creature: Creature, delta: number): void {
  if(!creature?.forcePushSequenceActive) return;
  if(creature.isDead?.()){
    creature.forcePushSequenceActive = false;
    return;
  }
  updateForcePushAnimFlags(creature, delta);
  if(creature.fp_getup_played){
    finishForcePushSequence(creature);
    return;
  }
  // Slide, land and get-up each have their own clip; re-resolve the current
  // animation whenever the phase advances.
  const phase = getForcePushAnimPhase(creature);
  if(phase !== creature.forcePushAnimPhase){
    creature.forcePushAnimPhase = phase;
    const index = creature.animationState?.index;
    if(index) creature.setAnimationState?.(index);
  }
}

function getForcePushAnimPhase(creature: Creature): number {
  if(!creature.fp_push_played) return 0;
  if(!creature.fp_land_played) return 1;
  return 2;
}

/** Get-up done: restore the ambient pose and the idle / ready animation. */
export function finishForcePushSequence(creature: Creature): void {
  creature.forcePushSequenceActive = false;
  creature.forcePushArriveElapsed = 0;
  if(getCreatureLocoState(creature) === FORCE_PUSH_LOCO_STATE){
    setCreatureLocoState(creature, CreatureLocoState.Paused);
    creature.setComputedPath?.(undefined);
  }
  if(creature.hasSetState?.(9)) return;
  if((creature.ambientAnimState | 0) === ModuleCreatureAmbientState.PRONE_FORCE_PUSHED){
    creature.ambientAnimState = ModuleCreatureAmbientState.IDLE;
  }
  if(!creature.isDead?.()){
    creature.setAnimationState?.(
      creature.combatData?.combatState
        ? ModuleCreatureAnimState.READY
        : ModuleCreatureAnimState.PAUSE
    );
  }
}

/**
 * Drive fp_push / fp_land / fp_getup after slide completes.
 */
export function updateForcePushAnimFlags(
  creature: Creature,
  delta: number
): void {
  if(!creature) return;

  if(!creature.forcePushArrived && isForcePushLocoActive(creature)){
    return;
  }

  creature.fp_push_played = true;
  creature.forcePushArriveElapsed =
    (creature.forcePushArriveElapsed || 0) + Math.max(0, delta);

  if(creature.forcePushArriveElapsed >= FORCE_PUSH_ANIM_LAND){
    creature.fp_land_played = true;
  }
  if(
    creature.forcePushArriveElapsed >=
    FORCE_PUSH_ANIM_LAND + FORCE_PUSH_ANIM_GETUP
  ){
    creature.fp_getup_played = true;
  }
}
