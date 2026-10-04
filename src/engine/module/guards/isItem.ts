import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleItem } from "@engine/module/ModuleItem";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isItem: (o: ModuleObject | undefined) => o is ModuleItem = (o): o is ModuleItem => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleItem);
}
