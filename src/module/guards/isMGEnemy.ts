import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleMGEnemy } from "@/module/ModuleMGEnemy";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isMGEnemy: (o: ModuleObject | undefined) => o is ModuleMGEnemy = (o): o is ModuleMGEnemy => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGEnemy);
}
