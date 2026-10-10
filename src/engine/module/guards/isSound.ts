import type { GameObject } from "@engine/module/GameObject";
import type { Sound } from "@engine/module/Sound";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isSound: (o: GameObject | undefined) => o is Sound = (o): o is Sound => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Sound);
}
