import * as THREE from "three";
import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { Door } from "@engine/module/Door";
import type { GameObject } from "@engine/module/GameObject";
import type { AreaRoom } from "@engine/module/AreaRoom";
import type { OdysseyFace3 } from "@engine/render/three/odyssey";
import { getPathPersonalSpace, getCreaturePersonalSpace } from "@engine/combat/attack-range";
import {
  hasWalkLineClear,
  WalkLineHitCode,
  type WalkLineHit,
} from "@engine/pathfinding/walk-line-clear";
import {
  isCreatureCapsuleClear,
  type CreatureCapsuleClearResult,
} from "@engine/pathfinding/creature-capsule-clear";
import {
  MovementHitKind,
  type MovementHit,
} from "@engine/movement/types";

/**
 * Passive area movement queries.
 * Answer "what would happen?" — never mutate creature position, blockers, timers,
 * path state, force vectors, or fire events.
 */

export type StaticMovementQueryOptions = {
  owner?: Creature;
  personalSpace?: number;
  allowPartyCreatures?: boolean;
  collectHitInfo?: boolean;
  /** Soft-clear door/placeable start overlap (PlayerControl escape). */
  softClearStartOverlap?: boolean;
};

export type CreatureMovementQueryOptions = {
  owner?: Creature;
  allowPartyCreatures?: boolean;
  softClearStartOverlap?: boolean;
};

const _hitPos = new THREE.Vector3();

export function testWalkSegment(
  area: Area,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: StaticMovementQueryOptions = {}
): WalkLineHit {
  const perspace =
    options.personalSpace ??
    (options.owner ? getPathPersonalSpace(options.owner) : 0.5);
  return hasWalkLineClear(area, from, to, {
    owner: options.owner,
    personalSpace: perspace,
    checkCreatures: false,
    allowPartyCreatures: options.allowPartyCreatures ?? true,
    collectHitInfo: options.collectHitInfo,
    softClearStartOverlap: options.softClearStartOverlap,
  });
}

/**
 * Static/non-walk + walkmesh corridor test (perspace). Creatures not included.
 */
export function testStaticMovement(
  area: Area,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: StaticMovementQueryOptions = {}
): { clear: boolean; hit?: MovementHit; walkHit: WalkLineHit } {
  const walkHit = testWalkSegment(area, from, to, options);
  if(walkHit.code === WalkLineHitCode.Ok){
    return { clear: true, walkHit };
  }
  const kind =
    walkHit.code === WalkLineHitCode.DetailedBlock
      ? MovementHitKind.Static
      : MovementHitKind.Walkmesh;
  const hit: MovementHit = {
    kind,
    objectId: walkHit.blockingObjectId,
    position: walkHit.clearPoint.clone(),
    distance: walkHit.clearT,
  };
  return { clear: false, hit, walkHit };
}

/**
 * Creature capsule overlap along a segment (creperspace + 0.01).
 */
export function testCreatureMovement(
  area: Area,
  from: THREE.Vector3,
  to: THREE.Vector3,
  options: CreatureMovementQueryOptions = {}
): { clear: boolean; hit?: MovementHit; raw: CreatureCapsuleClearResult } {
  const raw = isCreatureCapsuleClear(area, from, to, {
    owner: options.owner,
    allowPartyCreatures: options.allowPartyCreatures ?? false,
    softClearStartOverlap: options.softClearStartOverlap,
  });
  if(raw.clear){
    return { clear: true, raw };
  }
  let object: GameObject | undefined;
  if(raw.blockingCreatureId != null){
    object =
      area.creatures?.find((c) => c.id === raw.blockingCreatureId) ??
      undefined;
  }
  const hit: MovementHit = {
    kind: MovementHitKind.Creature,
    object,
    creatureId: raw.blockingCreatureId,
  };
  return { clear: false, hit, raw };
}

/**
 * Retail-style personal-space radii used by queries (do not normalize).
 */
export function getActorPathRadius(creature: Creature): number {
  return getPathPersonalSpace(creature);
}

export function getActorCreatureRadius(creature: Creature): number {
  return getCreaturePersonalSpace(creature);
}

export type DoorCrossingHit = {
  door: Door;
  linkedOpen: boolean;
};

/**
 * Descriptive door-crossing probe. Does not signal OnClicked.
 * Plane = perpendicular to door.transitionLine (same as GetDoorCrossed /
 * testTransitionLineCrosses) — not door.facing, which often points along
 * the wall rather than through the doorway.
 */
export function queryDoorCrossing(
  area: Area | undefined,
  from: THREE.Vector3,
  to: THREE.Vector3
): DoorCrossingHit | undefined {
  if(!area?.doors?.length) return undefined;
  const fromLift = _hitPos.set(from.x, from.y, from.z + 0.5).clone();
  const toLift = new THREE.Vector3(to.x, to.y, to.z + 0.5);

  for(let i = 0; i < area.doors.length; i++){
    const door = area.doors[i];
    if(!door?.box) continue;
    const minX = Math.min(fromLift.x, toLift.x);
    const maxX = Math.max(fromLift.x, toLift.x);
    const minY = Math.min(fromLift.y, toLift.y);
    const maxY = Math.max(fromLift.y, toLift.y);
    if(maxX < door.box.min.x || minX > door.box.max.x) continue;
    if(maxY < door.box.min.y || minY > door.box.max.y) continue;
    if(!segmentHitsBox(fromLift, toLift, door.box)) continue;

    if(
      typeof door.segmentCrossesTransitionPlane === "function" &&
      !door.segmentCrossesTransitionPlane(
        fromLift.x,
        fromLift.y,
        toLift.x,
        toLift.y
      )
    ){
      continue;
    }

    const flags = (door.linkedToFlags | 0);
    const linkedModule = (door.getLinkedToModule?.() || "").trim();
    const linked = !!(linkedModule || flags === 1 || flags === 2);
    return {
      door,
      linkedOpen: !!(linked && door.isOpen?.()),
    };
  }
  return undefined;
}

function segmentHitsBox(
  a: THREE.Vector3,
  b: THREE.Vector3,
  box: THREE.Box3
): boolean {
  const mid = new THREE.Vector3();
  for(let i = 0; i <= 8; i++){
    const t = i / 8;
    mid.set(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
      a.z + (b.z - a.z) * t
    );
    if(box.containsPoint(mid)) return true;
  }
  return false;
}

/**
 * Ground / nearest walkable sample. Pure relative to caller — returns a clone.
 */
export function findGround(
  area: Area | undefined,
  point: THREE.Vector3,
  personalSpace = 0.1
): THREE.Vector3 | undefined {
  if(!area?.getNearestWalkablePoint) return undefined;
  const h = area.getNearestWalkablePoint(point, personalSpace);
  return h ? h.clone() : undefined;
}

/** Pure room/face attachment at a point (CollisionManager finalize search). */
export type WalkableAttachment = {
  room: AreaRoom;
  face: OdysseyFace3;
  /** World Z for feet on the face (+ small bias, matches CM). */
  z: number;
};

const _attachClosest = new THREE.Vector3();

function faceAttachmentAt(
  room: AreaRoom,
  point: THREE.Vector3
): WalkableAttachment | undefined {
  const faces = room.collisionManager?.walkmesh?.walkableFaces;
  if(!faces?.length) return undefined;
  for(let j = 0, jl = faces.length; j < jl; j++){
    const face = faces[j];
    if(!face?.pointInFace2d?.(point)) continue;
    const tri = face.triangle;
    if(tri?.closestPointToPoint){
      tri.closestPointToPoint(point, _attachClosest);
      return { room, face, z: _attachClosest.z + 0.005 };
    }
    return { room, face, z: point.z };
  }
  return undefined;
}

/**
 * Find walkable room + face under `point` without mutating creatures.
 * Prefers `preferRoom` (current attachment), then scans other area rooms.
 */
export function findWalkableAttachmentAt(
  area: Area | undefined,
  point: THREE.Vector3,
  preferRoom?: AreaRoom | null
): WalkableAttachment | undefined {
  if(!area?.rooms?.length || !point) return undefined;

  if(preferRoom){
    const hit = faceAttachmentAt(preferRoom, point);
    if(hit) return hit;
  }

  for(let i = 0, il = area.rooms.length; i < il; i++){
    const room = area.rooms[i];
    if(!room || room === preferRoom) continue;
    const hit = faceAttachmentAt(room, point);
    if(hit) return hit;
  }
  return undefined;
}

export { WalkLineHitCode };
