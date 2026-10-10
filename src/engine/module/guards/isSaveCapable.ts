import type { GameObject } from "@engine/module/GameObject";
import type { Creature } from "@engine/module/Creature";
import type { Door } from "@engine/module/Door";
import type { Placeable } from "@engine/module/Placeable";
import { isCreature } from "@engine/module/guards/isCreature";
import { isDoor } from "@engine/module/guards/isDoor";
import { isPlaceable } from "@engine/module/guards/isPlaceable";

/** Creatures, doors, and placeables — the SaveCapable set. */
export type SaveCapableObject = Creature | Door | Placeable;

export const isSaveCapable: (o: GameObject | undefined) => o is SaveCapableObject = (
  o
): o is SaveCapableObject => {
  return isCreature(o) || isDoor(o) || isPlaceable(o);
};
