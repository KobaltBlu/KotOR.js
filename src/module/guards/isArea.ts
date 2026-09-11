import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleArea } from "@/module/ModuleArea";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isArea = (o: ModuleObject | undefined): o is ModuleArea => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleArea);
}
