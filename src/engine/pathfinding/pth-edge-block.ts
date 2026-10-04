import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleDoor } from "@engine/module/ModuleDoor";
import { isDoor } from "@engine/module/guards/isDoor";
import { isPlaceable } from "@engine/module/guards/isPlaceable";

/**
 * PathPointDFSGenerateSuccessors — when static walk blockers (detailed)
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
