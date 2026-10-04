import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleMGPlayer } from "@engine/module/ModuleMGPlayer";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isMGPlayer: (o: ModuleObject | undefined) => o is ModuleMGPlayer = (o): o is ModuleMGPlayer => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGPlayer);
}
