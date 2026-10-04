import EngineLocation from "@/engine/EngineLocation";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { GameEvent } from "@/events/GameEvent";
import type { ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import { EventActivateItem, EventConversation, EventSpellCastAt, EventUserDefined, NWScriptEvent } from "@/nwscript/events";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, eventParam, intParam, locationParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const SignalEvent = defineAction({
  id: 131,
  name: "SignalEvent",
  comment: "131: Cause oObject to run evToRun.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
    eventParam<GameEvent | undefined>("evToRun", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oObject, evToRun) {
    let target = oObject;
    if (!(BitWise.InstanceOfObject(target, ModuleObjectType.ModuleObject))) {
      target = GameState.module.area;
    }

    if (BitWise.InstanceOfObject(target, ModuleObjectType.ModuleObject)) {
      if (evToRun instanceof NWScriptEvent) {
        target.scriptEventHandler(evToRun);
      } else {
        console.warn("SignalEvent", "Invalid event argument", [target, evToRun]);
      }
    } else {
      console.log("SignalEvent", "ObjectType Mismatch", [target, evToRun], this, this.caller);
    }
  },
});

export const EventUserDefinedAction = defineAction({
  id: 132,
  name: "EventUserDefined",
  comment: "132: Create an event of the type nUserDefinedEventNumber.",
  returnType: NWScriptDataType.EVENT,
  params: [intParam("nUserDefinedEventNumber")] as const,
  kotor(this: NWScriptInstance, nUserDefinedEventNumber) {
    const event = new EventUserDefined();
    event.setInt(0, nUserDefinedEventNumber);
    return event;
  },
});

export const EventSpellCastAtAction = defineAction({
  id: 244,
  name: "EventSpellCastAt",
  comment: "244: Create an event which triggers the SpellCastAt script.",
  returnType: NWScriptDataType.EVENT,
  params: [
    objectParam<ModuleObject | undefined>("oCaster", { optional: true, default: undefined }),
    intParam("nSpellId"),
    intParam("bHarmful", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oCaster, nSpellId, bHarmful) {
    const event = new EventSpellCastAt();
    event.setObject(0, oCaster);
    event.setInt(0, nSpellId);
    event.setInt(1, bHarmful);
    return event;
  },
});

export const EventConversationAction = defineAction({
  id: 295,
  name: "EventConversation",
  comment: "295: Conversation event.",
  returnType: NWScriptDataType.EVENT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return new EventConversation();
  },
});

export const EventActivateItemAction = defineAction({
  id: 424,
  name: "EventActivateItem",
  comment: "424: Activate oItem.",
  returnType: NWScriptDataType.EVENT,
  params: [
    objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined }),
    locationParam<EngineLocation>("lTargetLocation"),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oItem, lTargetLocation, oTarget) {
    const event = new EventActivateItem();
    event.setObject(0, oItem);
    event.setObject(1, this.caller);
    if (BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem) && BitWise.InstanceOfObject((oItem as any).possessor, ModuleObjectType.ModuleObject)) {
      event.setObject(2, (oItem as any).possessor);
    } else {
      event.setObject(2, undefined);
    }
    event.setObject(3, oTarget);
    event.setFloat(0, lTargetLocation.position.x);
    event.setFloat(1, lTargetLocation.position.y);
    event.setFloat(2, lTargetLocation.position.z);
    return event;
  },
});

export const eventsActions = [
  SignalEvent,
  EventUserDefinedAction,
  EventSpellCastAtAction,
  EventConversationAction,
  EventActivateItemAction,
] as const;
