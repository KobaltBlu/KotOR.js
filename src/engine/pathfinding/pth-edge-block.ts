import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleDoor } from "@/module/ModuleDoor";
import { isDoor } from "@/module/guards/isDoor";
import { isPlaceable } from "@/module/guards/isPlaceable";

/**
 * PathPointDFSGenerateSuccessors — when NoNonWalkPolysDetailed
 * blocks an edge, drop it only for placeables or static doors. Non-static
 * (openable) doors keep the PTH successor so scripted opens can plot through.
 *
 * door.static is GFF "Static" at struct.
 */
export function isPthEdgeBlockedByObject(obj: ModuleObject | undefined | null): boolean {
  if(!obj) return false;
  if(isPlaceable(obj)){
    return true;
  }
  if(isDoor(obj)){
    return !!(obj as ModuleDoor).static;
  }
  return false;
}
