import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModulePlaceable } from "@engine/module/ModulePlaceable";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isPlaceable: (o: ModuleObject | undefined) => o is ModulePlaceable = (o): o is ModulePlaceable => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModulePlaceable);
}