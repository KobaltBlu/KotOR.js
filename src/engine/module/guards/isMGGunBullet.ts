import type { GameObject } from "@engine/module/GameObject";
import type { MiniGameGunBullet } from "@engine/module/minigame/MiniGameGunBullet";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isMGGunBullet: (o: GameObject | undefined) => o is MiniGameGunBullet = (o): o is MiniGameGunBullet => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.MiniGameGunBullet);
}
