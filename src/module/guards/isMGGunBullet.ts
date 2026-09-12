import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleMGGunBullet } from "@/module/ModuleMGGunBullet";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";

export const isMGGunBullet: (o: ModuleObject | undefined) => o is ModuleMGGunBullet = (o): o is ModuleMGGunBullet => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGGunBullet);
}
