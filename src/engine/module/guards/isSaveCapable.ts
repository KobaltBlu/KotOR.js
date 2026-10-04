import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import type { ModuleDoor } from "@engine/module/ModuleDoor";
import type { ModulePlaceable } from "@engine/module/ModulePlaceable";
import { isCreature } from "@engine/module/guards/isCreature";
import { isDoor } from "@engine/module/guards/isDoor";
import { isPlaceable } from "@engine/module/guards/isPlaceable";

/** Creatures, doors, and placeables — the SaveCapable set. */
export type SaveCapableObject = ModuleCreature | ModuleDoor | ModulePlaceable;

export const isSaveCapable: (o: ModuleObject | undefined) => o is SaveCapableObject = (
  o
): o is SaveCapableObject => {
  return isCreature(o) || isDoor(o) || isPlaceable(o);
};
