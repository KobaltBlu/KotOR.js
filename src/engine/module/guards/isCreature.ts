import type { GameObject } from "@engine/module/GameObject";
import type { Creature } from "@engine/module/Creature";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isCreature: (o: GameObject | undefined) => o is Creature = (o): o is Creature => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Creature);
}