import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleMGObstacle } from "@engine/module/ModuleMGObstacle";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isMGObstacle: (o: ModuleObject | undefined) => o is ModuleMGObstacle = (o): o is ModuleMGObstacle => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGObstacle);
}
