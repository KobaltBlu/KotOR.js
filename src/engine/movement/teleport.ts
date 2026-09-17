import * as THREE from "three";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { recordMovementWrite } from "@/engine/movement/instrumentation";
import { ensureMovementState } from "@/engine/movement/creature-movement-state";
import { MovementSource } from "@/engine/movement/types";
import { isCreature } from "@/module/guards/isCreature";

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
 * Replaces the physics-settling behavior of ModuleObject.setPosition for teleports.
 */
export function teleportObject(
  object: ModuleObject,
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
  if(object.collisionManager){
    object.collisionManager.blockingObject = undefined as any;
  }

  const findGround = options.findGround ?? isCreature(object);
  if(findGround && object.collisionManager){
    object.collisionManager.groundFace = undefined;
    object.collisionManager.lastGroundFace = undefined;
    object.collisionManager.findWalkableFace?.(object);
  }

  if(typeof options.facing === "number" && isCreature(object)){
    (object as ModuleCreature).setFacing(
      options.facing,
      options.facingInstant !== false
    );
  }
}

/**
 * Placement helper used by Jump / spawn paths.
 */
export function applyLocalTeleport(
  creature: ModuleCreature,
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
