import type { GameObject } from "@engine/module/GameObject";
import type { MiniGameEnemy } from "@engine/module/minigame/MiniGameEnemy";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isMGEnemy: (o: GameObject | undefined) => o is MiniGameEnemy = (o): o is MiniGameEnemy => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.MiniGameEnemy);
}
