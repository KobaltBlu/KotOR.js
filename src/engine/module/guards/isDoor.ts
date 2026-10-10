import type { GameObject } from "@engine/module/GameObject";
import type { Door } from "@engine/module/Door";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isDoor: (o: GameObject | undefined) => o is Door = (o): o is Door => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Door);
}
