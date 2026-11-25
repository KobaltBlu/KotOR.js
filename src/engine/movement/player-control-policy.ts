import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import {
  findGround,
  findWalkableAttachmentAt,
  queryDoorCrossing,
  testCreatureMovement,
  testDriveStepClear,
  WalkLineHitCode,
} from "@engine/movement/area-movement-queries";
import type { DriveStepClearResult } from "@engine/pathfinding/drive-step-clear";
import {
  MovementHitKind,
  MovementSource,
  MovementStatus,
  type MovementHit,
  type MovementResult,
} from "@engine/movement/types";
import {
  collectBlockingWalkEdgeNormals,
  projectDesiredOntoNormals,
} from "@engine/movement/wall-slide";
import { solveCollideAndSlide } from "@engine/movement/collide-and-slide";
import { getCreaturePersonalSpace } from "@engine/combat/attack-range";
import { nudgeFriendlyCreatures } from "@engine/pathfinding/nudge-friendlies";
import { isCreature } from "@engine/module/guards/isCreature";
import { GameState } from "@engine/runtime/GameState";

/**
 * PlayerControl predicted-position resolve (SetPrecalculatedPosition-style).
 * Mutation-free: returns MovementResult for MovementCommitter.
 *
 * Direct control uses hard creature tests (no soft start-overlap) and
 * creperspace wall radius (matches old CollisionManager.getHitDistance).
 */

const _ideal = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _slide = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _edgeNormals: THREE.Vector3[] = [];

/** Hard creature options for WASD / direct control. */
const PLAYER_CREATURE_OPTS = {
  allowPartyCreatures: false,
  softClearStartOverlap: false,
} as const;

/**
 * Project desired XY onto the plane tangent to `normal` (remove into-wall component).
 * Exported for unit tests.
 */
export function projectOntoTangent(
  desiredX: number,
  desiredY: number,
  normalX: number,
  normalY: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const nLen = Math.hypot(normalX, normalY);
  if(nLen < 1e-8){
    return out.set(desiredX, desiredY, 0);
  }
  const nx = normalX / nLen;
  const ny = normalY / nLen;
  const vn = desiredX * nx + desiredY * ny;
  // Remove only the inward (negative) component — allow escape along normal.
  if(vn < 0){
    out.set(desiredX - nx * vn, desiredY - ny * vn, 0);
  }else{
    out.set(desiredX, desiredY, 0);
  }
  return out;
}

/**
 * True when a probe hit normal is usable for horizontal wall slide.
 * Near-Z / tiny-XY normals (flat Nonwalk skirts) must not suppress walk-edge
 * collection or drive projectOntoTangent.
 */
function isUsableWallNormalXY(n: THREE.Vector3 | undefined): boolean {
  if(!n) return false;
  const xy = Math.hypot(n.x, n.y);
  if(xy < 1e-3) return false;
  if(Math.abs(n.z) > 0.9) return false;
  return true;
}

function playerStaticOpts(creature: Creature, collectHitInfo = false){
  return {
    owner: creature,
    personalSpace: getCreaturePersonalSpace(creature),
    collectHitInfo,
    // Allow stepping out of a placeable/door the capsule already overlaps.
    softClearStartOverlap: true,
  };
}

function segmentClear(
  area: Area,
  creature: Creature,
  from: THREE.Vector3,
  to: THREE.Vector3
): boolean {
  const st = testDriveStepClear(area, from, to, playerStaticOpts(creature));
  if(!st.clear || st.code !== WalkLineHitCode.Ok) return false;
  const cr = testCreatureMovement(area, from, to, {
    owner: creature,
    ...PLAYER_CREATURE_OPTS,
  });
  return cr.clear;
}

function movementHitFromProbe(probe: DriveStepClearResult): MovementHit | undefined {
  if(probe.clear) return undefined;
  return {
    kind:
      probe.code === WalkLineHitCode.DetailedBlock
        ? MovementHitKind.Static
        : MovementHitKind.Walkmesh,
    objectId: probe.blockingObjectId,
    position: probe.clearPoint.clone(),
    distance: probe.clearT,
  };
}

function resolveBlocker(
  area: Area,
  creatureId: number | undefined
): Creature | undefined {
  if(creatureId == null) return undefined;
  const found =
    area.creatures?.find((c) => c.id === creatureId) ??
    GameState.PartyManager?.party?.find((c) => c.id === creatureId);
  return isCreature(found) ? (found as Creature) : undefined;
}

/**
 * Resolve a predicted displacement for player/direct control.
 * Does not mutate creature.position.
 */
export function resolvePlayerControlStep(
  creature: Creature,
  desiredDisplacement: THREE.Vector3
): MovementResult {
  const origin = creature.position.clone();
  const empty = new THREE.Vector3();
  if(!creature.area || desiredDisplacement.lengthSq() < 1e-12){
    return {
      source: MovementSource.PlayerControl,
      status: MovementStatus.Moving,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: empty,
      actualDistance: 0,
    };
  }

  const area = creature.area;
  _desired.set(desiredDisplacement.x, desiredDisplacement.y, 0);
  _ideal.set(
    origin.x + _desired.x,
    origin.y + _desired.y,
    origin.z
  );

  // Creature gate — hard overlap, party solid.
  const creatures = testCreatureMovement(area, origin, _ideal, {
    owner: creature,
    ...PLAYER_CREATURE_OPTS,
  });
  if(!creatures.clear){
    const blocker = resolveBlocker(area, creatures.hit?.creatureId);
    if(blocker){
      nudgeFriendlyCreatures(creature, blocker, _ideal, origin);
    }
    const retry = testCreatureMovement(area, origin, _ideal, {
      owner: creature,
      ...PLAYER_CREATURE_OPTS,
    });
    if(!retry.clear){
      const resolved = tryCreatureResponse(
        area,
        creature,
        origin,
        _desired,
        blocker,
        creatures.hit ?? retry.hit
      );
      if(resolved) return resolved;
      return {
        source: MovementSource.PlayerControl,
        status: MovementStatus.Blocked,
        origin,
        finalPosition: origin.clone(),
        acceptedDisplacement: empty,
        actualDistance: 0,
        hit: creatures.hit ?? retry.hit,
      };
    }
  }

  // Static collide-and-slide (walkmesh walls, placeables, doors). Creature
  // capsules are re-validated per leg with hard player options.
  const creperspace = getCreaturePersonalSpace(creature);
  const staticOpts = playerStaticOpts(creature, true);
  const idealX = _ideal.x;
  const idealY = _ideal.y;
  const solve = solveCollideAndSlide(origin, _desired, {
    area,
    radius: creperspace,
    probe: (from, to) => {
      const r = testDriveStepClear(area, from, to, staticOpts);
      const clear = r.clear && r.code === WalkLineHitCode.Ok;
      const n = r.normal ?? r.walkHit?.normal;
      return {
        clear,
        clearT: clear ? 1 : r.clearT,
        normalX: n?.x,
        normalY: n?.y,
        normalUsable: !r.normalSynthetic && isUsableWallNormalXY(n),
        hit: clear ? undefined : movementHitFromProbe(r),
      };
    },
    validateLeg: (from, to) => {
      // The creature gate above already cleared origin→ideal.
      if(
        from.x === origin.x && from.y === origin.y &&
        to.x === idealX && to.y === idealY
      ){
        return true;
      }
      return testCreatureMovement(area, from, to, {
        owner: creature,
        ...PLAYER_CREATURE_OPTS,
      }).clear;
    },
  });

  if(solve.unobstructed){
    return finishPlayerResult(creature, origin, _ideal, undefined);
  }
  if(solve.moved > 1e-8){
    return finishPlayerResult(creature, origin, solve.position, solve.hit);
  }

  // Capsule already overlapping a placeable/door (Static DetailedBlock): push
  // out — frame steps often cannot reach clear space via sliding alone.
  // Only when the start truly overlaps: merely resting against a wall must
  // not trigger a creperspace-sized shove away from it.
  if(
    solve.hit?.kind === MovementHitKind.Static &&
    startOverlapsStatic(area, creature, origin, _desired)
  ){
    const depen = tryPlaceableDepenetrate(
      area,
      creature,
      origin,
      _desired,
      solve.hit
    );
    if(depen) return depen;
  }

  return {
    source: MovementSource.PlayerControl,
    status: MovementStatus.Blocked,
    origin,
    finalPosition: origin.clone(),
    acceptedDisplacement: empty,
    actualDistance: 0,
    hit: solve.hit ?? { kind: MovementHitKind.Walkmesh },
  };
}

/**
 * True when the creature capsule at `origin` already overlaps static geometry.
 * A short step straight back from the desired motion with hard start tests
 * only fails if the start itself is embedded (contact alone stays clear).
 */
function startOverlapsStatic(
  area: Area,
  creature: Creature,
  origin: THREE.Vector3,
  desired: THREE.Vector3
): boolean {
  const len = Math.hypot(desired.x, desired.y);
  if(len < 1e-8) return false;
  const back = 0.02;
  _probe.set(
    origin.x - (desired.x / len) * back,
    origin.y - (desired.y / len) * back,
    origin.z
  );
  const r = testDriveStepClear(area, origin, _probe, {
    ...playerStaticOpts(creature),
    softClearStartOverlap: false,
  });
  return !(r.clear && r.code === WalkLineHitCode.Ok);
}

/** True when a hard-start probe from `at` outward along (ux, uy) is clear. */
function hardClearFrom(
  area: Area,
  creature: Creature,
  at: THREE.Vector3,
  ux: number,
  uy: number
): boolean {
  const to = new THREE.Vector3(at.x + ux * 0.02, at.y + uy * 0.02, at.z);
  const r = testDriveStepClear(area, at, to, {
    ...playerStaticOpts(creature),
    softClearStartOverlap: false,
  });
  return r.clear && r.code === WalkLineHitCode.Ok;
}

/**
 * Push out of an overlapping placeable/door capsule (wedge between props).
 * Soft static tests allow a clear dest even when start still touches edges.
 * Separation length is up to creperspace so one frame can exit a sub-radius gap.
 */
function tryPlaceableDepenetrate(
  area: Area,
  creature: Creature,
  origin: THREE.Vector3,
  desired: THREE.Vector3,
  hit: MovementResult["hit"]
): MovementResult | undefined {
  const creperspace = getCreaturePersonalSpace(creature);
  if(creperspace < 1e-8) return undefined;

  // Always refresh — prior resolve frames may leave stale perimeter normals.
  collectBlockingWalkEdgeNormals(area, origin, creperspace, _edgeNormals);

  const dirs: Array<{ x: number; y: number }> = [];
  for(let i = 0; i < _edgeNormals.length; i++){
    dirs.push({ x: _edgeNormals[i].x, y: _edgeNormals[i].y });
  }

  // Channel tangent after multi-normal projection (opposing pile normals → ±X).
  projectDesiredOntoNormals(
    desired.x,
    desired.y,
    _edgeNormals,
    _slide
  );
  let slideLen = Math.hypot(_slide.x, _slide.y);
  if(slideLen < 1e-8 && Math.hypot(desired.x, desired.y) > 1e-8){
    _slide.set(desired.x, desired.y, 0);
    slideLen = Math.hypot(_slide.x, _slide.y);
  }
  if(slideLen > 1e-8){
    dirs.push({ x: _slide.x / slideLen, y: _slide.y / slideLen });
    dirs.push({ x: -_slide.y / slideLen, y: _slide.x / slideLen });
    dirs.push({ x: _slide.y / slideLen, y: -_slide.x / slideLen });
  }

  if(!dirs.length){
    const aLen = Math.hypot(desired.x, desired.y);
    if(aLen < 1e-8) return undefined;
    dirs.push({ x: desired.x / aLen, y: desired.y / aLen });
    dirs.push({ x: -desired.y / aLen, y: desired.x / aLen });
    dirs.push({ x: desired.y / aLen, y: -desired.x / aLen });
  }

  // Smallest separation first: exit the overlap with the least visible
  // shove. A candidate "resolves" the overlap when a hard-start probe from
  // the destination can continue outward; otherwise keep the farthest
  // soft-clear candidate as a fallback so we still make progress.
  const lengths = [
    0.02,
    0.05,
    0.1,
    creperspace * 0.5,
    creperspace,
  ];

  const dxn = desired.x;
  const dyn = desired.y;
  const dLen = Math.hypot(dxn, dyn);
  let best: THREE.Vector3 | undefined;
  let fallback: THREE.Vector3 | undefined;
  let fallbackScore = -Infinity;

  for(let li = 0; li < lengths.length && !best; li++){
    const sep = lengths[li];
    let bestAlign = -Infinity;
    for(let d = 0; d < dirs.length; d++){
      const dir = dirs[d];
      const nLen = Math.hypot(dir.x, dir.y);
      if(nLen < 1e-8) continue;
      const ux = dir.x / nLen;
      const uy = dir.y / nLen;
      _probe.set(origin.x + ux * sep, origin.y + uy * sep, origin.z);
      if(!segmentClear(area, creature, origin, _probe)) continue;
      const align = dLen > 1e-8 ? (ux * dxn + uy * dyn) / dLen : 0;
      if(hardClearFrom(area, creature, _probe, ux, uy)){
        if(align > bestAlign){
          bestAlign = align;
          best = _probe.clone();
        }
      }else{
        const score = sep + Math.max(0, align) * creperspace;
        if(score > fallbackScore){
          fallbackScore = score;
          fallback = _probe.clone();
        }
      }
    }
  }
  if(!best) best = fallback;

  if(best){
    return finishPlayerResult(creature, origin, best, hit);
  }
  return undefined;
}

/**
 * Creature response: depenetrate if already overlapping, else CM-style tangent slide.
 * Hard segment tests reject every probe while stacked — so overlap must push apart
 * without requiring a clear start capsule.
 */
function tryCreatureResponse(
  area: Area,
  creature: Creature,
  origin: THREE.Vector3,
  desired: THREE.Vector3,
  blocker: Creature | undefined,
  hit: MovementHit | undefined
): MovementResult | undefined {
  if(blocker){
    const depen = tryCreatureDepenetrate(
      area,
      creature,
      origin,
      desired,
      blocker,
      hit
    );
    if(depen) return depen;
  }
  return tryCreatureSlide(area, creature, origin, desired, blocker, hit);
}

/**
 * Push out of an overlapping creature capsule (CollisionManager penetration response).
 * Destination must reduce overlap; start may remain overlapping.
 */
function tryCreatureDepenetrate(
  area: Area,
  creature: Creature,
  origin: THREE.Vector3,
  desired: THREE.Vector3,
  blocker: Creature,
  hit: MovementHit | undefined
): MovementResult | undefined {
  const minDist =
    getCreaturePersonalSpace(creature) +
    getCreaturePersonalSpace(blocker) +
    0.01;
  let dx = origin.x - blocker.position.x;
  let dy = origin.y - blocker.position.y;
  let dist = Math.hypot(dx, dy);
  if(dist >= minDist - 1e-4){
    return undefined; // not overlapping — slide path handles approach
  }

  // Separation normal: from blocker toward self (CM detectCreatureCollision).
  if(dist < 1e-4){
    const dLen = Math.hypot(desired.x, desired.y);
    if(dLen > 1e-8){
      dx = -desired.y / dLen;
      dy = desired.x / dLen;
    }else{
      dx = 1;
      dy = 0;
    }
    dist = 0;
  }else{
    dx /= dist;
    dy /= dist;
  }

  const penetration = minDist - dist;
  // Prefer full separation this frame when small; otherwise step out aggressively.
  const sep = Math.min(
    Math.max(penetration, 1e-3),
    Math.max(penetration, Math.hypot(desired.x, desired.y), minDist * 0.35)
  );

  // Tangent of desired (keep glide while exiting).
  projectOntoTangent(desired.x, desired.y, dx, dy, _slide);

  const candidates: Array<{ x: number; y: number }> = [
    { x: dx * sep + _slide.x, y: dy * sep + _slide.y },
    { x: dx * sep, y: dy * sep },
    { x: dx * sep * 0.75 + _slide.x * 0.5, y: dy * sep * 0.75 + _slide.y * 0.5 },
    { x: dx * sep * 0.5, y: dy * sep * 0.5 },
    { x: dx * Math.min(sep, 0.05), y: dy * Math.min(sep, 0.05) },
  ];

  for(const c of candidates){
    _probe.set(origin.x + c.x, origin.y + c.y, origin.z);
    if(!destinationSeparates(area, creature, origin, _probe, blocker, minDist)){
      continue;
    }
    return finishPlayerResult(creature, origin, _probe, hit);
  }
  return undefined;
}

/**
 * Accept dest if static-clear and farther from blocker than origin (or outside capsule).
 * Uses soft start-overlap for the creature segment so stacked origins can still exit.
 */
function destinationSeparates(
  area: Area,
  creature: Creature,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  blocker: Creature,
  minDist: number
): boolean {
  const st = testDriveStepClear(area, origin, dest, playerStaticOpts(creature));
  if(!st.clear || st.code !== WalkLineHitCode.Ok) return false;

  const odx = dest.x - blocker.position.x;
  const ody = dest.y - blocker.position.y;
  const destDist = Math.hypot(odx, ody);
  const ox = origin.x - blocker.position.x;
  const oy = origin.y - blocker.position.y;
  const originDist = Math.hypot(ox, oy);
  // Must not dig deeper into the capsule.
  if(destDist + 1e-4 < originDist) return false;

  // Other creatures: soft-clear start so we can leave the stack; still block if
  // the destination embeds into a different creature.
  const cr = testCreatureMovement(area, origin, dest, {
    owner: creature,
    allowPartyCreatures: false,
    softClearStartOverlap: true,
  });
  if(cr.clear) return true;
  if(cr.hit?.creatureId === blocker.id){
    // Still only the same blocker — require we are leaving or at least not deeper.
    return destDist >= Math.min(minDist, originDist + 1e-3);
  }
  return false;
}

/**
 * Slide along separation tangent when a creature blocks the ideal step.
 */
function tryCreatureSlide(
  area: Area,
  creature: Creature,
  origin: THREE.Vector3,
  desired: THREE.Vector3,
  blocker: Creature | undefined,
  hit: MovementHit | undefined
): MovementResult | undefined {
  const len = Math.hypot(desired.x, desired.y);
  if(len < 1e-8) return undefined;

  let nx: number;
  let ny: number;
  if(blocker){
    // Outward from blocker toward self (same as CM).
    nx = origin.x - blocker.position.x;
    ny = origin.y - blocker.position.y;
    const nLen = Math.hypot(nx, ny);
    if(nLen < 1e-6){
      nx = -desired.y / len;
      ny = desired.x / len;
    }else{
      nx /= nLen;
      ny /= nLen;
    }
  }else{
    nx = desired.x / len;
    ny = desired.y / len;
  }

  // Outward normal: motion into creature has desired · n < 0 and is stripped.
  projectOntoTangent(desired.x, desired.y, nx, ny, _slide);

  const slideLen = Math.hypot(_slide.x, _slide.y);
  if(slideLen < 1e-8) return undefined;

  const candidates: Array<{ x: number; y: number }> = [
    { x: _slide.x, y: _slide.y },
    { x: _slide.x * 0.75, y: _slide.y * 0.75 },
    { x: _slide.x * 0.5, y: _slide.y * 0.5 },
    { x: _slide.x * 0.25, y: _slide.y * 0.25 },
  ];
  const px = -ny;
  const py = nx;
  for(const sign of [-1, 1]){
    for(let i = 1; i <= 4; i++){
      const scale = 1 - i * 0.2;
      candidates.push({
        x: (desired.x / len) * scale * len + px * sign * 0.35 * (1 - scale) * len,
        y: (desired.y / len) * scale * len + py * sign * 0.35 * (1 - scale) * len,
      });
    }
  }

  let best: THREE.Vector3 | undefined;
  let bestDot = -1;
  const dxn = desired.x / len;
  const dyn = desired.y / len;
  for(const c of candidates){
    _probe.set(origin.x + c.x, origin.y + c.y, origin.z);
    // Prefer hard clear; if start-overlapping, allow separating destinations.
    const hardOk = segmentClear(area, creature, origin, _probe);
    const softOk =
      !hardOk &&
      !!blocker &&
      destinationSeparates(
        area,
        creature,
        origin,
        _probe,
        blocker,
        getCreaturePersonalSpace(creature) +
          getCreaturePersonalSpace(blocker) +
          0.01
      );
    if(!hardOk && !softOk) continue;
    const moved = Math.hypot(c.x, c.y);
    if(moved < 1e-8) continue;
    const dot = (c.x * dxn + c.y * dyn) / moved;
    if(dot > bestDot){
      bestDot = dot;
      best = _probe.clone();
    }
  }
  if(best){
    return finishPlayerResult(creature, origin, best, hit);
  }
  return undefined;
}

function finishPlayerResult(
  creature: Creature,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  hit: MovementResult["hit"]
): MovementResult {
  const empty = new THREE.Vector3();
  // Linked open door plane cross — reject XY and let committer warp (same as Drive).
  const crossed = queryDoorCrossing(creature.area, origin, dest);
  if(crossed?.linkedOpen){
    return {
      source: MovementSource.PlayerControl,
      status: MovementStatus.Blocked,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: empty,
      actualDistance: 0,
      crossedTransition: crossed.door,
      blockAfterDoorSignal: true,
      hit: { kind: MovementHitKind.Door, object: crossed.door },
      incrementBlockingTimer: true,
    };
  }

  const attach = findWalkableAttachmentAt(creature.area, dest, creature.room);
  const finalPos = dest.clone();
  if(attach){
    finalPos.z = attach.z;
  }else{
    const ground = findGround(creature.area, dest, 0.1);
    if(ground) finalPos.z = ground.z;
  }
  const moved = Math.hypot(finalPos.x - origin.x, finalPos.y - origin.y);
  return {
    source: MovementSource.PlayerControl,
    status: moved < 1e-8 ? MovementStatus.Blocked : MovementStatus.Moving,
    origin,
    finalPosition: finalPos,
    acceptedDisplacement: new THREE.Vector3(
      finalPos.x - origin.x,
      finalPos.y - origin.y,
      finalPos.z - origin.z
    ),
    actualDistance: moved,
    hit,
    room: attach?.room,
    groundFace: attach?.face,
  };
}
