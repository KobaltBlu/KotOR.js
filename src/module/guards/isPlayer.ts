import type { ModuleObject } from "@/module/ModuleObject";
import type { ModulePlayer } from "@/module/ModulePlayer";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isPlayer = (o: ModuleObject | undefined): o is ModulePlayer => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModulePlayer);
}
