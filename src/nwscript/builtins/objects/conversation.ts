import * as THREE from "three";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ExperienceType } from "@/enums/engine/ExperienceType";
import { PerceptionMask } from "@/enums/engine/PerceptionMask";
import { TalentObjectType } from "@/enums/engine/TalentObjectType";
import { ModuleCreatureArmorSlot } from "@/enums/module/ModuleCreatureArmorSlot";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { NWModuleObjectType } from "@/enums/nwscript/NWModuleObjectType";
import EngineLocation from "@/engine/EngineLocation";
import { GameState } from "@/GameState";
import { ResourceLoader } from "@/loaders";
import type { ModuleArea, ModuleCreature, ModuleItem, ModuleObject, ModulePlaceable, ModuleStore, ModuleTrigger } from "@/module";
import { GFFObject } from "@/resource/GFFObject";
import { ResourceTypes } from "@/resource/ResourceTypes";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { AudioEngine } from "@/audio/AudioEngine";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { FeedbackMessageEntry } from "@/engine/FeedbackMessageEntry";
import { FeebackMessageColor } from "@/enums/engine/FeedbackMessageColor";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, locationParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";
export const SpeakString = defineAction({
  id: 221,
  name: "SpeakString",
  comment: "221: The caller will immediately speak sStringToSpeak.\n- nTalkVolume: TALKVOLUME_*",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sStringToSpeak"),
    intParam("nTalkVolume", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, sStringToSpeak, nTalkVolume) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) return;
    this.caller.speakString(sStringToSpeak, nTalkVolume);
  },
});

export const ActionSpeakStringByStrRef = defineAction({
  id: 240,
  name: "ActionSpeakStringByStrRef",
  comment: "240: Causes the creature to speak a translated string.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nStrRef"),
    intParam("nTalkVolume", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, nStrRef, nTalkVolume) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) return;
    const action = new GameState.ActionFactory.ActionSpeakStrRef();
    action.setParameter(0, ActionParameterType.INT, nStrRef);
    action.setParameter(1, ActionParameterType.INT, nTalkVolume);
    this.caller.actionQueue.add(action);
  },
});

export const GetStringByStrRef = defineAction({
  id: 239,
  name: "GetStringByStrRef",
  comment: "239: Get a string from the talk table using nStrRef.",
  returnType: NWScriptDataType.STRING,
  params: [intParam("nStrRef")] as const,
  kotor(this: NWScriptInstance, nStrRef) {
    return GameState.TLKManager.GetStringById(nStrRef).Value;
  },
});

export const GetPCSpeaker = defineAction({
  id: 238,
  name: "GetPCSpeaker",
  comment: "238: Get the PC that is involved in the conversation.\n* Returns OBJECT_INVALID on error.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.PartyManager.party[0];
  },
});

export const GetLastSpeaker = defineAction({
  id: 254,
  name: "GetLastSpeaker",
  comment: "254: Use this in a conversation script to get the person with whom you are conversing.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.listenPatternSpeaker;
  },
});

export const GetUserDefinedEventNumber = defineAction({
  id: 247,
  name: "GetUserDefinedEventNumber",
  comment: "247: This is for use in a user-defined script, it gets the event number.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.scriptVar;
  },
});

export const GetIsInConversation = defineAction({
  id: 445,
  name: "GetIsInConversation",
  comment: "445: Determine whether oObject is in conversation.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject.isInConversation();
    }
    return 0;
  },
});

export const SetDialogPlaceableCamera = defineAction({
  id: 461,
  name: "SetDialogPlaceableCamera",
  comment: "461: Cut immediately to placeable camera 'nCameraId' during dialog.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nCameraId")] as const,
  kotor(this: NWScriptInstance, nCameraId) {
    GameState.CutsceneManager.setPlaceableCamera(nCameraId);
  },
});

export const GetIsConversationActive = defineAction({
  id: 701,
  name: "GetIsConversationActive",
  comment: "701: Checks to see if any conversations are currently taking place.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.Mode === EngineMode.DIALOG ? NW_TRUE : NW_FALSE;
  },
});

export const GetLastConversation = defineAction({
  id: 711,
  name: "GetLastConversation",
  comment: "711: Gets the last conversation string.",
  returnType: NWScriptDataType.STRING,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const lastSpoken = GameState.DialogMessageManager.Entries[0];
    return lastSpoken ? lastSpoken.message : "";
  },
});

export const ResetDialogState = defineAction({
  id: 749,
  name: "ResetDialogState",
  comment: "749: Resets the GlobalDialogState for the engine.\nNOTE: NEVER USE THIS UNLESS YOU KNOW WHAT ITS FOR!",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      this.conversation = undefined;
    }
  },
});

export const HoldWorldFadeInForDialog = defineAction({
  id: 760,
  name: "HoldWorldFadeInForDialog",
  comment: "760: This will hold the fade in at the beginning of a module until a dialog starts.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    GameState.holdWorldFadeInForDialog = true;
  },
});

export const AurPostString = defineAction({
  id: 582,
  name: "AurPostString",
  comment: "582: Post a string to the screen at column nX and row nY for fLife seconds.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sString"),
    intParam("nX"),
    intParam("nY"),
    floatParam("fLife"),
  ] as const,
  kotor(this: NWScriptInstance, sString, nX, nY, fLife) {
    const entry = new FeedbackMessageEntry();
    entry.color = FeebackMessageColor.INFO;
    entry.message = `${sString ?? ""}`;
    entry.type = 0;
    GameState.FeedbackMessageManager?.AddEntry(entry);
  },
});

export const conversationObjectActions = [
  SpeakString,
  ActionSpeakStringByStrRef,
  GetStringByStrRef,
  GetPCSpeaker,
  GetLastSpeaker,
  GetUserDefinedEventNumber,
  GetIsInConversation,
  SetDialogPlaceableCamera,
  GetIsConversationActive,
  GetLastConversation,
  ResetDialogState,
  HoldWorldFadeInForDialog,
  AurPostString,
] as const;
