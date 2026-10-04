import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleDoor } from "@engine/module/ModuleDoor";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isDoor: (o: ModuleObject | undefined) => o is ModuleDoor = (o): o is ModuleDoor => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleDoor);
}
