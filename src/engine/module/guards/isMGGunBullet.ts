import type { ModuleObject } from "@engine/module/ModuleObject";
import type { ModuleMGGunBullet } from "@engine/module/ModuleMGGunBullet";
import { BitWise } from "@core/utility/BitWise";
import { ModuleObjectType } from "@core/enums/module/ModuleObjectType";

export const isMGGunBullet: (o: ModuleObject | undefined) => o is ModuleMGGunBullet = (o): o is ModuleMGGunBullet => {
    return !!BitWise.InstanceOfObject(o, ModuleObjectType.ModuleMGGunBullet);
}
