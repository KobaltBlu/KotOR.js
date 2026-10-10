import type { GameObject } from "@engine/module/GameObject";
import type { MiniGameGunBank } from "@engine/module/MiniGameGunBank";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isMGGunBank: (o: GameObject | undefined) => o is MiniGameGunBank = (o): o is MiniGameGunBank => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.MiniGameGunBank);
}
