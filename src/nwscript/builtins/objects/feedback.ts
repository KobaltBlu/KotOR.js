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
export const DisplayFeedBackText = defineAction({
  id: 366,
  name: "DisplayFeedBackText",
  comment: "366: Display a feedback string for the object specified.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nFeedbackTextConstant"),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nFeedbackTextConstant) {
    const message = GameState.TLKManager?.GetStringById(nFeedbackTextConstant)?.Value || `Feedback ${nFeedbackTextConstant}`;
    const entry = new FeedbackMessageEntry();
    entry.color = FeebackMessageColor.INFO;
    entry.message = message;
    entry.type = 0;
    GameState.FeedbackMessageManager?.AddEntry(entry);
  },
});

export const PlayRumblePattern = defineAction({
  id: 370,
  name: "PlayRumblePattern",
  comment: "370: Starts a defined rumble pattern playing.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nPattern")] as const,
  kotor(this: NWScriptInstance, nPattern) {
    GameState.CameraShakeManager.playRumblePattern(nPattern);
    return NW_TRUE;
  },
});

export const StopRumblePattern = defineAction({
  id: 371,
  name: "StopRumblePattern",
  comment: "371: Stops a defined rumble pattern.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nPattern")] as const,
  kotor(this: NWScriptInstance, nPattern) {
    GameState.CameraShakeManager.stopRumblePattern(nPattern);
    return NW_TRUE;
  },
});

export const NoClicksFor = defineAction({
  id: 759,
  name: "NoClicksFor",
  comment: "759: This command will not allow clicking on anything for 'fDuration' seconds.",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fDuration")] as const,
  kotor(this: NWScriptInstance, fDuration) {
    GameState.noClickTimer = fDuration || 0;
  },
});

export const feedbackObjectActions = [
  DisplayFeedBackText,
  PlayRumblePattern,
  StopRumblePattern,
  NoClicksFor,
] as const;
