import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleEncounter } from "@/module/ModuleEncounter";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isEncounter: (o: ModuleObject | undefined) => o is ModuleEncounter = (o): o is ModuleEncounter => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleEncounter);
}
