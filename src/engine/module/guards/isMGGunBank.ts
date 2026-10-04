import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleMGGunBank } from "@engine/module/ModuleMGGunBank";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isMGGunBank: (o: ModuleObject | undefined) => o is ModuleMGGunBank = (o): o is ModuleMGGunBank => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGGunBank);
}
