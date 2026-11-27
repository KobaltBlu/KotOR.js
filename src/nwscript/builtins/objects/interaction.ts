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
export const ActionInteractObject = defineAction({
  id: 329,
  name: "ActionInteractObject",
  comment: "329: Use oPlaceable.",
  returnType: NWScriptDataType.VOID,
  params: [objectParam<ModuleObject | undefined>("oPlaceable", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oPlaceable) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) return;
    const action = new GameState.ActionFactory.ActionUseObject();
    action.setParameter(0, ActionParameterType.DWORD, oPlaceable);
    this.caller.actionQueue.add(action);
  },
});

export const GetLastOpenedBy = defineAction({
  id: 376,
  name: "GetLastOpenedBy",
  comment: "376: Get the last creature that opened the caller.\n* Returns OBJECT_INVALID if the caller is not a valid door or placeable.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (
      !BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModulePlaceable) &&
      !BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleDoor)
    ) return undefined;
    return (this.caller as any).lastObjectOpened;
  },
});

export const OpenStore = defineAction({
  id: 378,
  name: "OpenStore",
  comment: "378: Open oStore for oPC.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oStore", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oPC", { optional: true, default: undefined }),
    intParam("nBonusMarkUp", { optional: true, default: 0 }),
    intParam("nBonusMarkDown", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oStore, oPC, nBonusMarkUp, nBonusMarkDown) {
    if (BitWise.InstanceOfObject(oStore, ModuleObjectType.ModuleStore)) {
      const store = oStore as ModuleStore;
      const customer = BitWise.InstanceOfObject(oPC, ModuleObjectType.ModuleCreature)
        ? oPC as ModuleCreature
        : GameState.getCurrentPlayer();

      GameState.MenuManager.MenuStore.setStoreObject(store);
      GameState.MenuManager.MenuStore.setCustomerObject(customer);
      GameState.MenuManager.MenuStore.setBonusMarkUp(nBonusMarkUp);
      GameState.MenuManager.MenuStore.setBonusMarkDown(nBonusMarkDown);

      store.runOnOpenStore(customer);
      GameState.MenuManager.MenuStore.open();
    }
  },
});

export const ExploreAreaForPlayer = defineAction({
  id: 403,
  name: "ExploreAreaForPlayer",
  comment: "403: Expose the entire map of oArea to oPlayer.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oArea", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oPlayer", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oArea, oPlayer) {
    if (BitWise.InstanceOfObject(oArea, ModuleObjectType.ModuleArea)) {
      (oArea as ModuleArea).areaMap.revealEntireMap();
    }
  },
});

export const GetIsEncounterCreature = defineAction({
  id: 409,
  name: "GetIsEncounterCreature",
  comment: "409: * Returns TRUE if oCreature was spawned from an encounter.",
  returnType: NWScriptDataType.INTEGER,
  params: [objectParam<ModuleObject | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    return 0; // Not tracked in current implementation
  },
});

export const GetIsPlaceableObjectActionPossible = defineAction({
  id: 546,
  name: "GetIsPlaceableObjectActionPossible",
  comment: "546: Returns TRUE if nPlaceableAction is valid for oPlaceable.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oPlaceable", { optional: true, default: undefined }),
    intParam("nPlaceableAction"),
  ] as const,
  kotor(this: NWScriptInstance, oPlaceable, nPlaceableAction) {
    if (BitWise.InstanceOfObject(oPlaceable, ModuleObjectType.ModulePlaceable)) {
      const plc = oPlaceable as ModulePlaceable;
      if (plc.isDead()) return NW_FALSE;
      switch (nPlaceableAction) {
        case 0: return !plc.locked ? NW_TRUE : NW_FALSE;
        case 1: return plc.locked ? NW_TRUE : NW_FALSE;
        case 2: return plc.locked ? NW_TRUE : NW_FALSE;
        case 3: return plc.locked ? NW_TRUE : NW_FALSE;
      }
    }
    return 0;
  },
});

export const DoPlaceableObjectAction = defineAction({
  id: 547,
  name: "DoPlaceableObjectAction",
  comment: "547: The caller performs nPlaceableAction on oPlaceable.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject | undefined>("oPlaceable", { optional: true, default: undefined }),
    intParam("nPlaceableAction"),
  ] as const,
  kotor(this: NWScriptInstance, oPlaceable, nPlaceableAction) {
    if (BitWise.InstanceOfObject(oPlaceable, ModuleObjectType.ModulePlaceable)) {
      const plc = oPlaceable as ModulePlaceable;
      switch (nPlaceableAction) {
        case 0: plc.use(this.caller); break;
        case 1: plc.attemptUnlock(this.caller); break;
        case 2: (this.caller as ModuleCreature).attackCreature(plc); break;
      }
    }
  },
});

export const interactionObjectActions = [
  ActionInteractObject,
  GetLastOpenedBy,
  OpenStore,
  ExploreAreaForPlayer,
  GetIsEncounterCreature,
  GetIsPlaceableObjectActionPossible,
  DoPlaceableObjectAction,
] as const;
