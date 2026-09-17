import type { ModuleObject } from "@/module/ModuleObject";
import type { WalkableAttachment } from "@/engine/movement/area-movement-queries";

/**
 * Apply a pure walkable attachment probe to an object (room + ground + Z).
 * Does not slide, block, or fire OnBlocked — use after findWalkableAttachmentAt
 * or as part of teleport/placement.
 */
export function applyWalkableAttachment(
  object: ModuleObject,
  attachment: WalkableAttachment | undefined
): void {
  if(!object || !attachment) return;

  if(typeof object.attachToRoom === "function"){
    object.attachToRoom(attachment.room);
  }

  const cm =
    object.collisionContext ??
    object.collisionManager;
  if(cm){
    cm.groundFace = attachment.face;
    cm.lastGroundFace = attachment.face;
    if(typeof (attachment.face as { walkIndex?: number }).walkIndex === "number"){
      cm.surfaceId = (attachment.face as { walkIndex: number }).walkIndex;
    }
  }

  object.position.z = attachment.z;
  object.markCollisionMatrixDirty?.("attachment");
}
