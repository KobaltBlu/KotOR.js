import type { ModuleObject } from "@engine/module/ModuleObject";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isObject: (o: ModuleObject | undefined) => o is ModuleObject = (o): o is ModuleObject => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleObject);
}
