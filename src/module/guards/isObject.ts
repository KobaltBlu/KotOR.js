import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isObject: (o: ModuleObject | undefined) => o is ModuleObject = (o): o is ModuleObject => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleObject);
}
