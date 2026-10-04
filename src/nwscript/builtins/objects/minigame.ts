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
export const PlayPazaak = defineAction({
  id: 364,
  name: "PlayPazaak",
  comment: "364: Starts a game of pazaak.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nOpponentPazaakDeck"),
    stringParam("sEndScript"),
    intParam("nMaxWager"),
    intParam("bShowTutorial", { optional: true, default: 0 }),
    objectParam<ModuleObject | undefined>("oOpponent", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, nOpponentPazaakDeck, sEndScript, nMaxWager, bShowTutorial, oOpponent) {
    GameState.PazaakManager.SetOpponentDeck(nOpponentPazaakDeck || 0);
    GameState.PazaakManager.SetEndScript(sEndScript || "");
    GameState.PazaakManager.MaxWager = nMaxWager || 0;
    GameState.PazaakManager.Wager = nMaxWager || 0;
    GameState.PazaakManager.ShowTutorial = !!bShowTutorial;
    GameState.PazaakManager.SetOpponent((oOpponent ?? this.caller) as ModuleCreature);
    GameState.PazaakManager.Won = false;
    GameState.PazaakManager.StartGame();
  },
});

export const GetLastPazaakResult = defineAction({
  id: 365,
  name: "GetLastPazaakResult",
  comment: "365: Returns result of last Pazaak game. Returns 0 if player loses, 1 if player wins.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.PazaakManager.Won ? 1 : 0;
  },
});

export const SWMG_SetLateralAccelerationPerSecond = defineAction({
  id: 520,
  name: "SWMG_SetLateralAccelerationPerSecond",
  comment: "520: Sets the minigame lateral acceleration/sec value.",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fAcceleration")] as const,
  kotor(this: NWScriptInstance, fAcceleration) {
    GameState.module.area.miniGame.player.accel_lateral_secs = fAcceleration;
  },
});

export const minigameObjectActions = [
  PlayPazaak,
  GetLastPazaakResult,
  SWMG_SetLateralAccelerationPerSecond,
] as const;
