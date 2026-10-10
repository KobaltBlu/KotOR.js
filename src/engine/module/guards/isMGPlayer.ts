import type { GameObject } from "@engine/module/GameObject";
import type { MiniGamePlayer } from "@engine/module/minigame/MiniGamePlayer";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isMGPlayer: (o: GameObject | undefined) => o is MiniGamePlayer = (o): o is MiniGamePlayer => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.MiniGamePlayer);
}
