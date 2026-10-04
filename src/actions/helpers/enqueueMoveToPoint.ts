import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module/ModuleObject";

type ObjectIdLike = number | { id?: number } | undefined;

type EnqueueMoveToPointOptions = {
  x: number;
  y: number;
  z: number;
  area?: ObjectIdLike;
  target?: ObjectIdLike;
  run?: boolean;
  range: number;
  timeout?: number;
  groupId?: number;
};

function resolveId(value: ObjectIdLike): number {
  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && typeof value.id === "number") {
    return value.id;
  }

  return ModuleObjectConstant.OBJECT_INVALID;
}

export function enqueueMoveToPoint(owner: ModuleObject, options: EnqueueMoveToPointOptions) {
  const action = new GameState.ActionFactory.ActionMoveToPoint(undefined, options.groupId);
  action.setParameter(0, ActionParameterType.FLOAT, options.x);
  action.setParameter(1, ActionParameterType.FLOAT, options.y);
  action.setParameter(2, ActionParameterType.FLOAT, options.z);
  action.setParameter(3, ActionParameterType.DWORD, resolveId(options.area ?? owner.area));
  action.setParameter(4, ActionParameterType.DWORD, resolveId(options.target));
  action.setParameter(5, ActionParameterType.INT, options.run ? 1 : 0);
  action.setParameter(6, ActionParameterType.FLOAT, options.range);
  action.setParameter(7, ActionParameterType.INT, 0);
  action.setParameter(8, ActionParameterType.FLOAT, options.timeout ?? 30.0);
  owner.actionQueue.addFront(action);
  return action;
}
