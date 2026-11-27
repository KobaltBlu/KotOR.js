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
export const GetFirstPC = defineAction({
  id: 548,
  name: "GetFirstPC",
  comment: "548: Get the first PC in the player list.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.PartyManager.Player || GameState.PartyManager.party[0];
  },
});

export const GetNextPC = defineAction({
  id: 549,
  name: "GetNextPC",
  comment: "549: Get the next PC in the player list.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance): ModuleObject | undefined {
    return undefined;
  },
});

export const GetSoloMode = defineAction({
  id: 462,
  name: "GetSoloMode",
  comment: "462: Returns TRUE if the player is in 'solo mode'.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.SOLOMODE ? NW_TRUE : NW_FALSE;
  },
});

export const SetSoloMode = defineAction({
  id: 753,
  name: "SetSoloMode",
  comment: "753: Activates/Deactivates solo mode for the player's party.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("bSoloMode")] as const,
  kotor(this: NWScriptInstance, bSoloMode) {
    GameState.SOLOMODE = !!bSoloMode;
  },
});

export const GetPartyAIStyle = defineAction({
  id: 704,
  name: "GetPartyAIStyle",
  comment: "704: Returns the party ai style.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return GameState.PartyManager.aiStyle;
  },
});

export const GetNPCAIStyle = defineAction({
  id: 705,
  name: "GetNPCAIStyle",
  comment: "705: Returns the party member's ai style.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as any).aiStyle;
    }
    return 0;
  },
});

export const SetPartyAIStyle = defineAction({
  id: 706,
  name: "SetPartyAIStyle",
  comment: "706: Sets the party ai style.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nStyle")] as const,
  kotor(this: NWScriptInstance, nStyle) {
    GameState.PartyManager.aiStyle = nStyle;
  },
});

export const SetNPCAIStyle = defineAction({
  id: 707,
  name: "SetNPCAIStyle",
  comment: "707: Sets the party member's ai style.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
    intParam("nStyle"),
  ] as const,
  kotor(this: NWScriptInstance, oCreature, nStyle) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      (oCreature as any).aiStyle = nStyle;
    }
  },
});

export const SetNPCSelectability = defineAction({
  id: 708,
  name: "SetNPCSelectability",
  comment: "708: SetNPCSelectability",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nNPC"), intParam("bSelectable")] as const,
  kotor(this: NWScriptInstance, nNPC, bSelectable) {
    GameState.PartyManager.SetSelectable(nNPC, !!bSelectable);
  },
});

export const GetNPCSelectability = defineAction({
  id: 709,
  name: "GetNPCSelectability",
  comment: "709: GetNPCSelectability",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nNPC")] as const,
  kotor(this: NWScriptInstance, nNPC) {
    return GameState.PartyManager.IsSelectable(nNPC) ? NW_TRUE : NW_FALSE;
  },
});

export const SaveNPCState = defineAction({
  id: 734,
  name: "SaveNPCState",
  comment: "734: Tells the party table to save the state of a party member NPC.",
  returnType: NWScriptDataType.VOID,
  params: [intParam("nNPC")] as const,
  kotor(this: NWScriptInstance, nNPC) {
    GameState.PartyManager.SavePartyMember(nNPC);
  },
});

export const partyObjectActions = [
  GetFirstPC,
  GetNextPC,
  GetSoloMode,
  SetSoloMode,
  GetPartyAIStyle,
  GetNPCAIStyle,
  SetPartyAIStyle,
  SetNPCAIStyle,
  SetNPCSelectability,
  GetNPCSelectability,
  SaveNPCState,
] as const;
