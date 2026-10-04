import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleSound } from "@engine/module/ModuleSound";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isSound: (o: ModuleObject | undefined) => o is ModuleSound = (o): o is ModuleSound => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleSound);
}
