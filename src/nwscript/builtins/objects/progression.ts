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
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, locationParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";
export const GetPlotFlag = defineAction({
  id: 455,
  name: "GetPlotFlag",
  comment: "455: Determine whether oTarget is a plot object.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      return oTarget.plot ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const SetPlotFlag = defineAction({
  id: 456,
  name: "SetPlotFlag",
  comment: "456: Set oTarget's plot object status.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    intParam("bPlotFlag"),
  ] as const,
  kotor(this: NWScriptInstance, oTarget, bPlotFlag) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      oTarget.plot = !!bPlotFlag;
    }
  },
});

export const GetMaxStealthXP = defineAction({
  id: 464,
  name: "GetMaxStealthXP",
  comment: "464: Returns the maximum amount of stealth xp available in the area.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.stealthXPMax || 0;
  },
});

export const SetMaxStealthXP = defineAction({
  id: 468,
  name: "SetMaxStealthXP",
  comment: "468: Set the maximum amount of stealth xp available in the area.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nMaxStealthXP")] as const,
  kotor(this: NWScriptInstance, nMaxStealthXP) {
    GameState.module.area.stealthXPMax = nMaxStealthXP || 0;
  },
});

export const GetCurrentStealthXP = defineAction({
  id: 474,
  name: "GetCurrentStealthXP",
  comment: "474: Returns the current amount of stealth xp available in the area.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.stealthXP || 0;
  },
});

export const SetCurrentStealthXP = defineAction({
  id: 478,
  name: "SetCurrentStealthXP",
  comment: "478: Set the current amount of stealth xp available in the area.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nCurrentStealthXP")] as const,
  kotor(this: NWScriptInstance, nCurrentStealthXP) {
    GameState.module.area.stealthXP = nCurrentStealthXP || 0;
  },
});

export const AwardStealthXP = defineAction({
  id: 480,
  name: "AwardStealthXP",
  comment: "480: Award the stealth xp to the given oTarget.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleCreature)) {
      (oTarget as ModuleCreature).addXP(GameState.module.area.stealthXP, ExperienceType.STEALTH);
    }
  },
});

export const GetStealthXPEnabled = defineAction({
  id: 481,
  name: "GetStealthXPEnabled",
  comment: "481: Returns whether or not the stealth xp bonus is enabled.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.stealthXPEnabled ? 1 : 0;
  },
});

export const SetStealthXPEnabled = defineAction({
  id: 482,
  name: "SetStealthXPEnabled",
  comment: "482: Sets whether or not the stealth xp bonus is enabled.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("bEnabled")] as const,
  kotor(this: NWScriptInstance, bEnabled) {
    GameState.module.area.setStealthXPEnabled(!!bEnabled);
  },
});

export const GetStealthXPDecrement = defineAction({
  id: 498,
  name: "GetStealthXPDecrement",
  comment: "498: Returns the amount the stealth xp bonus gets decreased each time the player is detected.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.area.stealthXPLoss || 0;
  },
});

export const SetStealthXPDecrement = defineAction({
  id: 499,
  name: "SetStealthXPDecrement",
  comment: "499: Sets the amount the stealth xp bonus gets decreased each time the player is detected.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nDecrement")] as const,
  kotor(this: NWScriptInstance, nDecrement) {
    GameState.module.area.stealthXPLoss = nDecrement || 0;
  },
});

export const GetMinOneHP = defineAction({
  id: 715,
  name: "GetMinOneHP",
  comment: "715: Checks to see if oObject has the MinOneHP Flag set on them.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (!BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) return 0;
    return oObject?.min1HP ? NW_TRUE : NW_FALSE;
  },
});

export const SetMinOneHP = defineAction({
  id: 716,
  name: "SetMinOneHP",
  comment: "716: Sets/Removes the MinOneHP Flag on oObject.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
    intParam("bMinOneHP"),
  ] as const,
  kotor(this: NWScriptInstance, oObject, bMinOneHP) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      oObject.setMinOneHP(!!bMinOneHP);
    }
  },
});

export const progressionObjectActions = [
  GetPlotFlag,
  SetPlotFlag,
  GetMaxStealthXP,
  SetMaxStealthXP,
  GetCurrentStealthXP,
  SetCurrentStealthXP,
  AwardStealthXP,
  GetStealthXPEnabled,
  SetStealthXPEnabled,
  GetStealthXPDecrement,
  SetStealthXPDecrement,
  GetMinOneHP,
  SetMinOneHP,
] as const;
