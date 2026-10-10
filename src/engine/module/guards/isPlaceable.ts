import type { GameObject } from "@engine/module/GameObject";
import type { Placeable } from "@engine/module/Placeable";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isPlaceable: (o: GameObject | undefined) => o is Placeable = (o): o is Placeable => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Placeable);
}