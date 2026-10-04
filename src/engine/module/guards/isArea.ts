import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleArea } from "@engine/module/ModuleArea";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isArea: (o: ModuleObject | undefined) => o is ModuleArea = (o): o is ModuleArea => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleArea);
}
