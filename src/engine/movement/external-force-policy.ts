import * as THREE from "three";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import { getCreaturePersonalSpace } from "@engine/combat/attack-range";
import {
  findWalkableAttachmentAt,
  testCreatureMovement,
  testStaticMovement,
  WalkLineHitCode,
} from "@engine/movement/area-movement-queries";
import {
  collectBlockingWalkEdgeNormals,
  projectDesiredOntoNormals,
} from "@engine/movement/wall-slide";
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
const _slide = new THREE.Vector3();
const _probe = new THREE.Vector3();
const _edgeNormals: THREE.Vector3[] = [];

function segmentClear(
  creature: ModuleCreature,
  from: THREE.Vector3,
  to: THREE.Vector3
): boolean {
  const area = creature.area;
  if(!area) return false;
  const st = testStaticMovement(area, from, to, {
    owner: creature,
    personalSpace: getCreaturePersonalSpace(creature),
    softClearStartOverlap: true,
  });
  if(!st.clear || st.walkHit.code !== WalkLineHitCode.Ok) return false;
  const cr = testCreatureMovement(area, from, to, {
    owner: creature,
    allowPartyCreatures: true,
    softClearStartOverlap: true,
  });
  return cr.clear;
}

/**
 * Resolve an impulse displacement without mutating the creature.
 */
export function resolveExternalForceStep(
  creature: ModuleCreature,
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

  const staticHit = testStaticMovement(area, origin, _ideal, {
    owner: creature,
    personalSpace: getCreaturePersonalSpace(creature),
    collectHitInfo: true,
    softClearStartOverlap: true,
  });
  if(staticHit.clear){
    return finishExternal(creature, origin, _ideal, undefined);
  }

  const walkHit = staticHit.walkHit;
  const clipped =
    walkHit.clearT > 1e-4 ? walkHit.clearPoint.clone() : origin.clone();
  const usedLen = Math.hypot(clipped.x - origin.x, clipped.y - origin.y);
  const creperspace = getCreaturePersonalSpace(creature);

  collectBlockingWalkEdgeNormals(area, origin, creperspace, _edgeNormals);
  if(_edgeNormals.length){
    projectDesiredOntoNormals(_desired.x, _desired.y, _edgeNormals, _slide);
  }else{
    const n = walkHit.walkHit?.normal;
    if(n && (n.x !== 0 || n.y !== 0)){
      projectDesiredOntoNormals(_desired.x, _desired.y, [n], _slide);
    }else{
      _slide.set(0, 0, 0);
    }
  }

  const factors = [1, 0.75, 0.5, 0.25];
  const slideLen = Math.hypot(_slide.x, _slide.y);
  if(slideLen > 1e-8){
    for(const t of factors){
      _probe.set(
        origin.x + _slide.x * t,
        origin.y + _slide.y * t,
        origin.z
      );
      if(segmentClear(creature, origin, _probe)){
        return finishExternal(creature, origin, _probe, staticHit.hit);
      }
      if(usedLen > 1e-8){
        _probe.set(
          clipped.x + _slide.x * t,
          clipped.y + _slide.y * t,
          origin.z
        );
        if(segmentClear(creature, origin, _probe)){
          return finishExternal(creature, origin, _probe, staticHit.hit);
        }
      }
    }
  }

  if(usedLen > 1e-8 && segmentClear(creature, origin, clipped)){
    return finishExternal(creature, origin, clipped, staticHit.hit);
  }

  return {
    source: MovementSource.ExternalForce,
    status: MovementStatus.Blocked,
    origin,
    finalPosition: origin.clone(),
    acceptedDisplacement: empty,
    actualDistance: 0,
    hit: staticHit.hit ?? { kind: MovementHitKind.Walkmesh },
    incrementBlockingTimer: true,
  };
}

function finishExternal(
  creature: ModuleCreature,
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
  creature: ModuleCreature,
  desiredDisplacement: THREE.Vector3,
  delta = 0
): MovementResult {
  setMovementAuthority(creature, MovementAuthority.ExternalForce);
  const result = resolveExternalForceStep(creature, desiredDisplacement);
  commitMovement(creature, result, { delta });
  return result;
}
