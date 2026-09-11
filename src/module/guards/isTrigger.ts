import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleTrigger } from "@/module/ModuleTrigger";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isTrigger = (o: ModuleObject | undefined): o is ModuleTrigger => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleTrigger);
}
