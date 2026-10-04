import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleMGEnemy } from "@engine/module/ModuleMGEnemy";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isMGEnemy: (o: ModuleObject | undefined) => o is ModuleMGEnemy = (o): o is ModuleMGEnemy => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGEnemy);
}
