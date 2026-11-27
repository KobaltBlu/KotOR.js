import type { GameObject } from "@engine/module/GameObject";
import type { Store } from "@engine/module/Store";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isStore: (o: GameObject | undefined) => o is Store = (o): o is Store => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Store);
}
