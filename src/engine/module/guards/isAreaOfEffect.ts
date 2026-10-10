import type { GameObject } from "@engine/module/GameObject";
import type { AreaEffect } from "@engine/module/AreaEffect";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isAreaOfEffect: (o: GameObject | undefined) => o is AreaEffect = (o): o is AreaEffect => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.AreaEffect);
}
