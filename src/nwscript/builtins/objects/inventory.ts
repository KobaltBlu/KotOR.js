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
export const GetFirstItemInInventory = defineAction({
  id: 339,
  name: "GetFirstItemInInventory",
  comment: "339: Get the first item in oTarget's inventory.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      if (GameState.PartyManager.party.indexOf(oTarget as any) >= 0) {
        this.objectInventoryIndex.set(-1, 0);
        return GameState.InventoryManager.inventory[0];
      } else {
        this.objectInventoryIndex.set(oTarget.id, 0);
        return oTarget.inventory[0];
      }
    }
    return undefined;
  },
});

export const GetNextItemInInventory = defineAction({
  id: 340,
  name: "GetNextItemInInventory",
  comment: "340: Get the next item in oTarget's inventory.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      if (GameState.PartyManager.party.indexOf(oTarget as any) >= 0) {
        const nextId = (this.objectInventoryIndex.get(-1) ?? 0) + 1;
        this.objectInventoryIndex.set(-1, nextId);
        return GameState.InventoryManager.inventory[nextId];
      } else {
        const nextId = (this.objectInventoryIndex.get(oTarget.id) ?? 0) + 1;
        this.objectInventoryIndex.set(oTarget.id, nextId);
        return oTarget.inventory[nextId];
      }
    }
    return undefined;
  },
});

export const GetLastDisturbed = defineAction({
  id: 348,
  name: "GetLastDisturbed",
  comment: "348: Get the last object that disturbed the inventory of the caller.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    return this.lastDisturbed;
  },
});

export const inventoryObjectActions = [
  GetFirstItemInInventory,
  GetNextItemInInventory,
  GetLastDisturbed,
] as const;
