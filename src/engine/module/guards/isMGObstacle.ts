import type { GameObject } from "@engine/module/GameObject";
import type { MiniGameObstacle } from "@engine/module/MiniGameObstacle";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isMGObstacle: (o: GameObject | undefined) => o is MiniGameObstacle = (o): o is MiniGameObstacle => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.MiniGameObstacle);
}
