import type { ModuleObject } from "@/module/ModuleObject";
import type { ModulePlaceable } from "@/module/ModulePlaceable";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isPlaceable = (o: ModuleObject | undefined): o is ModulePlaceable => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModulePlaceable);
}