import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleWaypoint } from "@engine/module/ModuleWaypoint";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isWaypoint: (o: ModuleObject | undefined) => o is ModuleWaypoint = (o): o is ModuleWaypoint => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleWaypoint);
}
