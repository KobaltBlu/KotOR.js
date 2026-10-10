import * as THREE from "three";
import type { GameObject } from "@engine/module/GameObject";
import type { Creature } from "@engine/module/Creature";
import { recordMovementWrite } from "@engine/movement/instrumentation";
import { ensureMovementState } from "@engine/movement/creature-movement-state";
import { MovementSource } from "@engine/movement/types";
import { isCreature } from "@engine/module/guards/isCreature";
import { findWalkableAttachmentAt } from "@engine/movement/area-movement-queries";
import { applyWalkableAttachment } from "@engine/movement/apply-walkable-attachment";

/**
 * Authoritative placement / teleport.
 * Does not trace old→new, slide, set blockers, increment collision timers,
 * or fire OnBlocked.
 */

export type TeleportOptions = {
  /** Recompute ground face after placement (default true for creatures). */
  findGround?: boolean;
  /** Facing to apply after placement (radians). */
  facing?: number;
  /** Instant facing when set. */
  facingInstant?: boolean;
  caller?: string;
};

/**
 * Relocate an object without locomotion response.
 * Replaces the physics-settling behavior of GameObject.setPosition for teleports.
 */
export function teleportObject(
  object: GameObject,
  x: number | THREE.Vector3,
  y = 0,
  z = 0,
  options: TeleportOptions = {}
): void {
  if(x instanceof THREE.Vector3){
    z = x.z;
    y = x.y;
    x = x.x;
  }

  recordMovementWrite(object, "teleport", {
    source: MovementSource.Teleport,
    caller: options.caller ?? "teleportObject",
  });

  object.position.set(x, y, z);
  object.markCollisionMatrixDirty?.("position");
  object.computeBoundingBox?.();

  // Clear contact — teleport is not a collision event.
  const state = ensureMovementState(object);
  state.blockingObject = undefined;
  state.lastBlockingObject = undefined;

  const findGround = options.findGround ?? isCreature(object);
  if(findGround){
    if(object.collisionManager){
      object.collisionManager.groundFace = undefined;
      object.collisionManager.lastGroundFace = undefined;
    }
    const hit = findWalkableAttachmentAt(object.area, object.position, object.room);
    applyWalkableAttachment(object, hit);
  }

  if(typeof options.facing === "number" && isCreature(object)){
    (object as Creature).setFacing(
      options.facing,
      options.facingInstant !== false
    );
  }
}

/**
 * Placement helper used by Jump / spawn paths.
 */
export function applyLocalTeleport(
  creature: Creature,
  x: number,
  y: number,
  z: number,
  facing: number
): void {
  teleportObject(creature, x, y, z, {
    facing,
    facingInstant: true,
    findGround: true,
    caller: "applyLocalTeleport",
  });
}
