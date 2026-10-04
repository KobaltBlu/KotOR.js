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
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, locationParam, objectParam, stringParam, vectorParam } from "@/nwscript/builtins/actionBuilder";
export const GetReflexAdjustedDamage = defineAction({
  id: 299,
  name: "GetReflexAdjustedDamage",
  comment: "299: Use this in spell scripts to get nDamage adjusted by oTarget's reflex and evasion saves.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nDamage"),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    intParam("nDC"),
    intParam("nSaveType", { optional: true, default: 0 }),
    objectParam<ModuleObject | undefined>("oSaveVersus", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, nDamage, oTarget, nDC, nSaveType, oSaveVersus) {
    if (!BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleCreature)) {
      return nDamage;
    }

    const target = oTarget as ModuleCreature;
    const saved = target.reflexSave(nDC, nSaveType, oSaveVersus) ? true : false;

    if (!saved) {
      return nDamage;
    }

    if (target.getHasFeat(CombatFeatType.EVASION)) {
      return 0;
    }

    return Math.floor(nDamage / 2);
  },
});

export const GetDamageDealtByType = defineAction({
  id: 344,
  name: "GetDamageDealtByType",
  comment: "344: Get the amount of damage of type nDamageType that has been dealt to the caller.",
  returnType: NWScriptDataType.INTEGER,
  params: [intParam("nDamageType")] as const,
  kotor(this: NWScriptInstance, nDamageType) {
    return 0; // TODO: track damage by type
  },
});

export const GetLastDamager = defineAction({
  id: 346,
  name: "GetLastDamager",
  comment: "346: Get the last object that damaged the caller.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      return this.caller.combatData.lastDamager;
    }
    return undefined;
  },
});

export const CutsceneAttack = defineAction({
  id: 503,
  name: "CutsceneAttack",
  comment: "503: CutsceneAttack\nThis function allows the designer to specify exactly what happens in a combat round.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    intParam("nAnimation"),
    intParam("nAttackResult"),
    intParam("nDamage"),
  ] as const,
  kotor(this: NWScriptInstance, oTarget, nAnimation, nAttackResult, nDamage) {
    if (
      BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleCreature) ||
      BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModulePlaceable)
    ) {
      const animName = GameState.TwoDAManager.datatables.get("animations").rows[nAnimation]?.name;
      this.caller.attackCreature(oTarget, undefined, true, nDamage, animName, nAttackResult);
    } else {
      console.error("CutsceneAttack", oTarget);
    }
  },
});

export const GetLastHostileActor = defineAction({
  id: 556,
  name: "GetLastHostileActor",
  comment: "556: Get the last object that was sent as an attacker/damager/disturber.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    const target = oObject ?? this.caller;
    if (!BitWise.InstanceOfObject(target, ModuleObjectType.ModuleObject)) {
      return undefined;
    }

    const hostileActor =
      target.combatData.lastAttacker ??
      target.combatData.lastDamager ??
      target.combatData.lastSpellAttacker ??
      undefined;

    if (!BitWise.InstanceOfObject(hostileActor, ModuleObjectType.ModuleCreature)) {
      return undefined;
    }

    if (hostileActor.isDead() || hostileActor.destroyed) {
      return undefined;
    }

    return hostileActor;
  },
});

export const GetLastHostileTarget = defineAction({
  id: 721,
  name: "GetLastHostileTarget",
  comment: "721: Returns the last attack target for a given object.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    const target = oObject ?? this.caller;
    if (BitWise.InstanceOfObject(target, ModuleObjectType.ModuleCreature)) {
      return target.combatData.lastAttackTarget;
    }
    return this.caller.combatData.lastAttackTarget;
  },
});

export const GetLastForcePowerUsed = defineAction({
  id: 723,
  name: "GetLastForcePowerUsed",
  comment: "723: Returns the last force power used by the given object.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return oObject.combatData.lastForcePowerUsed?.id ?? -1;
    }
    return -1;
  },
});

export const GetLastCombatFeatUsed = defineAction({
  id: 724,
  name: "GetLastCombatFeatUsed",
  comment: "724: Returns the last feat used by the given object.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return oObject.combatData.lastCombatFeatUsed?.id ?? -1;
    }
    return -1;
  },
});

export const GetWasForcePowerSuccessful = defineAction({
  id: 726,
  name: "GetWasForcePowerSuccessful",
  comment: "726: Returns whether the last force power used was successful or not.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return oObject.combatData.lastForcePowerSuccess ? 1 : 0;
    }
    return 0;
  },
});

export const GetFirstAttacker = defineAction({
  id: 727,
  name: "GetFirstAttacker",
  comment: "727: Returns the first object in the area that is attacking oCreature.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (!BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleObject)) return undefined;
    this.creatureAttackerIndex.set(oCreature.id, 0);
    return GameState.ModuleObjectManager.GetAttackerByIndex(oCreature, 0);
  },
});

export const GetNextAttacker = defineAction({
  id: 728,
  name: "GetNextAttacker",
  comment: "728: Returns the next object in the area that is attacking oCreature.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (!BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleObject)) return undefined;
    const nextId = (this.creatureAttackerIndex.get(oCreature.id) ?? 0) + 1;
    this.creatureAttackerIndex.set(oCreature.id, nextId);
    return GameState.ModuleObjectManager.GetAttackerByIndex(oCreature, nextId);
  },
});

export const SetForcePowerUnsuccessful = defineAction({
  id: 731,
  name: "SetForcePowerUnsuccessful",
  comment: "731: Sets the reason for why a force power failed.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nResult"),
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, nResult, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      oObject.combatData.lastAttackResult = nResult;
      oObject.combatData.lastForcePowerSuccess = false;
    }
  },
});

export const GetIsDebilitated = defineAction({
  id: 732,
  name: "GetIsDebilitated",
  comment: "732: Returns whether the given object is debilitated or not.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return oObject.isDebilitated();
    }
    return 0;
  },
});

export const GetCreatureMovmentType = defineAction({
  id: 566,
  name: "GetCreatureMovmentType",
  comment: "566: Returns a value matching one of the MOVEMENT_SPEED_* constants.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return oCreature.isDebilitated() ? 1 : 0;
    }
    return 1;
  },
});

export const GetWeaponRanged = defineAction({
  id: 511,
  name: "GetWeaponRanged",
  comment: "511: * Returns TRUE if oItem is a ranged weapon.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oItem", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oItem) {
    if (BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)) {
      return (oItem as ModuleItem).getWeaponType() === 4 ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const combatObjectActions = [
  GetReflexAdjustedDamage,
  GetDamageDealtByType,
  GetLastDamager,
  CutsceneAttack,
  GetLastHostileActor,
  GetLastHostileTarget,
  GetLastForcePowerUsed,
  GetLastCombatFeatUsed,
  GetWasForcePowerSuccessful,
  GetFirstAttacker,
  GetNextAttacker,
  SetForcePowerUnsuccessful,
  GetIsDebilitated,
  GetCreatureMovmentType,
  GetWeaponRanged,
] as const;
