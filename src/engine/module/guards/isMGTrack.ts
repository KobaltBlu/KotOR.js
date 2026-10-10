import type { GameObject } from "@engine/module/GameObject";
import type { MiniGameTrack } from "@engine/module/minigame/MiniGameTrack";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isMGTrack: (o: GameObject | undefined) => o is MiniGameTrack = (o): o is MiniGameTrack => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.MiniGameTrack);
}
