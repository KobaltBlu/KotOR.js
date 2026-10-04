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
export const GetObjectSeen = defineAction({
  id: 289,
  name: "GetObjectSeen",
  comment: "289: Determine whether oSource sees oTarget.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oSource", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oTarget, oSource) {
    if (BitWise.InstanceOfObject(oSource, ModuleObjectType.ModuleCreature)) {
      for (let i = 0, len = oSource.perceptionList.length; i < len; i++) {
        const perception = oSource.perceptionList[i];
        if (perception.object === oTarget && !!(perception.data & PerceptionMask.SEEN)) {
          return NW_TRUE;
        }
      }
    }
    return NW_FALSE;
  },
});

export const GetObjectHeard = defineAction({
  id: 290,
  name: "GetObjectHeard",
  comment: "290: Determine whether oSource hears oTarget.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oSource", { optional: true, default: undefined }),
  ] as const,
  kotor(this: NWScriptInstance, oTarget, oSource) {
    if (BitWise.InstanceOfObject(oSource, ModuleObjectType.ModuleCreature)) {
      for (let i = 0, len = oSource.perceptionList.length; i < len; i++) {
        const perception = oSource.perceptionList[i];
        if (perception.object === oTarget && !!(perception.data & PerceptionMask.HEARD)) {
          return NW_TRUE;
        }
      }
    }
    return NW_FALSE;
  },
});

export const GetLastPerceptionVanished = defineAction({
  id: 261,
  name: "GetLastPerceptionVanished",
  comment: "261: Use this in an OnPerception script to determine whether the object that was perceived has vanished.",
  returnType: NWScriptDataType.INTEGER,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.lastPerceived.object, ModuleObjectType.ModuleObject)) {
      return this.lastPerceived.object.isDead() || !!(this.lastPerceived.data & PerceptionMask.INVISIBLE);
    }
    return 0;
  },
});

export const GetFirstInPersistentObject = defineAction({
  id: 262,
  name: "GetFirstInPersistentObject",
  comment: "262: Get the first object within oPersistentObject.\n* Returns OBJECT_INVALID if no object is found.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oPersistentObject", { optional: true, default: undefined }),
    intParam("nResidentObjectType", { optional: true, default: 1 }),
    intParam("nPersistentZone", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oPersistentObject, nResidentObjectType, nPersistentZone) {
    if (BitWise.InstanceOfObject(oPersistentObject, ModuleObjectType.ModuleTrigger)) {
      this.persistentObjectIndex.set(oPersistentObject.id, 0);
      return (oPersistentObject as unknown as ModuleTrigger).objectsInside[0];
    }
    return undefined;
  },
});

export const GetNextInPersistentObject = defineAction({
  id: 263,
  name: "GetNextInPersistentObject",
  comment: "263: Get the next object within oPersistentObject.\n* Returns OBJECT_INVALID if no object is found.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oPersistentObject", { optional: true, default: undefined }),
    intParam("nResidentObjectType", { optional: true, default: 1 }),
    intParam("nPersistentZone", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oPersistentObject, nResidentObjectType, nPersistentZone) {
    if (BitWise.InstanceOfObject(oPersistentObject, ModuleObjectType.ModuleTrigger)) {
      const nextId = (this.persistentObjectIndex.get(oPersistentObject.id) ?? 0) + 1;
      this.persistentObjectIndex.set(oPersistentObject.id, nextId);
      return (oPersistentObject as unknown as ModuleTrigger).objectsInside[nextId];
    }
    return undefined;
  },
});

export const GetBlockingDoor = defineAction({
  id: 336,
  name: "GetBlockingDoor",
  comment: "336: Get the last blocking door encountered by the caller.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller.collisionManager.blockingObject, ModuleObjectType.ModuleDoor)) {
      return this.caller.collisionManager.blockingObject;
    }
    return undefined;
  },
});

export const GetBlockingCreature = defineAction({
  id: 490,
  name: "GetBlockingCreature",
  comment: "490: Get the blocking creature.",
  returnType: NWScriptDataType.OBJECT,
  params: [objectParam<ModuleCreature | undefined>("oCreature", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oCreature) {
    if (BitWise.InstanceOfObject(oCreature, ModuleObjectType.ModuleCreature)) {
      return oCreature.collisionManager.blockingObject;
    }
    return undefined;
  },
});

export const GetAttemptedMovementTarget = defineAction({
  id: 489,
  name: "GetAttemptedMovementTarget",
  comment: "489: Get the last attempted movement target.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,
  kotor(this: NWScriptInstance): ModuleObject | undefined {
    return undefined; // Not tracked
  },
});

export const perceptionObjectActions = [
  GetObjectSeen,
  GetObjectHeard,
  GetLastPerceptionVanished,
  GetFirstInPersistentObject,
  GetNextInPersistentObject,
  GetBlockingDoor,
  GetBlockingCreature,
  GetAttemptedMovementTarget,
] as const;
