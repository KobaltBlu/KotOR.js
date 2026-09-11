import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isCreature = (o: ModuleObject | undefined): o is ModuleCreature => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleCreature);
}