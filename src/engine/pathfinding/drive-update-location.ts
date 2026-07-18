import * as THREE from "three";
import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { GameState } from "@/GameState";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { SignalEventType } from "@/enums/events/SignalEventType";
import { noCreaturesOnLine } from "@/engine/pathfinding/no-creatures-on-line";
import { bumpFriends } from "@/engine/pathfinding/bump-friends";
import {
  testDirectLine,
  TestDirectLineCode,
} from "@/engine/pathfinding/test-direct-line";

/**
 * Retail CSWSCreature::DriveUpdateLocation @ 0051cd20 + GetDoorCrossed @ 005064d0
 * + WalkUpdateLocationTestDistance creature/BumpFriends gate @ 00512fd0
 * + AIActionDrive TestDirectLine binary/wall-slide @ 0051e6a0.
 *
 * Moves toward the path point by walk/run × delta, clips via TestDirectLine
 * (NoNonWalkPolysDetailed), NoCreaturesOnLine + BumpFriends, fires OnClicked
 * (0x1e) when crossing open linked doors.
 *
 * @file drive-update-location.ts
 */

export enum DriveUpdateResult {
  /** Moved (retail return 1) */
  OK = 1,
  /** Snapped to / reached path point (retail return 2) */
  ARRIVED = 2,
  /** Blocked by walkmesh / creature / linked door (retail return 3) */
  BLOCKED = 3,
}

const _from = new THREE.Vector3();
const _to = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _next = new THREE.Vector3();
const _sample = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _lo = new THREE.Vector3();
const _hi = new THREE.Vector3();

function isLinkedTransitionDoor(door: ModuleDoor): boolean {
  const flags = (door.linkedToFlags | 0);
  const linkedModule = (door.getLinkedToModule?.() || '').trim();
  return !!(linkedModule || flags === 1 || flags === 2);
}

/**
 * Approximate GetDoorCrossed: segment from→to crosses an open linked door box
 * with facing-side flip (retail orientation plane test).
 */
export function getDoorCrossed(
  area: ModuleArea | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3
): ModuleDoor | undefined {
  if(!area?.doors?.length) return undefined;
  _from.set(from.x, from.y, from.z + 0.5);
  _to.set(to.x, to.y, to.z + 0.5);

  for(let i = 0; i < area.doors.length; i++){
    const door = area.doors[i];
    if(!door?.box) continue;
    // Quick reject: segment AABB vs door box
    const minX = Math.min(_from.x, _to.x);
    const maxX = Math.max(_from.x, _to.x);
    const minY = Math.min(_from.y, _to.y);
    const maxY = Math.max(_from.y, _to.y);
    if(maxX < door.box.min.x || minX > door.box.max.x) continue;
    if(maxY < door.box.min.y || minY > door.box.max.y) continue;
    if(!_segmentHitsBox(_from, _to, door.box)) continue;

    // Facing-side flip: start and end on opposite sides of door plane
    const fx = Math.cos(door.facing || 0);
    const fy = Math.sin(door.facing || 0);
    const dStart =
      (_from.x - door.position.x) * fx +
      (_from.y - door.position.y) * fy;
    const dEnd =
      (_to.x - door.position.x) * fx +
      (_to.y - door.position.y) * fy;
    if((dStart > 0) === (dEnd > 0)) continue;

    return door;
  }
  return undefined;
}

function _segmentHitsBox(a: THREE.Vector3, b: THREE.Vector3, box: THREE.Box3): boolean {
  // Sample along segment
  for(let i = 0; i <= 8; i++){
    const t = i / 8;
    _mid.set(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t
    );
    if(box.containsPoint(_mid)) return true;
  }
  return false;
}

const _slideLeft = new THREE.Vector3();
const _slideRight = new THREE.Vector3();
const _slideProbe = new THREE.Vector3();
const _slideBest = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

function lineOk(code: TestDirectLineCode): boolean {
  return code === TestDirectLineCode.Ok;
}

/**
 * AIActionDrive @ 0051e6a0 — TestDirectLine to ideal; on fail binary-search
 * fraction then ±perpendicular wall-slide (up to 15 iters). Uses
 * NoNonWalkPolysDetailed via testDirectLine (hitinfo path).
 */
export function driveResolveMoveTarget(
  area: ModuleArea,
  origin: THREE.Vector3,
  ideal: THREE.Vector3,
  creature: ModuleCreature,
  stepLen?: number
): THREE.Vector3 {
  // AIActionDrive: NoCreaturesOnLine → BumpFriends before TestDirectLine
  const creatures = noCreaturesOnLine(area, origin, ideal, {
    owner: creature,
    allowPartyCreatures: false,
  });
  if(!creatures.clear && creatures.blockingCreatureId != null){
    const blocker =
      area.creatures?.find((c) => c.id === creatures.blockingCreatureId) ??
      GameState.PartyManager?.party?.find((c) => c.id === creatures.blockingCreatureId);
    if(BitWise.InstanceOfObject(blocker, ModuleObjectType.ModuleCreature)){
      bumpFriends(creature, blocker as ModuleCreature, ideal, origin);
    }
  }

  const perspace = getPathPersonalSpace(creature);
  const full = testDirectLine(area, origin, ideal, {
    owner: creature,
    personalSpace: perspace,
    checkCreatures: false,
    allowPartyCreatures: true,
  });
  if(lineOk(full.code)){
    return ideal.clone();
  }

  // Binary search along origin→ideal (retail fStack_134=0.5, fStack_130=0.25)
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
    const mid = testDirectLine(area, origin, _sample, {
      owner: creature,
      personalSpace: perspace,
      checkCreatures: false,
      allowPartyCreatures: true,
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

  // Wall-slide: accumulate ±perpendicular of intended move (retail VStack_bc / perp)
  _moveDir.set(ideal.x - origin.x, ideal.y - origin.y, 0);
  if(_moveDir.lengthSq() < 1e-10){
    return origin.clone();
  }
  _moveDir.normalize();
  // left = (-y, x), right = (y, -x) relative to move
  _slideLeft.set(-_moveDir.y, _moveDir.x, 0);
  _slideRight.set(_moveDir.y, -_moveDir.x, 0);

  const len =
    typeof stepLen === 'number' && stepLen > 0
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
      const hit = testDirectLine(area, origin, _slideProbe, {
        owner: creature,
        personalSpace: perspace,
        checkCreatures: false,
        allowPartyCreatures: true,
      });
      if(lineOk(hit.code)){
        const dot = leftDir.x * _moveDir.x + leftDir.y * _moveDir.y;
        if(dot > bestDot){
          bestDot = dot;
          best = _slideProbe.clone();
        }
        // Keep sliding further left of intended
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
      const hit = testDirectLine(area, origin, _slideProbe, {
        owner: creature,
        personalSpace: perspace,
        checkCreatures: false,
        allowPartyCreatures: true,
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

  // Retail: slide step length *= max(dot, 0.25) via field398 speed factor
  if(best){
    const factor = Math.max(0.25, Math.min(1, bestDot > 0 ? bestDot : 0.25));
    if(creature){
      creature.locomotionScale = factor;
    }
    return best;
  }
  return origin.clone();
}

/**
 * Per-frame clip along origin→ideal via TestDirectLine clear fraction
 * (NoNonWalkPolysDetailed), with isPointWalkable fallback.
 */
function clipWalkable(
  area: ModuleArea,
  origin: THREE.Vector3,
  ideal: THREE.Vector3,
  creature: ModuleCreature
): THREE.Vector3 {
  const perspace = getPathPersonalSpace(creature);
  const hit = testDirectLine(area, origin, ideal, {
    owner: creature,
    personalSpace: perspace,
    checkCreatures: false,
    allowPartyCreatures: true,
    collectHitInfo: true,
  });
  if(lineOk(hit.code)){
    return ideal.clone();
  }
  if(hit.clearT > 1e-4){
    _lo.copy(hit.clearPoint);
    if(area.getNearestWalkablePoint){
      return area.getNearestWalkablePoint(_lo, perspace);
    }
    return _lo.clone();
  }

  // Fallback binary isPointWalkable when TestDirectLine gives no clearT
  _lo.copy(origin);
  const steps = 8;
  for(let i = 1; i <= steps; i++){
    const t = i / steps;
    _sample.set(
      origin.x + (ideal.x - origin.x) * t,
      origin.y + (ideal.y - origin.y) * t,
      origin.z + (ideal.z - origin.z) * t
    );
    if(typeof area.isPointWalkable === 'function' && !area.isPointWalkable(_sample)){
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

/** Queue Door OnClicked (script event 0x1e) — retail DriveUpdateLocation linked-door path. */
function signalDoorClicked(creature: ModuleCreature, door: ModuleDoor){
  const tm = GameState.module?.timeManager;
  const event = new GameState.GameEventFactory.EventSignalEvent();
  event.setCaller(creature);
  event.setObject(door);
  event.setDay(tm?.pauseDay ?? 0);
  event.setTime(tm?.pauseTime ?? 0);
  event.eventType = SignalEventType.OnClicked;
  GameState.module?.addEvent?.(event);
}

/**
 * Retail DriveUpdateLocation — one frame of drive motion toward dest.
 * @param running Use run rate (retail param_1).
 * @param rateOverride Optional world-units/sec (strafe 0x275e/0x275f → 1.6).
 */
export function driveUpdateLocation(
  creature: ModuleCreature,
  dest: THREE.Vector3,
  running: boolean,
  delta: number,
  rateOverride?: number
): DriveUpdateResult {
  if(!creature?.area || !dest) return DriveUpdateResult.BLOCKED;

  const area = creature.area;
  const walk = creature.getWalkSpeed?.() || 1.7;
  const run = creature.getRunSpeed?.() || 5.4;
  let speed =
    typeof rateOverride === 'number' && rateOverride > 0
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
  if(step <= 1e-8) return DriveUpdateResult.OK;

  _dir.set(dest.x - creature.position.x, dest.y - creature.position.y, 0);
  const distSq = _dir.lengthSq();
  if(distSq <= 1e-10){
    creature.speed = 0;
    return DriveUpdateResult.ARRIVED;
  }

  _dir.normalize();
  let arrived = false;
  if(distSq <= step * step){
    _next.copy(dest);
    arrived = true;
  }else{
    _next.set(
      creature.position.x + _dir.x * step,
      creature.position.y + _dir.y * step,
      creature.position.z
    );
  }

  const perspace = getPathPersonalSpace(creature);
  const clipped = clipWalkable(area, creature.position, _next, creature);
  if(
    Math.abs(clipped.x - creature.position.x) < 1e-5 &&
    Math.abs(clipped.y - creature.position.y) < 1e-5
  ){
    if(arrived) return DriveUpdateResult.ARRIVED;
    creature.speed = 0;
    return DriveUpdateResult.BLOCKED;
  }

  // DriveUpdateLocation @ 0051cd20: NoCreaturesOnLine only (no BumpFriends —
  // bump happens in AIActionDrive / WalkUpdate / driveResolveMoveTarget).
  // Party members are soft-bumped earlier; do not hard-block the final step.
  const creatures = noCreaturesOnLine(area, creature.position, clipped, {
    owner: creature,
    allowPartyCreatures: true,
  });
  if(!creatures.clear){
    if(creatures.blockingCreatureId != null && creature.collisionManager){
      creature.collisionManager.blockingObject =
        area.creatures?.find((c) => c.id === creatures.blockingCreatureId) ??
        GameState.PartyManager?.party?.find((c) => c.id === creatures.blockingCreatureId);
    }
    creature.speed = 0;
    return DriveUpdateResult.BLOCKED;
  }
  if(creature.collisionManager){
    creature.collisionManager.blockingObject = undefined;
  }

  // Linked open door crossed → SignalEvent OnClicked (0x1e) then return 3
  const crossed = getDoorCrossed(area, creature.position, clipped);
  if(crossed && crossed.isOpen?.() && isLinkedTransitionDoor(crossed)){
    signalDoorClicked(creature, crossed);
    creature.speed = 0;
    return DriveUpdateResult.BLOCKED;
  }

  const moved = Math.hypot(
    clipped.x - creature.position.x,
    clipped.y - creature.position.y
  );
  creature.position.x = clipped.x;
  creature.position.y = clipped.y;
  if(area.getNearestWalkablePoint){
    const h = area.getNearestWalkablePoint(clipped, 0.1);
    if(h) creature.position.z = h.z;
  }
  creature.updateCollision?.(delta);
  creature.force = 0;
  creature.speed = delta > 1e-8 ? moved / delta : 0;

  return arrived ? DriveUpdateResult.ARRIVED : DriveUpdateResult.OK;
}
