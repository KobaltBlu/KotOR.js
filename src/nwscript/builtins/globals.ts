import EngineLocation from "@/engine/EngineLocation";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, locationParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const SetGlobalString = defineAction({
  id: 160,
  name: "SetGlobalString",
  comment: "160: Set a global string with the specified identifier.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sIdentifier"),
    stringParam("sValue"),
  ] as const,

  kotor(this: NWScriptInstance, sIdentifier, sValue) {
    GameState.GlobalVariableManager.SetGlobalString(sIdentifier, sValue);
  },
});

export const GetGlobalString = defineAction({
  id: 194,
  name: "GetGlobalString",
  comment: "194: Get a global string with the specified identifier.",
  returnType: NWScriptDataType.STRING,
  params: [
    stringParam("sIdentifier"),
  ] as const,

  kotor(this: NWScriptInstance, sIdentifier) {
    return GameState.GlobalVariableManager.GetGlobalString(sIdentifier);
  },
});

export const SetCustomToken = defineAction({
  id: 284,
  name: "SetCustomToken",
  comment: "284: Set the value for a custom token.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nTokenNumber"),
    stringParam("sValue"),
  ] as const,

  kotor(this: NWScriptInstance, nTokenNumber, sValue) {
    GameState.module.setCustomToken(nTokenNumber, sValue);
  },
});

export const GetGlobalBoolean = defineAction({
  id: 578,
  name: "GetGlobalBoolean",
  comment: "578: Get the value of a global boolean scripting variable.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    stringParam("sIdentifier"),
  ] as const,

  kotor(this: NWScriptInstance, sIdentifier) {
    return GameState.GlobalVariableManager.GetGlobalBoolean(sIdentifier) ? NW_TRUE : NW_FALSE;
  },
});

export const SetGlobalBoolean = defineAction({
  id: 579,
  name: "SetGlobalBoolean",
  comment: "579: Set the value of a global boolean scripting variable.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sIdentifier"),
    intParam("bValue"),
  ] as const,

  kotor(this: NWScriptInstance, sIdentifier, bValue) {
    GameState.GlobalVariableManager.SetGlobalBoolean(sIdentifier, !!bValue);
  },
});

export const GetGlobalNumber = defineAction({
  id: 580,
  name: "GetGlobalNumber",
  comment: "580: Get the value of a global number scripting variable.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    stringParam("sIdentifier"),
  ] as const,

  kotor(this: NWScriptInstance, sIdentifier) {
    return GameState.GlobalVariableManager.GetGlobalNumber(sIdentifier);
  },
});

export const SetGlobalNumber = defineAction({
  id: 581,
  name: "SetGlobalNumber",
  comment: "581: Set the value of a global number scripting variable.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sIdentifier"),
    intParam("nValue"),
  ] as const,

  kotor(this: NWScriptInstance, sIdentifier, nValue) {
    GameState.GlobalVariableManager.SetGlobalNumber(sIdentifier, nValue);
  },
});

export const GetGlobalLocation = defineAction({
  id: 692,
  name: "GetGlobalLocation",
  comment: "692: Get a global location scripting variable.",
  returnType: NWScriptDataType.LOCATION,
  params: [
    stringParam("sIdentifier"),
  ] as const,

  kotor(this: NWScriptInstance, sIdentifier) {
    return GameState.GlobalVariableManager.GetGlobalLocation(sIdentifier);
  },
});

export const SetGlobalLocation = defineAction({
  id: 693,
  name: "SetGlobalLocation",
  comment: "693: Set a global location scripting variable.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sIdentifier"),
    locationParam<EngineLocation>("lValue"),
  ] as const,

  kotor(this: NWScriptInstance, sIdentifier, lValue) {
    GameState.GlobalVariableManager.SetGlobalLocation(sIdentifier, lValue);
  },
});

export const globalsActions = [
  SetGlobalString,
  GetGlobalString,
  SetCustomToken,
  GetGlobalBoolean,
  SetGlobalBoolean,
  GetGlobalNumber,
  SetGlobalNumber,
  GetGlobalLocation,
  SetGlobalLocation,
] as const;
