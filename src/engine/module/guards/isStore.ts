import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleStore } from "@engine/module/ModuleStore";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isStore: (o: ModuleObject | undefined) => o is ModuleStore = (o): o is ModuleStore => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleStore);
}
