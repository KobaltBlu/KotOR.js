import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleRoom } from "@/module/ModuleRoom";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isRoom = (o: ModuleObject | undefined): o is ModuleRoom => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleRoom);
}
