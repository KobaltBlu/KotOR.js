import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleAreaOfEffect } from "@engine/module/ModuleAreaOfEffect";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isAreaOfEffect: (o: ModuleObject | undefined) => o is ModuleAreaOfEffect = (o): o is ModuleAreaOfEffect => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleAreaOfEffect);
}
