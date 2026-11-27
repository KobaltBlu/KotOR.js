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
export const GetModuleFileName = defineAction({
  id: 210,
  name: "GetModuleFileName",
  comment: "210: Gets the actual file name of the current module.",
  returnType: NWScriptDataType.STRING,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.filename;
  },
});

export const GetModule = defineAction({
  id: 242,
  name: "GetModule",
  comment: "242: Get the module.\n* Return value on error: OBJECT_INVALID",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module;
  },
});

export const GetModuleName = defineAction({
  id: 561,
  name: "GetModuleName",
  comment: "561: Get the module's name in the language of the server that's running it.",
  returnType: NWScriptDataType.STRING,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.module.name.getValue();
  },
});

export const GetLoadFromSaveGame = defineAction({
  id: 251,
  name: "GetLoadFromSaveGame",
  comment: "251: Returns whether this script is being run while a load game is in progress.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.isLoadingSave ? NW_TRUE : NW_FALSE;
  },
});

export const StartNewModule = defineAction({
  id: 509,
  name: "StartNewModule",
  comment: "509: Shut down the currently loaded module and start a new one.",
  returnType: NWScriptDataType.VOID,
  params: [
    stringParam("sModuleName"),
    stringParam("sWayPoint", { optional: true, default: "" }),
    stringParam("sMovie1", { optional: true, default: "" }),
    stringParam("sMovie2", { optional: true, default: "" }),
    stringParam("sMovie3", { optional: true, default: "" }),
    stringParam("sMovie4", { optional: true, default: "" }),
    stringParam("sMovie5", { optional: true, default: "" }),
    stringParam("sMovie6", { optional: true, default: "" }),
  ] as const,
  kotor(this: NWScriptInstance, sModuleName, sWayPoint, sMovie1, sMovie2, sMovie3, sMovie4, sMovie5, sMovie6) {
    GameState.LoadModule(sModuleName, sWayPoint, sMovie1, sMovie2, sMovie3, sMovie4, sMovie5, sMovie6);
  },
});

export const GetGameDifficulty = defineAction({
  id: 513,
  name: "GetGameDifficulty",
  comment: "513: Get the game difficulty (GAME_DIFFICULTY_*).",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.SWRuleSet.currentDifficulty;
  },
});

export const GetDifficultyModifier = defineAction({
  id: 523,
  name: "GetDifficultyModifier",
  comment: "523: Returns the difficulty modifier.",
  returnType: NWScriptDataType.FLOAT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    const multiplier = GameState.SWRuleSet.difficulty[GameState.SWRuleSet.currentDifficulty]?.multiplier;
    return !isNaN(multiplier) ? multiplier : 1;
  },
});

export const GetIsLiveContentAvailable = defineAction({
  id: 748,
  name: "GetIsLiveContentAvailable",
  comment: "748: Determines whether a given live content package is available.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nPkg")] as const,
  kotor(this: NWScriptInstance, nPkg) {
    return NW_FALSE;
  },
});

export const SetAreaFogColor = defineAction({
  id: 746,
  name: "SetAreaFogColor",
  comment: "746: Set the fog color for the area oArea.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    floatParam("fRed"),
    floatParam("fGreen"),
    floatParam("fBlue"),
  ] as const,
  kotor(this: NWScriptInstance, oArea, fRed, fGreen, fBlue) {
    if (oArea) {
      (oArea as any).fog.color.setRGB(fRed, fGreen, fBlue);
    }
  },
});

export const SetMusicVolume = defineAction({
  id: 765,
  name: "SetMusicVolume",
  comment: "765: SetMusicVolume\nNEVER USE THIS!",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fVolume")] as const,
  kotor(this: NWScriptInstance, fVolume) {
    AudioEngine.GAIN_MUSIC = AudioEngine.percentageToNormalizedGain(fVolume);
  },
});

export const SetReturnStrref = defineAction({
  id: 152,
  name: "SetReturnStrref",
  comment: "152: SetReturnStrref\nThis function will turn on/off the display of the 'return to ebon hawk' option on the map screen.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("bShow"),
    intParam("srReturnStrRef", { optional: true, default: 0 }),
    intParam("srReturnQueryStrRef", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, bShow, srReturnStrRef, srReturnQueryStrRef) {
    GameState.module.setReturnStrRef(!!bShow, srReturnStrRef, srReturnQueryStrRef);
  },
});

export const ShipBuild = defineAction({
  id: 761,
  name: "ShipBuild",
  comment: "761: Returns if this is a shipping build.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return NW_FALSE;
  },
});

export const moduleObjectActions = [
  GetModuleFileName,
  GetModule,
  GetModuleName,
  GetLoadFromSaveGame,
  StartNewModule,
  GetGameDifficulty,
  GetDifficultyModifier,
  GetIsLiveContentAvailable,
  SetAreaFogColor,
  SetMusicVolume,
  SetReturnStrref,
  ShipBuild,
] as const;
