import type { GameObject } from "@engine/module/GameObject";
import type { AreaEffect } from "@engine/module/AreaEffect";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isAreaEffect: (object: GameObject | undefined) => object is AreaEffect =
  (object): object is AreaEffect => {
    return !!BitWise.InstanceOfObject(object, GameObjectType.AreaEffect);
  };
