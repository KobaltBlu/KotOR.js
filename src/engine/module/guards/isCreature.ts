import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleCreature } from "@engine/module/ModuleCreature";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isCreature: (o: ModuleObject | undefined) => o is ModuleCreature = (o): o is ModuleCreature => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleCreature);
}