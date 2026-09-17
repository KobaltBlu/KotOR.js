import type { ModuleArea } from "@/module/ModuleArea";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import type { ModuleRoom } from "@/module/ModuleRoom";

/**
 * Area collision geometry accessors.
 *
 * Geometry answers “what exists where?” — walkmeshes, door/placeable meshes,
 * room portals. It does not move creatures, set blockers, fire OnBlocked, or
 * increment collision timers. Dynamic solving belongs to movement policies +
 * AreaMovementQueries; legacy CollisionManager.updateCollision remains only for
 * residual force-coast until fully retired.
 */

export type AreaCollisionGeometry = {
  area: ModuleArea;
  rooms: ModuleRoom[];
  doors: ModuleDoor[];
  placeables: ModulePlaceable[];
  creatures: ModuleCreature[];
};

/**
 * Snapshot geometry lists for an area (passive; no mutation).
 */
export function getAreaCollisionGeometry(
  area: ModuleArea | undefined | null
): AreaCollisionGeometry | undefined {
  if(!area) return undefined;
  return {
    area,
    rooms: (area.rooms ?? []) as ModuleRoom[],
    doors: (area.doors ?? []) as ModuleDoor[],
    placeables: (area.placeables ?? []) as ModulePlaceable[],
    creatures: (area.creatures ?? []) as ModuleCreature[],
  };
}

/**
 * True when an object exposes a walkmesh used for static blocking.
 */
export function objectHasCollisionWalkmesh(object: ModuleObject | undefined): boolean {
  if(!object) return false;
  const wm = (object as ModuleObject & { collisionWalkmesh?: unknown; walkmesh?: unknown })
    .collisionWalkmesh ?? (object as ModuleObject & { walkmesh?: unknown }).walkmesh;
  return !!wm;
}
