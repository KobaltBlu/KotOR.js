import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleMGTrack } from "@/module/ModuleMGTrack";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isMGTrack = (o: ModuleObject | undefined): o is ModuleMGTrack => {
    return BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGTrack);
}
