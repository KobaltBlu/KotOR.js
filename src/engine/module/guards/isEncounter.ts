import type { GameObject } from "@engine/module/GameObject";
import type { Encounter } from "@engine/module/Encounter";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isEncounter: (o: GameObject | undefined) => o is Encounter = (o): o is Encounter => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Encounter);
}
