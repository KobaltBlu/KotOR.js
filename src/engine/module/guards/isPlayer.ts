import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModulePlayer } from "@engine/module/ModulePlayer";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isPlayer: (o: ModuleObject | undefined) => o is ModulePlayer = (o): o is ModulePlayer => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModulePlayer);
}
