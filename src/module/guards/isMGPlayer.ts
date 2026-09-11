import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleMGPlayer } from "@/module/ModuleMGPlayer";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isMGPlayer = (o: ModuleObject | undefined): o is ModuleMGPlayer => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGPlayer);
}
