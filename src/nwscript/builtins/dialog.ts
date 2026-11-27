import { GameState } from "@/GameState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import type { ModuleObject } from "@/module";
import { DLGObject } from "@/resource/DLGObject";
import { BitWise } from "@/utility/BitWise";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import {
  defineAction,
  intParam,
  objectParam,
  stringParam,
} from "@/nwscript/builtins/actionBuilder";

function getDefaultConversationOwnerForActionStart(
  script: NWScriptInstance,
  otherParticipant: ModuleObject,
  explicitDialogResRef: string,
): ModuleObject {
  const caller = script.caller;
  const enteringObject = BitWise.InstanceOfObject(script.enteringObject, ModuleObjectType.ModuleObject)
    ? script.enteringObject
    : undefined;

  if (
    explicitDialogResRef === "" &&
    BitWise.InstanceOfObject(caller, ModuleObjectType.ModuleTrigger) &&
    BitWise.InstanceOfObject(otherParticipant, ModuleObjectType.ModuleObject) &&
    otherParticipant !== enteringObject &&
    otherParticipant.getConversation?.() instanceof DLGObject
  ) {
    return otherParticipant;
  }

  return caller;
}

function getConversationListenerForActionStart(
  script: NWScriptInstance,
  actionSubject: ModuleObject,
  requestedOtherParticipant: ModuleObject,
): ModuleObject {
  const enteringObject = BitWise.InstanceOfObject(script.enteringObject, ModuleObjectType.ModuleObject)
    ? script.enteringObject
    : undefined;

  if (actionSubject !== script.caller) {
    return enteringObject ?? GameState.getCurrentPlayer();
  }

  return requestedOtherParticipant ?? enteringObject ?? GameState.getCurrentPlayer();
}

export const ActionStartConversation = defineAction({
  id: 204,
  name: "ActionStartConversation",
  comment:
    "AMF: APRIL 28, 2003 - I HAVE CHANGED THIS FUNCTION AS PER DAN'S REQUEST\n" +
    "204: Starts a conversation with oObjectToConverseWith - this will cause their\n" +
    "OnDialog event to fire.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oObjectToConverseWith"),
    stringParam("sDialogResRef", { optional: true, default: "" }),
    intParam("bPrivateConversation", { optional: true, default: 0 }),
    intParam("nConversationType", { optional: true, default: 0 }),
    intParam("bIgnoreStartRange", { optional: true, default: 0 }),
    stringParam("sNameObjectToIgnore1", { optional: true, default: "" }),
    stringParam("sNameObjectToIgnore2", { optional: true, default: "" }),
    stringParam("sNameObjectToIgnore3", { optional: true, default: "" }),
    stringParam("sNameObjectToIgnore4", { optional: true, default: "" }),
    stringParam("sNameObjectToIgnore5", { optional: true, default: "" }),
    stringParam("sNameObjectToIgnore6", { optional: true, default: "" }),
    intParam("bUseLeader", { optional: true, default: 0 }),
    intParam("nBarkX", { availability: "tsl", optional: true, default: -1 }),
    intParam("nBarkY", { availability: "tsl", optional: true, default: -1 }),
    intParam("bDontClearAllActions", { availability: "tsl", optional: true, default: 0 }),
  ] as const,

  kotor(
    this: NWScriptInstance,
    oObjectToConverseWith,
    sDialogResRef,
    bPrivateConversation,
    nConversationType,
    bIgnoreStartRange,
  ) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      const actionSubject = getDefaultConversationOwnerForActionStart(this, oObjectToConverseWith, sDialogResRef);
      const listener = getConversationListenerForActionStart(this, actionSubject, oObjectToConverseWith);

      actionSubject.actionDialogObject(
        listener,
        sDialogResRef,
        !!bIgnoreStartRange,
        bPrivateConversation,
        nConversationType,
      );
    } else {
      console.error("ActionStartConversation", "Caller is not an instance of ModuleObject");
    }
  },

  tsl(
    this: NWScriptInstance,
    oObjectToConverseWith,
    sDialogResRef,
    bPrivateConversation,
    nConversationType,
    bIgnoreStartRange,
    sNameObjectToIgnore1,
    sNameObjectToIgnore2,
    sNameObjectToIgnore3,
    sNameObjectToIgnore4,
    sNameObjectToIgnore5,
    sNameObjectToIgnore6,
    bUseLeader,
    nBarkX,
    nBarkY,
    bDontClearAllActions,
  ) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      const actionSubject = getDefaultConversationOwnerForActionStart(this, oObjectToConverseWith, sDialogResRef);
      const listener = getConversationListenerForActionStart(this, actionSubject, oObjectToConverseWith);

      actionSubject.actionDialogObject(
        listener,
        sDialogResRef,
        !!bIgnoreStartRange,
        bPrivateConversation,
        nConversationType,
      );
    } else {
      console.error("ActionStartConversation", "Caller is not an instance of ModuleObject");
    }
  },
});

export const ActionPauseConversation = defineAction({
  id: 205,
  name: "ActionPauseConversation",
  comment: "205: Pause the current conversation.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,

  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      this.caller.actionQueue.add(new GameState.ActionFactory.ActionPauseDialog());
    }

    console.log("script", this.name, "PauseConversation", this.caller);
  },
});

export const ActionResumeConversation = defineAction({
  id: 206,
  name: "ActionResumeConversation",
  comment: "206: Resume a conversation after it has been paused.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,

  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      this.caller.actionQueue.add(new GameState.ActionFactory.ActionResumeDialog());
    }

    console.log("script", this.name, "ResumeConversation", this.caller);
  },
});

export const BeginConversation = defineAction({
  id: 255,
  name: "BeginConversation",
  comment:
    "255: Use this in an OnDialog script to start up the dialog tree.\n" +
    "- sResRef: if this is not specified, the default dialog file will be used\n" +
    "- oObjectToDialog: if this is not specified the person that triggered the event will be used",
  returnType: NWScriptDataType.INTEGER,
  params: [
    stringParam("sResRef", { optional: true, default: "" }),
    objectParam<ModuleObject | undefined>("oObjectToDialog", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, sResRef, oObjectToDialog) {
    let dialogTarget = oObjectToDialog;

    if (!BitWise.InstanceOfObject(dialogTarget, ModuleObjectType.ModuleObject)) {
      dialogTarget = this.listenPatternSpeaker ?? GameState.getCurrentPlayer();
    }

    if (!BitWise.InstanceOfObject(dialogTarget, ModuleObjectType.ModuleObject)) {
      console.warn("BeginConversation", "dialogTarget is not an instance of ModuleObject");
      return NW_FALSE;
    }

    if (sResRef !== "") {
      const dlg = DLGObject.FromResRef(sResRef);
      if (!dlg) {
        return NW_FALSE;
      }

      GameState.CutsceneManager.startConversation(dlg, this.caller, dialogTarget as any);
      return NW_TRUE;
    }

    if (this.conversation) {
      GameState.CutsceneManager.startConversation(this.conversation, this.caller, dialogTarget as any);
      return NW_TRUE;
    }

    if (this.caller.conversation) {
      GameState.CutsceneManager.startConversation(this.caller.conversation, this.caller, dialogTarget as any);
      return NW_TRUE;
    }

    console.warn("BeginConversation", "no dialog condition met");
    return NW_FALSE;
  },
});

export const dialogActions = [
  ActionStartConversation,
  ActionPauseConversation,
  ActionResumeConversation,
  BeginConversation,
] as const;
