import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleMGTrack } from "@engine/module/ModuleMGTrack";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isMGTrack: (o: ModuleObject | undefined) => o is ModuleMGTrack = (o): o is ModuleMGTrack => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGTrack);
}
