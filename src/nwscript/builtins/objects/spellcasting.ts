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
export const GetSpellTargetLocation = defineAction({
  id: 222,
  name: "GetSpellTargetLocation",
  comment: "222: Get the location of the caller's last spell target.",
  returnType: NWScriptDataType.LOCATION,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (
      BitWise.InstanceOfObject(this.talent, TalentObjectType.TalentObject) &&
      BitWise.InstanceOfObject(this.talent.oTarget, ModuleObjectType.ModuleObject)
    ) {
      return this.talent.oTarget.getLocation();
    }
    return new EngineLocation();
  },
});

export const ActionCastSpellAtLocation = defineAction({
  id: 234,
  name: "ActionCastSpellAtLocation",
  comment: "234: Cast spell nSpell at lTargetLocation.",
  returnType: NWScriptDataType.VOID,
  params: [
    intParam("nSpell"),
    locationParam<EngineLocation>("lTargetLocation"),
    intParam("nMetaMagic", { optional: true, default: 0 }),
    intParam("bCheat", { optional: true, default: 0 }),
    intParam("nProjectilePathType", { optional: true, default: 0 }),
    intParam("bInstantSpell", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, nSpell, lTargetLocation, nMetaMagic, bCheat, nProjectilePathType, bInstantSpell) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) return;
    const action = new GameState.ActionFactory.ActionCastSpell();
    action.setParameter(0, ActionParameterType.INT, nSpell);
    action.setParameter(1, ActionParameterType.INT, -1);
    action.setParameter(2, ActionParameterType.INT, 0);
    action.setParameter(3, ActionParameterType.INT, 0);
    action.setParameter(4, ActionParameterType.INT, 0);
    action.setParameter(5, ActionParameterType.DWORD, -1);
    action.setParameter(6, ActionParameterType.FLOAT, lTargetLocation.position.x);
    action.setParameter(7, ActionParameterType.FLOAT, lTargetLocation.position.y);
    action.setParameter(8, ActionParameterType.FLOAT, lTargetLocation.position.z);
    action.setParameter(9, ActionParameterType.INT, nProjectilePathType);
    action.setParameter(10, ActionParameterType.INT, -1);
    action.setParameter(11, ActionParameterType.INT, -1);
    this.caller.actionQueue.add(action);
  },
});

export const GetHasSpell = defineAction({
  id: 377,
  name: "GetHasSpell",
  comment: "377: Determine whether oCreature has nSpell memorised.\n- nSpell: SPELL_*",
  returnType: NWScriptDataType.INTEGER,
  params: [
    intParam("nSpell"),
    objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, nSpell, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return (oCreature as ModuleCreature).getHasSpell(nSpell) ? NW_TRUE : NW_FALSE;
    }
    return NW_FALSE;
  },
});

export const GetSpellTarget = defineAction({
  id: 752,
  name: "GetSpellTarget",
  comment: "752: Returns the object id of the spell target.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleCreature)) {
      return oObject.combatData.lastSpellTarget;
    }
    return undefined;
  },
});

export const spellcastingObjectActions = [
  GetSpellTargetLocation,
  ActionCastSpellAtLocation,
  GetHasSpell,
  GetSpellTarget,
] as const;
