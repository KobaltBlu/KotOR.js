import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, objectParam } from "@/nwscript/builtins/actionBuilder";

export const GetTrapDisarmable = defineAction({
  id: 527,
  name: "GetTrapDisarmable",
  comment: "527: Return TRUE if oTrapObject is disarmable.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oTrapObject")] as const,
  kotor(this: NWScriptInstance, oTrapObject) {
    if (BitWise.InstanceOfObject(oTrapObject, ModuleObjectType.ModuleObject)) {
      return oTrapObject.trapDisarmable ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const GetTrapDetectable = defineAction({
  id: 528,
  name: "GetTrapDetectable",
  comment: "528: Return TRUE if oTrapObject is detectable.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oTrapObject")] as const,
  kotor(this: NWScriptInstance, oTrapObject) {
    if (BitWise.InstanceOfObject(oTrapObject, ModuleObjectType.ModuleObject)) {
      return oTrapObject.trapDetectable ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const GetTrapFlagged = defineAction({
  id: 530,
  name: "GetTrapFlagged",
  comment: "530: Return TRUE if oTrapObject has been flagged as visible to all creatures.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oTrapObject")] as const,
  kotor(this: NWScriptInstance, oTrapObject) {
    if (BitWise.InstanceOfObject(oTrapObject, ModuleObjectType.ModuleObject)) {
      return oTrapObject.trapFlag ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const GetTrapBaseType = defineAction({
  id: 531,
  name: "GetTrapBaseType",
  comment: "531: Get the trap base type of oTrapObject.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oTrapObject")] as const,
  kotor(this: NWScriptInstance, oTrapObject) {
    if (BitWise.InstanceOfObject(oTrapObject, ModuleObjectType.ModuleObject)) {
      return oTrapObject.trapType;
    }
    return -1;
  },
});

export const GetTrapOneShot = defineAction({
  id: 532,
  name: "GetTrapOneShot",
  comment: "532: Return TRUE if oTrapObject is one-shot.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oTrapObject")] as const,
  kotor(this: NWScriptInstance, oTrapObject) {
    if (BitWise.InstanceOfObject(oTrapObject, ModuleObjectType.ModuleObject)) {
      return oTrapObject.trapOneShot ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const GetTrapDisarmDC = defineAction({
  id: 535,
  name: "GetTrapDisarmDC",
  comment: "535: Get the DC for disarming oTrapObject.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oTrapObject")] as const,
  kotor(this: NWScriptInstance, oTrapObject) {
    if (BitWise.InstanceOfObject(oTrapObject, ModuleObjectType.ModuleObject)) {
      return oTrapObject.trapDisarmDC;
    }
    return NW_FALSE;
  },
});

export const GetTrapDetectDC = defineAction({
  id: 536,
  name: "GetTrapDetectDC",
  comment: "536: Get the DC for detecting oTrapObject.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oTrapObject")] as const,
  kotor(this: NWScriptInstance, oTrapObject) {
    if (BitWise.InstanceOfObject(oTrapObject, ModuleObjectType.ModuleObject)) {
      return oTrapObject.trapDetectDC;
    }
    return NW_FALSE;
  },
});

export const GetIsTrapped = defineAction({
  id: 551,
  name: "GetIsTrapped",
  comment: "551: Return TRUE if oObject is trapped.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject>("oObject")] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleTrigger) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleDoor) ||
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModulePlaceable)
    ) {
      return oObject.trapFlag ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const trapsActions = [
  GetTrapDisarmable,
  GetTrapDetectable,
  GetTrapFlagged,
  GetTrapBaseType,
  GetTrapOneShot,
  GetTrapDisarmDC,
  GetTrapDetectDC,
  GetIsTrapped,
] as const;
