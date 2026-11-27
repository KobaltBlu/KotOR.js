import type { GameObject } from "@engine/module/GameObject";
import type { PlayerCharacter } from "@engine/module/PlayerCharacter";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isPlayer: (o: GameObject | undefined) => o is PlayerCharacter = (o): o is PlayerCharacter => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.PlayerCharacter);
}
