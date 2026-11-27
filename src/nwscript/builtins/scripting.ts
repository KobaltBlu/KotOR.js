import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { NWScriptSubroutine } from "@/nwscript/NWScriptSubroutine";
import { actionParam, defineAction, floatParam, intParam, objectParam, stringParam } from "@/nwscript/builtins/actionBuilder";

export const AssignCommand = defineAction({
  id: 6,
  name: "AssignCommand",
  comment: "6: Assign aActionToAssign to oActionSubject.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oActionSubject", { optional: true, default: undefined }),
    actionParam<any>("aActionToAssign"),
  ] as const,
  kotor(this: NWScriptInstance, oActionSubject, aActionToAssign) {
    if (BitWise.InstanceOfObject(oActionSubject, ModuleObjectType.ModuleObject)) {
      if (typeof aActionToAssign === "object") {
        aActionToAssign.script.caller = oActionSubject;
        aActionToAssign.script.seekTo(aActionToAssign.offset);
        aActionToAssign.script.runScript();
      } else {
        console.error("AssignCommand", [oActionSubject, aActionToAssign]);
      }
    } else {
      console.error("AssignCommand", [oActionSubject, aActionToAssign]);
    }
  },
});

export const DelayCommand = defineAction({
  id: 7,
  name: "DelayCommand",
  comment: "7: Delay aActionToDelay by fSeconds.",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fSeconds"), actionParam<any>("aActionToDelay")] as const,
  kotor(this: NWScriptInstance, fSeconds, aActionToDelay) {
    const futureTime = GameState.module.timeManager.getFutureTimeFromSeconds(fSeconds);
    const timedEvent = new GameState.GameEventFactory.EventTimedEvent();
    timedEvent.setCaller(this.caller);
    timedEvent.setObject(this.caller);
    timedEvent.setDay(futureTime.pauseDay);
    timedEvent.setTime(futureTime.pauseTime);
    timedEvent.setNWScript(aActionToDelay.script);
    timedEvent.setInstructionPtr(aActionToDelay.offset);

    if (this.subRoutine instanceof NWScriptSubroutine) {
      this.delayCommands.push(timedEvent);
    } else {
      this.delayCommands.push(timedEvent);
    }
  },
});

export const ExecuteScript = defineAction({
  id: 8,
  name: "ExecuteScript",
  comment: "8: Make oTarget run sScript and then return execution to the calling script.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sScript"),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    intParam("nScriptVar", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, sScript, oTarget, nScriptVar) {
    if (sScript) {
      const scriptInstance = GameState.NWScript.Load(sScript, undefined, this);
      if (scriptInstance) {
        this.executeScript(scriptInstance, this, [sScript, oTarget, nScriptVar]);
      } else {
        console.warn("NWScript.ExecuteScript failed to find", sScript);
      }
    } else {
      console.warn(`NWScript.ExecuteScript (${this.name}) failed because a script name wasn't supplied -> ${sScript}`);
    }
  },
});

export const ClearAllActions = defineAction({
  id: 9,
  name: "ClearAllActions",
  comment: "9: Clear all the actions of the caller.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      this.caller.clearAllActions(true);
    }
  },
});

export const ActionDoCommand = defineAction({
  id: 294,
  name: "ActionDoCommand",
  comment: "294: Do aActionToDo.",
  returnType: NWScriptDataType.VOID,
  params: [actionParam<any>("aActionToDo")] as const,
  kotor(this: NWScriptInstance, aActionToDo) {
    this.caller.doCommand(aActionToDo.script);
  },
});

export const scriptingActions = [
  AssignCommand,
  DelayCommand,
  ExecuteScript,
  ClearAllActions,
  ActionDoCommand,
] as const;
