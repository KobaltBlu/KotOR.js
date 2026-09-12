import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleWaypoint } from "@/module/ModuleWaypoint";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isWaypoint: (o: ModuleObject | undefined) => o is ModuleWaypoint = (o): o is ModuleWaypoint => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleWaypoint);
}
