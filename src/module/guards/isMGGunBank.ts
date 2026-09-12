import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleMGGunBank } from "@/module/ModuleMGGunBank";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isMGGunBank: (o: ModuleObject | undefined) => o is ModuleMGGunBank = (o): o is ModuleMGGunBank => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGGunBank);
}
