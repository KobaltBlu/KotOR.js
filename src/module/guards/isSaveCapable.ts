import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleDoor } from "@/module/ModuleDoor";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import { isCreature } from "@/module/guards/isCreature";
import { isDoor } from "@/module/guards/isDoor";
import { isPlaceable } from "@/module/guards/isPlaceable";

/** Creatures, doors, and placeables — the SaveCapable set. */
export type SaveCapableObject = ModuleCreature | ModuleDoor | ModulePlaceable;

export const isSaveCapable: (o: ModuleObject | undefined) => o is SaveCapableObject = (
  o
): o is SaveCapableObject => {
  return isCreature(o) || isDoor(o) || isPlaceable(o);
};
