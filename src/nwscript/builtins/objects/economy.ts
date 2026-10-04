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
export const GiveGoldToCreature = defineAction({
  id: 322,
  name: "GiveGoldToCreature",
  comment: "322: Give nGP gold to oCreature.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nGP"),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nGP) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      oCreature.addGold(nGP || 0);
    }
  },
});

export const GetGold = defineAction({
  id: 418,
  name: "GetGold",
  comment: "418: Get the amount of gold possessed by oTarget.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oTarget) {
    return oTarget ? oTarget.getGold() : 0;
  },
});

export const TakeGoldFromCreature = defineAction({
  id: 444,
  name: "TakeGoldFromCreature",
  comment: "444: Take nAmount of gold from oCreatureToTakeFrom.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nAmount"),
    objectParam<ModuleCreature | undefined>("oCreatureToTakeFrom", { optional: true, default: undefined }),
    intParam("bDestroy", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, nAmount, oCreatureToTakeFrom, bDestroy) {
    if (BitWise.InstanceOfObject(oCreatureToTakeFrom, ModuleObjectType.ModuleCreature)) {
      oCreatureToTakeFrom.removeGold(nAmount);
      if (!bDestroy && BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
        this.caller.addGold(nAmount);
      }
    }
  },
});

export const GiveXPToCreature = defineAction({
  id: 393,
  name: "GiveXPToCreature",
  comment: "393: Gives nXpAmount to oCreature.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleCreature | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nXpAmount"),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nXpAmount) {
    if (oCreature) oCreature.addXP(nXpAmount, ExperienceType.PLOT);
  },
});

export const SetXP = defineAction({
  id: 394,
  name: "SetXP",
  comment: "394: Sets oCreature's experience to nXpAmount.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleCreature | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nXpAmount"),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nXpAmount) {
    if (oCreature) oCreature.setXP(nXpAmount);
  },
});

export const GetXP = defineAction({
  id: 395,
  name: "GetXP",
  comment: "395: Get oCreature's experience.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleCreature | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    return oCreature ? oCreature.getXP() : 0;
  },
});

export const GivePlotXP = defineAction({
  id: 714,
  name: "GivePlotXP",
  comment: "714: Give nPercentage% of the experience associated with plot sPlotName to the party.",
  returnType: NWScriptDataType.VOID,
  params: [stringParam("sPlotName"), intParam("nPercentage")] as const,
  kotor(this: NWScriptInstance, sPlotName, nPercentage) {
    GameState.JournalManager.AwardPlotXPByTag(sPlotName, (nPercentage || 0) * 0.01);
  },
});

export const economyObjectActions = [
  GiveGoldToCreature,
  GetGold,
  TakeGoldFromCreature,
  GiveXPToCreature,
  SetXP,
  GetXP,
  GivePlotXP,
] as const;
