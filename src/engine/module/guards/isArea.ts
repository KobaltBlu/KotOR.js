import type { GameObject } from "@engine/module/GameObject";
import type { Area } from "@engine/module/Area";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isArea: (o: GameObject | undefined) => o is Area = (o): o is Area => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Area);
}
