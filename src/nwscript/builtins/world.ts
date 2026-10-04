import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, intParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const SetTime = defineAction({
  id: 12,
  name: "SetTime",
  comment: "12: Set the time to the specified hour, minute, second, and millisecond.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nHour"),
    intParam("nMinute"),
    intParam("nSecond"),
    intParam("nMillisecond"),
  ] as const,
  kotor(this: NWScriptInstance, nHour, nMinute, nSecond, nMillisecond) {
    GameState.module.timeManager.setTime(nHour, nMinute, nSecond, nMillisecond);
  },
});

export const SetAreaUnescapable = defineAction({
  id: 14,
  name: "SetAreaUnescapable",
  comment: "14: Set whether the current area is escapable or not.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("bUnescapable")] as const,
  kotor(this: NWScriptInstance, bUnescapable) {
    GameState.module.area.unescapable = !!bUnescapable;
  },
});

export const GetAreaUnescapable = defineAction({
  id: 15,
  name: "GetAreaUnescapable",
  comment: "15: Return whether the current area is escapable or not.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.unescapable ? NW_TRUE : NW_FALSE;
  },
});

export const GetTimeHour = defineAction({
  id: 16,
  name: "GetTimeHour",
  comment: "16: Get the current hour.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.timeManager.hour | 0;
  },
});

export const GetTimeMinute = defineAction({
  id: 17,
  name: "GetTimeMinute",
  comment: "17: Get the current minute.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.timeManager.minute | 0;
  },
});

export const GetTimeSecond = defineAction({
  id: 18,
  name: "GetTimeSecond",
  comment: "18: Get the current second.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.timeManager.second | 0;
  },
});

export const GetTimeMillisecond = defineAction({
  id: 19,
  name: "GetTimeMillisecond",
  comment: "19: Get the current millisecond.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.timeManager.milisecond | 0;
  },
});

export const PauseGame = defineAction({
  id: 57,
  name: "PauseGame",
  comment: "57: Pause the game if bPause is TRUE, unpause if FALSE.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("bPause")] as const,
  kotor(this: NWScriptInstance, bPause) {
    if (bPause) {
      GameState.AutoPauseManager.SignalAutoPauseEvent(0);
    } else {
      GameState.AutoPauseManager.Unpause();
    }
  },
});

export const SetPlayerRestrictMode = defineAction({
  id: 58,
  name: "SetPlayerRestrictMode",
  comment: "58: Set whether the player is currently in restricted mode.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("bRestricted")] as const,
  kotor(this: NWScriptInstance, bRestricted) {
    if (BitWise.InstanceOfObject(GameState.module.area, ModuleObjectType.ModuleArea)) {
      GameState.module.area.setRestrictMode(bRestricted);
    }
  },
});

export const GetPlayerRestrictMode = defineAction({
  id: 83,
  name: "GetPlayerRestrictMode",
  comment: "83: Return the current player restricted mode.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oUnused", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oUnused) {
    if (BitWise.InstanceOfObject(GameState.module.area, ModuleObjectType.ModuleArea)) {
      return GameState.module.area.restrictMode ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const worldActions = [
  SetTime,
  SetAreaUnescapable,
  GetAreaUnescapable,
  GetTimeHour,
  GetTimeMinute,
  GetTimeSecond,
  GetTimeMillisecond,
  PauseGame,
  SetPlayerRestrictMode,
  GetPlayerRestrictMode,
] as const;
