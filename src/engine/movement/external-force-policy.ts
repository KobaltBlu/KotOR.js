import * as THREE from "three";
import type { Creature } from "@engine/module/Creature";
import { getCreaturePersonalSpace } from "@engine/combat/attack-range";
import {
  findWalkableAttachmentAt,
  testCreatureMovement,
  testStaticMovement,
  WalkLineHitCode,
} from "@engine/movement/area-movement-queries";
import { solveCollideAndSlide } from "@engine/movement/collide-and-slide";
import {
  MovementHitKind,
  MovementSource,
  MovementStatus,
  type MovementResult,
} from "@engine/movement/types";
import { commitMovement } from "@engine/movement/movement-committer";
import { setMovementAuthority } from "@engine/movement/creature-movement-state";
import { MovementAuthority } from "@engine/movement/types";

/**
 * ExternalForce policy — shove / knockback / scripted impulse.
 * Not player-control: no stick escape fan, party solidity, or drive anim gates.
 * Reuses AreaMovementQueries + wall-slide + MovementCommitter.
 */

const _desired = new THREE.Vector3();
const _ideal = new THREE.Vector3();

/**
 * Resolve an impulse displacement without mutating the creature.
 */
export function resolveExternalForceStep(
  creature: Creature,
  desiredDisplacement: THREE.Vector3
): MovementResult {
  const origin = creature.position.clone();
  const empty = new THREE.Vector3();
  if(!creature.area || desiredDisplacement.lengthSq() < 1e-12){
    return {
      source: MovementSource.ExternalForce,
      status: MovementStatus.Moving,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: empty,
      actualDistance: 0,
    };
  }

  const area = creature.area;
  _desired.set(desiredDisplacement.x, desiredDisplacement.y, 0);
  _ideal.set(origin.x + _desired.x, origin.y + _desired.y, origin.z);

  const creatures = testCreatureMovement(area, origin, _ideal, {
    owner: creature,
    allowPartyCreatures: true,
    softClearStartOverlap: true,
  });
  if(!creatures.clear){
    return {
      source: MovementSource.ExternalForce,
      status: MovementStatus.Blocked,
      origin,
      finalPosition: origin.clone(),
      acceptedDisplacement: empty,
      actualDistance: 0,
      hit: creatures.hit,
      incrementBlockingTimer: true,
    };
  }

  const creperspace = getCreaturePersonalSpace(creature);
  const solve = solveCollideAndSlide(origin, _desired, {
    area,
    radius: creperspace,
    probe: (from, to) => {
      const st = testStaticMovement(area, from, to, {
        owner: creature,
        personalSpace: creperspace,
        collectHitInfo: true,
        softClearStartOverlap: true,
      });
      const clear = st.clear && st.walkHit.code === WalkLineHitCode.Ok;
      const n = st.walkHit.walkHit?.normal;
      return {
        clear,
        clearT: clear ? 1 : st.walkHit.clearT,
        normalX: n?.x,
        normalY: n?.y,
        // Walk-line clip normals are synthetic; trust only static/mesh hits.
        normalUsable:
          !!n &&
          st.walkHit.code !== WalkLineHitCode.NonWalk &&
          Math.hypot(n.x, n.y) > 1e-3 &&
          Math.abs(n.z) < 0.9,
        hit: clear ? undefined : (st.hit ?? { kind: MovementHitKind.Walkmesh }),
      };
    },
    validateLeg: (from, to) =>
      testCreatureMovement(area, from, to, {
        owner: creature,
        allowPartyCreatures: true,
        softClearStartOverlap: true,
      }).clear,
  });

  if(solve.unobstructed){
    return finishExternal(creature, origin, solve.position, undefined);
  }
  if(solve.moved > 1e-8){
    return finishExternal(creature, origin, solve.position, solve.hit);
  }

  return {
    source: MovementSource.ExternalForce,
    status: MovementStatus.Blocked,
    origin,
    finalPosition: origin.clone(),
    acceptedDisplacement: empty,
    actualDistance: 0,
    hit: solve.hit ?? { kind: MovementHitKind.Walkmesh },
    incrementBlockingTimer: true,
  };
}

function finishExternal(
  creature: Creature,
  origin: THREE.Vector3,
  dest: THREE.Vector3,
  hit: MovementResult["hit"]
): MovementResult {
  const attach = findWalkableAttachmentAt(creature.area, dest, creature.room);
  const finalPos = dest.clone();
  if(attach) finalPos.z = attach.z;
  const moved = Math.hypot(finalPos.x - origin.x, finalPos.y - origin.y);
  return {
    source: MovementSource.ExternalForce,
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

/**
 * Resolve + commit one external-force impulse frame.
 */
export function tickExternalForceStep(
  creature: Creature,
  desiredDisplacement: THREE.Vector3,
  delta = 0
): MovementResult {
  setMovementAuthority(creature, MovementAuthority.ExternalForce);
  const result = resolveExternalForceStep(creature, desiredDisplacement);
  commitMovement(creature, result, { delta });
  return result;
}
