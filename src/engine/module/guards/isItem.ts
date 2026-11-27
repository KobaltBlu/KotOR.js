import type { GameObject } from "@engine/module/GameObject";
import type { Item } from "@engine/module/Item";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isItem: (o: GameObject | undefined) => o is Item = (o): o is Item => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Item);
}
