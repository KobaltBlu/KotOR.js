import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleStore } from "@/module/ModuleStore";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isStore = (o: ModuleObject | undefined): o is ModuleStore => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleStore);
}
