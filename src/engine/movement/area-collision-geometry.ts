import type { Area } from "@engine/module/Area";
import type { Creature } from "@engine/module/Creature";
import type { Door } from "@engine/module/Door";
import type { GameObject } from "@engine/module/GameObject";
import type { Placeable } from "@engine/module/Placeable";
import type { AreaRoom } from "@engine/module/area/AreaRoom";

/**
 * Area collision geometry accessors.
 *
 * Geometry answers “what exists where?” — walkmeshes, door/placeable meshes,
 * room portals. It does not move creatures, set blockers, fire OnBlocked, or
 * increment collision timers. Dynamic solving belongs to movement policies +
 * AreaMovementQueries. Creature locomotion commits only via
 * MovementCommitter; discontinuous placement via teleportObject.
 */

export type AreaCollisionGeometry = {
  area: Area;
  rooms: AreaRoom[];
  doors: Door[];
  placeables: Placeable[];
  creatures: Creature[];
};

/**
 * Snapshot geometry lists for an area (passive; no mutation).
 */
export function getAreaCollisionGeometry(
  area: Area | undefined | null
): AreaCollisionGeometry | undefined {
  if(!area) return undefined;
  return {
    area,
    rooms: (area.rooms ?? []) as AreaRoom[],
    doors: (area.doors ?? []) as Door[],
    placeables: (area.placeables ?? []) as Placeable[],
    creatures: (area.creatures ?? []) as Creature[],
  };
}

/**
 * True when an object exposes a walkmesh used for static blocking.
 */
export function objectHasCollisionWalkmesh(object: GameObject | undefined): boolean {
  if(!object) return false;
  const wm = (object as GameObject & { collisionWalkmesh?: unknown; walkmesh?: unknown })
    .collisionWalkmesh ?? (object as GameObject & { walkmesh?: unknown }).walkmesh;
  return !!wm;
}
