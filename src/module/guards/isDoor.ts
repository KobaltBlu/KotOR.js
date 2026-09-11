import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleDoor } from "@/module/ModuleDoor";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isDoor = (o: ModuleObject | undefined): o is ModuleDoor => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleDoor);
}
