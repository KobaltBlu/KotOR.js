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
export const GetArea = defineAction({
  id: 24,
  name: "GetArea",
  comment: "24: Get the area that oTarget is currently in. Return value on error: OBJECT_INVALID.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      return oTarget.area;
    }

    return undefined;
  },
});

export const GetEnteringObject = defineAction({
  id: 25,
  name: "GetEnteringObject",
  comment: "25: Get the object that last entered or triggered the caller.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,

  kotor(this: NWScriptInstance) {
    return this.enteringObject;
  },
});

export const GetExitingObject = defineAction({
  id: 26,
  name: "GetExitingObject",
  comment: "26: Get the object that last left the caller.",
  returnType: NWScriptDataType.OBJECT,
  params: [] as const,

  kotor(this: NWScriptInstance) {
    return this.exitingObject;
  },
});

export const GetPosition = defineAction({
  id: 27,
  name: "GetPosition",
  comment: "27: Get the position of oTarget. Return value on error: vector (0.0, 0.0, 0.0).",
  returnType: NWScriptDataType.VECTOR,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      return oTarget.position.clone();
    }

    return { x: 0.0, y: 0.0, z: 0.0 };
  },
});

export const GetFacing = defineAction({
  id: 28,
  name: "GetFacing",
  comment: "28: Get the direction in which oTarget is facing.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oTarget) {
    if (BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) {
      return oTarget.rotation.z;
    }

    return 0.0;
  },
});

export const GetDistanceToObject = defineAction({
  id: 41,
  name: "GetDistanceToObject",
  comment: "41: Get the distance from the caller to oObject in metres. Return value on error: -1.0.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oObject) {
    if (
      BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject) &&
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)
    ) {
      return this.caller.position.distanceTo(oObject.position);
    }

    return -1.0;
  },
});

export const GetIsObjectValid = defineAction({
  id: 42,
  name: "GetIsObjectValid",
  comment: "42: Returns TRUE if oObject is a valid object.",
  returnType: NWScriptDataType.INTEGER,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oObject) {
    return BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject) ? NW_TRUE : NW_FALSE;
  },
});

export const GetDistanceBetween = defineAction({
  id: 151,
  name: "GetDistanceBetween",
  comment: "151: Get the distance in metres between oObjectA and oObjectB.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    objectParam<ModuleObject | undefined>("oObjectA", { optional: true, default: undefined }),
    objectParam<ModuleObject | undefined>("oObjectB", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oObjectA, oObjectB) {
    if (
      BitWise.InstanceOfObject(oObjectA, ModuleObjectType.ModuleObject) &&
      BitWise.InstanceOfObject(oObjectB, ModuleObjectType.ModuleObject)
    ) {
      return oObjectA.position.distanceTo(oObjectB.position);
    }

    return 0.0;
  },
});

export const GetTag = defineAction({
  id: 168,
  name: "GetTag",
  comment: "168: Get the tag of oObject.",
  returnType: NWScriptDataType.STRING,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject.getTag();
    }

    return "";
  },
});

export const GetObjectByTag = defineAction({
  id: 200,
  name: "GetObjectByTag",
  comment: "200: Get the nth object with the specified tag.",
  returnType: NWScriptDataType.OBJECT,
  params: [
    stringParam("sTag"),
    intParam("nNth", { optional: true, default: 0 }),
  ] as const,

  kotor(this: NWScriptInstance, sTag, nNth) {
    return GameState.ModuleObjectManager.GetObjectByTag(sTag, nNth);
  },
});

export const GetLocation = defineAction({
  id: 213,
  name: "GetLocation",
  comment: "213: Get the location of oObject.",
  returnType: NWScriptDataType.LOCATION,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject.getLocation();
    }

    return new EngineLocation();
  },
});

export const GetPositionFromLocation = defineAction({
  id: 223,
  name: "GetPositionFromLocation",
  comment: "223: Get the position vector from lLocation.",
  returnType: NWScriptDataType.VECTOR,
  params: [
    objectParam<EngineLocation | undefined>("lLocation", { optional: true, default: undefined, type: NWScriptDataType.LOCATION } as any),
  ] as const,

  kotor(this: NWScriptInstance, lLocation) {
    if (lLocation) {
      return lLocation.position.clone();
    }

    return { x: 0, y: 0, z: 0 } as THREE.Vector3;
  },
});

export const GetName = defineAction({
  id: 253,
  name: "GetName",
  comment: "253: Get the name of oObject.",
  returnType: NWScriptDataType.STRING,
  params: [
    objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined }),
  ] as const,

  kotor(this: NWScriptInstance, oObject) {
    if (BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)) {
      return oObject.getName();
    }

    return "";
  },
});

export const GetFirstObjectInArea = defineAction({
  id: 93,
  name: "GetFirstObjectInArea",
  comment: "93: Get the first object in oArea.\n- nObjectFilter: OBJECT_TYPE_*\n* Return value on error: OBJECT_INVALID",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleArea | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nObjectFilter", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oArea, nObjectFilter) {
    return GameState.ModuleObjectManager.GetFirstObjectInArea(oArea, nObjectFilter);
  },
});

export const GetNextObjectInArea = defineAction({
  id: 94,
  name: "GetNextObjectInArea",
  comment: "94: Get the next object in oArea.\n- nObjectFilter: OBJECT_TYPE_*\n* Return value on error: OBJECT_INVALID",
  returnType: NWScriptDataType.OBJECT,
  params: [
    objectParam<ModuleArea | undefined>("oArea", { optional: true, default: undefined }),
    intParam("nObjectFilter", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oArea, nObjectFilter) {
    return GameState.ModuleObjectManager.GetNextObjectInArea(oArea, nObjectFilter);
  },
});

export const GetFirstObjectInShape = defineAction({
  id: 128,
  name: "GetFirstObjectInShape",
  comment: "128: Get the first object in nShape.\n- nShape: SHAPE_*\nReturn value on error: OBJECT_INVALID",
  returnType: NWScriptDataType.OBJECT,
  params: [
    intParam("nShape"),
    floatParam("fSize"),
    locationParam<EngineLocation>("lTarget"),
    intParam("bLineOfSight", { optional: true, default: 0 }),
    intParam("nObjectFilter", { optional: true, default: 1 }),
    vectorParam<THREE.Vector3>("vOrigin", { optional: true, default: undefined as any }),
  ] as const,
  kotor(this: NWScriptInstance, nShape, fSize, lTarget, bLineOfSight, nObjectFilter, vOrigin) {
    this.objectInSphapeIndex.set(nShape, 0);
    return GameState.ModuleObjectManager.GetObjectsInShape(
      nShape, fSize, lTarget, !!bLineOfSight, nObjectFilter, vOrigin, 0
    );
  },
});

export const GetNextObjectInShape = defineAction({
  id: 129,
  name: "GetNextObjectInShape",
  comment: "129: Get the next object in nShape.\nReturn value on error: OBJECT_INVALID",
  returnType: NWScriptDataType.OBJECT,
  params: [
    intParam("nShape"),
    floatParam("fSize"),
    locationParam<EngineLocation>("lTarget"),
    intParam("bLineOfSight", { optional: true, default: 0 }),
    intParam("nObjectFilter", { optional: true, default: 1 }),
    vectorParam<THREE.Vector3>("vOrigin", { optional: true, default: undefined as any }),
  ] as const,
  kotor(this: NWScriptInstance, nShape, fSize, lTarget, bLineOfSight, nObjectFilter, vOrigin) {
    const nextId = (this.objectInSphapeIndex.get(nShape) ?? 0) + 1;
    this.objectInSphapeIndex.set(nShape, nextId);
    return GameState.ModuleObjectManager.GetObjectsInShape(
      nShape, fSize, lTarget, !!bLineOfSight, nObjectFilter, vOrigin, nextId
    );
  },
});

export const Location = defineAction({
  id: 215,
  name: "Location",
  comment: "215: Create a location.",
  returnType: NWScriptDataType.LOCATION,
  params: [
    vectorParam<THREE.Vector3>("vPosition"),
    floatParam("fOrientation"),
  ] as const,
  kotor(this: NWScriptInstance, vPosition, fOrientation) {
    const location = new EngineLocation(vPosition.x, vPosition.y, vPosition.z);
    location.setBearing(fOrientation);
    return location;
  },
});

export const GetFacingFromLocation = defineAction({
  id: 225,
  name: "GetFacingFromLocation",
  comment: "225: Get the orientation value from lLocation.",
  returnType: NWScriptDataType.FLOAT,
  params: [locationParam<EngineLocation>("lLocation")] as const,
  kotor(this: NWScriptInstance, lLocation) {
    if (lLocation instanceof EngineLocation) {
      return lLocation.getFacing();
    }
    return 0;
  },
});

export const GetWaypointByTag = defineAction({
  id: 197,
  name: "GetWaypointByTag",
  comment: "197: Get the first waypoint with the specified tag.\n* Returns OBJECT_INVALID if the waypoint cannot be found.",
  returnType: NWScriptDataType.OBJECT,
  params: [stringParam("sTag")] as const,
  kotor(this: NWScriptInstance, sTag) {
    return GameState.ModuleObjectManager.GetObjectByTag(sTag, 0, NWModuleObjectType.WAYPOINT);
  },
});

export const GetNearestObject = defineAction({
  id: 227,
  name: "GetNearestObject",
  comment: "227: Get the Nth object nearest to oTarget that is of the specified type.\n- nObjectType: OBJECT_TYPE_*\n* Return value on error: OBJECT_INVALID",
  returnType: NWScriptDataType.OBJECT,
  params: [
    intParam("nObjectType", { optional: true, default: 32767 }),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    intParam("nNth", { optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, nObjectType, oTarget, nNth) {
    return GameState.ModuleObjectManager.GetNearestObject(nObjectType, oTarget, nNth - 1);
  },
});

export const GetNearestObjectByTag = defineAction({
  id: 229,
  name: "GetNearestObjectByTag",
  comment: "229: Get the nth Object nearest to oTarget that has sTag as its tag.\n* Return value on error: OBJECT_INVALID",
  returnType: NWScriptDataType.OBJECT,
  params: [
    stringParam("sTag"),
    objectParam<ModuleObject | undefined>("oTarget", { optional: true, default: undefined }),
    intParam("nNth", { optional: true, default: 1 }),
  ] as const,
  kotor(this: NWScriptInstance, sTag, oTarget, nNth) {
    return GameState.ModuleObjectManager.GetNearestObjectByTag(sTag, oTarget, nNth - 1);
  },
});

export const GetDistanceToObject2D = defineAction({
  id: 335,
  name: "GetDistanceToObject2D",
  comment: "335: Get the distance from the caller to oObject in metres (2D).\n* Return value on error: -1.0",
  returnType: NWScriptDataType.FLOAT,
  params: [objectParam<ModuleObject | undefined>("oObject", { optional: true, default: undefined })] as const,
  kotor(this: NWScriptInstance, oObject) {
    if (
      BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject) &&
      BitWise.InstanceOfObject(oObject, ModuleObjectType.ModuleObject)
    ) {
      const dx = this.caller.position.x - oObject.position.x;
      const dy = this.caller.position.y - oObject.position.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
    return -1.0;
  },
});

export const queryObjectActions = [
  GetArea,
  GetEnteringObject,
  GetExitingObject,
  GetPosition,
  GetFacing,
  GetDistanceToObject,
  GetIsObjectValid,
  GetDistanceBetween,
  GetTag,
  GetObjectByTag,
  GetLocation,
  GetPositionFromLocation,
  GetName,
  GetFirstObjectInArea,
  GetNextObjectInArea,
  GetFirstObjectInShape,
  GetNextObjectInShape,
  Location,
  GetFacingFromLocation,
  GetWaypointByTag,
  GetNearestObject,
  GetNearestObjectByTag,
  GetDistanceToObject2D,
] as const;
