import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleAreaOfEffect } from "@/module/ModuleAreaOfEffect";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isAreaOfEffect: (o: ModuleObject | undefined) => o is ModuleAreaOfEffect = (o): o is ModuleAreaOfEffect => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleAreaOfEffect);
}
