import type { GameObject } from "@engine/module/GameObject";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isGameObject: (o: GameObject | undefined) => o is GameObject = (o): o is GameObject => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.GameObject);
}
