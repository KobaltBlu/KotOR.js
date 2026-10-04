import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleTrigger } from "@engine/module/ModuleTrigger";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isTrigger: (o: ModuleObject | undefined) => o is ModuleTrigger = (o): o is ModuleTrigger => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleTrigger);
}
