import type { GameObject } from "@engine/module/GameObject";
import type { Waypoint } from "@engine/module/Waypoint";
import { BitWise } from "@core/utility/BitWise";
import { GameObjectType } from "@core/enums/module/GameObjectType";

export const isWaypoint: (o: GameObject | undefined) => o is Waypoint = (o): o is Waypoint => {
    return !!BitWise.InstanceOfObject(o, GameObjectType.Waypoint);
}
