import * as THREE from "three";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, objectParam, vectorParam } from "@/nwscript/builtins/actionBuilder";

export const SetFacingPoint = defineAction({
  id: 143,
  name: "SetFacingPoint",
  comment: "143: Cause the caller to face vTarget.",
  returnType: NWScriptDataType.VOID,
  params: [vectorParam<THREE.Vector3>("vTarget")] as const,
  kotor(this: NWScriptInstance, vTarget) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      this.caller.FacePoint(vTarget);
    }
  },
});

export const SetCommandable = defineAction({
  id: 162,
  name: "SetCommandable",
  comment: "162: Set whether oTarget's action stack can be modified.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("bCommandable"),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, bCommandable, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      oTarget.setCommandable(!!bCommandable);
    }
  },
});

export const GetCommandable = defineAction({
  id: 163,
  name: "GetCommandable",
  comment: "163: Determine whether oTarget's action stack can be modified.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleCreature)) {
      return (oTarget as ModuleCreature).getCommandable() ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const ActionForceFollowObject = defineAction({
  id: 167,
  name: "ActionForceFollowObject",
  comment: "167: The action subject will follow oFollow until a ClearAllActions() is called.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oFollow"),
    floatParam("fFollowDistance", { optional: true, default: 0.0 }),
  ] as const,
  kotor(this: NWScriptInstance, oFollow, fFollowDistance) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) return;
    const action = new GameState.ActionFactory.ActionForceFollowObject();
    action.setParameter(0, ActionParameterType.DWORD, oFollow.id);
    action.setParameter(1, ActionParameterType.FLOAT, fFollowDistance);
    this.caller.actionQueue.add(action);
  },
});

export const GetUserActionsPending = defineAction({
  id: 514,
  name: "GetUserActionsPending",
  comment: "514: Test the combat action queue to see if the user has placed any actions on the queue.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      return this.caller.combatData.combatQueue.length ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const ActionFollowLeader = defineAction({
  id: 730,
  name: "ActionFollowLeader",
  comment: "730: This action has a party member follow the leader.\nDO NOT USE ON A CREATURE THAT IS NOT IN THE PARTY!!",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) return;
    const action = new GameState.ActionFactory.ActionFollowLeader();
    this.caller.actionQueue.add(action);
  },
});

export const SetLockOrientationInDialog = defineAction({
  id: 505,
  name: "SetLockOrientationInDialog",
  comment: "505: SetLockOrientationInDialog\nAllows the locking and unlocking of orientation changes for an object in dialog.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
    intParam("bLock"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, bLock) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      oObject.lockDialogOrientation = !!bLock;
    }
  },
});

export const controlObjectActions = [
  SetFacingPoint,
  SetCommandable,
  GetCommandable,
  ActionForceFollowObject,
  GetUserActionsPending,
  ActionFollowLeader,
  SetLockOrientationInDialog,
] as const;
