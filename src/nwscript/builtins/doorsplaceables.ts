import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleDoor, ModuleObject, ModulePlaceable } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const ActionOpenDoor = defineAction({
  id: 43,
  name: "ActionOpenDoor",
  comment: "43: Cause the action subject to open oDoor.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oDoor")] as const,
  kotor(this: NWScriptInstance, oDoor) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) return;
    if (!BitWise.InstanceOfObject(oDoor, ModuleObjectType.ModuleDoor)) return;
    const action = new GameState.ActionFactory.ActionOpenDoor();
    action.setParameter(0, ActionParameterType.DWORD, oDoor);
    action.setParameter(1, ActionParameterType.INT, 0);
    this.caller.actionQueue.add(action);
  },
});

export const ActionCloseDoor = defineAction({
  id: 44,
  name: "ActionCloseDoor",
  comment: "44: Cause the action subject to close oDoor.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oDoor")] as const,
  kotor(this: NWScriptInstance, oDoor) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) return;
    if (!BitWise.InstanceOfObject(oDoor, ModuleObjectType.ModuleDoor)) return;
    const action = new GameState.ActionFactory.ActionCloseDoor();
    action.setParameter(0, ActionParameterType.DWORD, oDoor);
    action.setParameter(1, ActionParameterType.INT, 0);
    this.caller.actionQueue.add(action);
  },
});

export const SetLocked = defineAction({
  id: 324,
  name: "SetLocked",
  comment: "324: Set the locked state of oTarget.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oTarget"), intParam("bLocked")] as const,
  kotor(this: NWScriptInstance, oTarget, bLocked) {
    if (!BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModulePlaceable) && !BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleDoor)) return;
    (oTarget as ModuleDoor | ModulePlaceable).setLocked(!!bLocked);
  },
});

export const GetLocked = defineAction({
  id: 325,
  name: "GetLocked",
  comment: "325: Get the locked state of oTarget.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oTarget")] as const,
  kotor(this: NWScriptInstance, oTarget) {
    if (!BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModulePlaceable) && !BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleDoor)) return undefined;
    return (oTarget as ModuleDoor | ModulePlaceable).isLocked() ? NW_TRUE : NW_FALSE;
  },
});

export const GetLastUsedBy = defineAction({
  id: 330,
  name: "GetLastUsedBy",
  comment: "330: Get the last object that used the placeable object or door.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModulePlaceable) || BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleDoor)) {
      return (this.caller as ModuleDoor | ModulePlaceable).lastUsedBy || undefined;
    }
    return undefined;
  },
});

export const GetIsDoorActionPossible = defineAction({
  id: 337,
  name: "GetIsDoorActionPossible",
  comment: "337: Return TRUE if nDoorAction can be performed on oTargetDoor.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleDoor>("oTargetDoor"), intParam("nDoorAction")] as const,
  kotor(this: NWScriptInstance, oTargetDoor, nDoorAction) {
    if (BitWise.InstanceOfObject(oTargetDoor, ModuleObjectType.ModuleDoor)) {
      switch (nDoorAction) {
        case 0: return !oTargetDoor.isLocked();
        case 1: return oTargetDoor.isLocked();
        case 2: return oTargetDoor.isLocked();
        case 3: return false;
        case 4: return !oTargetDoor.isOpen();
      }
    }
    return 0;
  },
});

export const DoDoorAction = defineAction({
  id: 338,
  name: "DoDoorAction",
  comment: "338: Perform nDoorAction on oTargetDoor.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleDoor>("oTargetDoor"), intParam("nDoorAction")] as const,
  kotor(this: NWScriptInstance, oTargetDoor, nDoorAction) {
    if (BitWise.InstanceOfObject(oTargetDoor, ModuleObjectType.ModuleDoor)) {
      switch (nDoorAction) {
        case 0: oTargetDoor.openDoor(this.caller); break;
        case 1: oTargetDoor.attemptUnlock(this.caller); break;
        case 2: this.caller.attackCreature(oTargetDoor); break;
      }
    }
  },
});

export const GetIsOpen = defineAction({
  id: 443,
  name: "GetIsOpen",
  comment: "443: Return TRUE if oObject is currently open.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleDoor) || BitWise.InstanceOfObject(oObject, ModuleObjectType.ModulePlaceable)) {
      return (oObject as ModuleDoor | ModulePlaceable).isOpen() ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const ActionUnlockObject = defineAction({
  id: 483,
  name: "ActionUnlockObject",
  comment: "483: The action subject will unlock oTarget.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oTarget")] as const,
  kotor(this: NWScriptInstance, oTarget) {
    if (!BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleDoor) && !BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModulePlaceable)) return;
    const action = new GameState.ActionFactory.ActionUnlockObject();
    action.setParameter(0, ActionParameterType.DWORD, oTarget);
    this.caller.actionQueue.add(action);
  },
});

export const ActionLockObject = defineAction({
  id: 484,
  name: "ActionLockObject",
  comment: "484: The action subject will lock oTarget.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject>("oTarget")] as const,
  kotor(this: NWScriptInstance, oTarget) {
    if (!BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleDoor) && !BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModulePlaceable)) return;
    const action = new GameState.ActionFactory.ActionLockObject();
    action.setParameter(0, ActionParameterType.DWORD, oTarget);
    this.caller.actionQueue.add(action);
  },
});

export const doorsplaceablesActions = [
  ActionOpenDoor,
  ActionCloseDoor,
  SetLocked,
  GetLocked,
  GetLastUsedBy,
  GetIsDoorActionPossible,
  DoDoorAction,
  GetIsOpen,
  ActionUnlockObject,
  ActionLockObject,
] as const;
