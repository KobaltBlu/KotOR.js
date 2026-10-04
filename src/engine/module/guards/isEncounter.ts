import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleEncounter } from "@engine/module/ModuleEncounter";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isEncounter: (o: ModuleObject | undefined) => o is ModuleEncounter = (o): o is ModuleEncounter => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleEncounter);
}
