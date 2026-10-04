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
export const ResistForce = defineAction({
  id: 169,
  name: "ResistForce",
  comment: "169: Do a Force Resistance check between oSource and oTarget, returning TRUE if the force was resisted.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oSource", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oSource, oTarget) {
    if (oTarget) {
      return oTarget.resistForce(oSource);
    }
    return NW_FALSE;
  },
});

export const GetIsEnemy = defineAction({
  id: 235,
  name: "GetIsEnemy",
  comment: "235: * Returns TRUE if oSource considers oTarget as an enemy.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oSource", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oTarget, oSource) {
    if (BitWise.InstanceOfObject(oSource, ModuleObjectType.ModuleCreature)) {
      return oTarget?.isHostile(oSource) ? NW_TRUE : NW_FALSE;
    }
    return 0;
  },
});

export const GetIsFriend = defineAction({
  id: 236,
  name: "GetIsFriend",
  comment: "236: * Returns TRUE if oSource considers oTarget as a friend.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oSource", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oTarget, oSource) {
    if (BitWise.InstanceOfObject(oSource, ModuleObjectType.ModuleCreature)) {
      if (
        GameState.PartyManager.party.indexOf(oSource as any) >= 0 &&
        GameState.PartyManager.party.indexOf(oTarget as any) >= 0
      ) {
        return NW_TRUE;
      }
      return oTarget?.isFriendly(oSource) ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const GetIsNeutral = defineAction({
  id: 237,
  name: "GetIsNeutral",
  comment: "237: * Returns TRUE if oSource considers oTarget as neutral.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oSource", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oTarget, oSource) {
    if (BitWise.InstanceOfObject(oSource, ModuleObjectType.ModuleCreature)) {
      if (
        GameState.PartyManager.party.indexOf(oSource as any) >= 0 &&
        GameState.PartyManager.party.indexOf(oTarget as any) >= 0
      ) {
        return NW_TRUE;
      }
      return oTarget?.isFriendly(oSource) || oTarget?.isNeutral(oSource) ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const AdjustAlignment = defineAction({
  id: 201,
  name: "AdjustAlignment",
  comment: "201: Adjust the alignment of oSubject.\n- nAlignment: ALIGNMENT_*\n- nShift: the desired shift in alignment",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleCreature | undefined>("oSubject", { optional: true, default: undefined }),
    intParam("nAlignment"),
    intParam("nShift"),
    intParam("bDontModifyNPCs", { availability: "tsl", optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oSubject, nAlignment, nShift, bDontModifyNPCs) {
    if (BitWise.InstanceOfObject(oSubject, ModuleObjectType.ModuleCreature)) {
      oSubject.adjustAlignment(nShift, nAlignment);
    }
  },
});

export const GetFirstFactionMember = defineAction({
  id: 380,
  name: "GetFirstFactionMember",
  comment: "380: Get the first member of oMemberOfFaction's faction.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oMemberOfFaction", { optional: true, default: undefined }),
    intParam("bPlayerCharactersOnly", { optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, oMemberOfFaction, bPlayerCharactersOnly) {
    if (BitWise.InstanceOfObject(oMemberOfFaction, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oMemberOfFaction);
      if (faction) {
        this.factionMemberIndex.set(faction.id, 0);
        return faction.getFactionMemberByIndex(0, !!bPlayerCharactersOnly);
      }
    }
    return undefined;
  },
});

export const GetNextFactionMember = defineAction({
  id: 381,
  name: "GetNextFactionMember",
  comment: "381: Get the next member of oMemberOfFaction's faction.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oMemberOfFaction", { optional: true, default: undefined }),
    intParam("bPlayerCharactersOnly", { optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, oMemberOfFaction, bPlayerCharactersOnly) {
    if (BitWise.InstanceOfObject(oMemberOfFaction, ModuleObjectType.ModuleCreature)) {
      const faction = GameState.FactionManager.GetCreatureFaction(oMemberOfFaction);
      if (faction) {
        const nextId = (this.factionMemberIndex.get(faction.id) ?? 0) + 1;
        this.factionMemberIndex.set(faction.id, nextId);
        return faction.getFactionMemberByIndex(nextId, !!bPlayerCharactersOnly);
      }
    }
    return undefined;
  },
});

export const ChangeToStandardFaction = defineAction({
  id: 412,
  name: "ChangeToStandardFaction",
  comment: "412: Make oCreatureToChange join one of the standard factions.\n** This will only work on an NPC **",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oCreatureToChange", { optional: true, default: undefined }),
    intParam("nStandardFaction"),
  ] as const,
  kotor(this: NWScriptInstance, oCreatureToChange, nStandardFaction) {
    if (BitWise.InstanceOfObject(oCreatureToChange, ModuleObjectType.ModuleCreature)) {
      oCreatureToChange.faction = GameState.FactionManager.factions.get(nStandardFaction);
      GameState.FactionManager.AddCreatureToFaction(oCreatureToChange);
    }
  },
});

export const GetStandardFaction = defineAction({
  id: 713,
  name: "GetStandardFaction",
  comment: "713: Find out which standard faction oObject belongs to.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return typeof oObject.faction === "number" ? oObject.faction : -1;
    }
    return -1;
  },
});

export const SurrenderByFaction = defineAction({
  id: 736,
  name: "SurrenderByFaction",
  comment: "736: This affects all creatures in the area that are in faction nFactionFrom.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nFactionFrom"), intParam("nFactionTo")] as const,
  kotor(this: NWScriptInstance, nFactionFrom, nFactionTo) {
    // TODO: move all creatures from current faction to target faction, clear actions
  },
});

export const ChangeFactionByFaction = defineAction({
  id: 737,
  name: "ChangeFactionByFaction",
  comment: "737: This affects all creatures in the area in faction nFactionFrom, changing them to nFactionTo.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nFactionFrom"), intParam("nFactionTo")] as const,
  kotor(this: NWScriptInstance, nFactionFrom, nFactionTo) {
    // TODO: move all creatures from current faction to target faction
  },
});

export const relationsObjectActions = [
  ResistForce,
  GetIsEnemy,
  GetIsFriend,
  GetIsNeutral,
  AdjustAlignment,
  GetFirstFactionMember,
  GetNextFactionMember,
  ChangeToStandardFaction,
  GetStandardFaction,
  SurrenderByFaction,
  ChangeFactionByFaction,
] as const;
