import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleMGObstacle } from "@/module/ModuleMGObstacle";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isMGObstacle = (o: ModuleObject | undefined): o is ModuleMGObstacle => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGObstacle);
}
