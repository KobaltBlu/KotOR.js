import type { GameObject } from "@engine/module/GameObject";
import type { Trigger } from "@engine/module/Trigger";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isTrigger: (o: GameObject | undefined) => o is Trigger = (o): o is Trigger => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Trigger);
}
