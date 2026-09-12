import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleSound } from "@/module/ModuleSound";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isSound: (o: ModuleObject | undefined) => o is ModuleSound = (o): o is ModuleSound => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleSound);
}
