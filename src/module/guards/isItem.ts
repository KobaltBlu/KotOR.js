import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleItem } from "@/module/ModuleItem";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isItem: (o: ModuleObject | undefined) => o is ModuleItem = (o): o is ModuleItem => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleItem);
}
