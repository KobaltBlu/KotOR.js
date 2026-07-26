import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleDoor } from "@/module/ModuleDoor";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

/**
 * Retail PathPointDFSGenerateSuccessors @ 004bdb00 — when NoNonWalkPolysDetailed
 * blocks an edge, drop it only for placeables or static doors. Non-static
 * (openable) doors keep the PTH successor so scripted opens can plot through.
 *
 * CSWSDoor.static is GFF "Static" at struct +0x3c0.
 */
export function isPthEdgeBlockedByObject(obj: ModuleObject | undefined | null): boolean {
  if(!obj) return false;
  if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModulePlaceable)){
    return true;
  }
  if(BitWise.InstanceOfObject(obj, ModuleObjectType.ModuleDoor)){
    return !!(obj as ModuleDoor).static;
  }
  return false;
}
