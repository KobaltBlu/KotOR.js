import EngineLocation from "@/engine/EngineLocation";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const GetRunScriptVar = defineAction({
  id: 565,
  name: "GetRunScriptVar",
  comment: "565: Get a variable passed when calling console debug runscript.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.scriptVar;
  },
});

export const GetLocalBoolean = defineAction({
  id: 679,
  name: "GetLocalBoolean",
  comment: "679: Get a local boolean flag on an object.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject>("oObject"),
    intParam("nIndex"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, nIndex) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject.getLocalBoolean(nIndex) ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const SetLocalBoolean = defineAction({
  id: 680,
  name: "SetLocalBoolean",
  comment: "680: Set a local boolean flag on an object.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oObject"),
    intParam("nIndex"),
    intParam("bValue"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, nIndex, bValue) {
    oObject.setLocalBoolean(nIndex, !!bValue);
  },
});

export const GetLocalNumber = defineAction({
  id: 681,
  name: "GetLocalNumber",
  comment: "681: Get a local number on an object.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject>("oObject"),
    intParam("nIndex"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, nIndex) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject.getLocalNumber(nIndex);
    }
    return 0;
  },
});

export const SetLocalNumber = defineAction({
  id: 682,
  name: "SetLocalNumber",
  comment: "682: Set a local number on an object.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oObject"),
    intParam("nIndex"),
    intParam("nValue"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, nIndex, nValue) {
    oObject.setLocalNumber(nIndex, nValue);
  },
});

export const localvarsActions = [
  GetRunScriptVar,
  GetLocalBoolean,
  SetLocalBoolean,
  GetLocalNumber,
  SetLocalNumber,
] as const;
