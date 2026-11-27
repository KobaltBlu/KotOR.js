import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject } from "@/module";
import { BitWise } from "@/utility/BitWise";
import EngineLocation from "@/engine/EngineLocation";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import { defineAction, floatParam, intParam, locationParam, objectParam } from "@/nwscript/builtins/actionBuilder";

export const SetFacing = defineAction({
  id: 10,
  name: "SetFacing",
  comment: "10: Cause the caller to face fDirection.",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fDirection")] as const,
  kotor(this: NWScriptInstance, fDirection) {
    this.caller.setFacing(fDirection);
  },
});

export const ActionRandomWalk = defineAction({
  id: 20,
  name: "ActionRandomWalk",
  comment: "20: The action subject will generate a random location near its current location and pathfind to it.",
  returnType: NWScriptDataType.VOID,
  params: [] as const,
  kotor(this: NWScriptInstance) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      const action = new GameState.ActionFactory.ActionRandomWalk();
      this.caller.actionQueue.add(action);
    }
  },
});

export const ActionMoveToLocation = defineAction({
  id: 21,
  name: "ActionMoveToLocation",
  comment: "21: The action subject will move to lDestination.",
  returnType: NWScriptDataType.VOID,
  params: [
    locationParam<EngineLocation>("lDestination"),
    intParam("bRun", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, lDestination, bRun) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      (this.caller as ModuleCreature).moveToLocation(lDestination, !!bRun);
    }
  },
});

export const ActionMoveToObject = defineAction({
  id: 22,
  name: "ActionMoveToObject",
  comment: "22: Cause the action subject to move to a certain distance from oMoveTo.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oMoveTo"),
    intParam("bRun", { optional: true, default: 0 }),
    floatParam("fRange", { optional: true, default: 0.0 }),
  ] as const,
  kotor(this: NWScriptInstance, oMoveTo, bRun, fRange) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      (this.caller as ModuleCreature).moveToObject(oMoveTo, !!bRun, fRange);
    }
  },
});

export const ActionWait = defineAction({
  id: 202,
  name: "ActionWait",
  comment: "202: Do nothing for fSeconds seconds.",
  returnType: NWScriptDataType.VOID,
  params: [floatParam("fSeconds")] as const,
  kotor(this: NWScriptInstance, fSeconds) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleObject)) {
      return;
    }
    const action = new GameState.ActionFactory.ActionWait();
    action.setParameter(0, ActionParameterType.FLOAT, fSeconds);
    this.caller.actionQueue.add(action);
  },
});

export const ActionJumpToObject = defineAction({
  id: 196,
  name: "ActionJumpToObject",
  comment: "196: Jump to an object ID, or as near to it as possible.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oTarget"),
    intParam("bWalkStraightLineToPoint", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oTarget, bWalkStraightLineToPoint) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) return;
    if (!BitWise.InstanceOfObject(oTarget, ModuleObjectType.ModuleObject)) return;

    const action = new GameState.ActionFactory.ActionJumpToObject();
    action.setParameter(0, ActionParameterType.DWORD, oTarget.id);
    action.setParameter(1, ActionParameterType.INT, 0);
    this.caller.actionQueue.add(action);
  },
});

export const ActionJumpToLocation = defineAction({
  id: 214,
  name: "ActionJumpToLocation",
  comment: "214: The subject will jump to lLocation instantly (even between areas).",
  returnType: NWScriptDataType.VOID,
  params: [locationParam<EngineLocation>("lLocation")] as const,
  kotor(this: NWScriptInstance, lLocation) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) return;
    if (!(lLocation instanceof EngineLocation)) return;

    const action = new GameState.ActionFactory.ActionJumpToPoint();
    action.setParameter(0, ActionParameterType.FLOAT, lLocation.position.x);
    action.setParameter(1, ActionParameterType.FLOAT, lLocation.position.y);
    action.setParameter(2, ActionParameterType.FLOAT, lLocation.position.z);
    action.setParameter(3, ActionParameterType.DWORD, lLocation.area.id);
    action.setParameter(4, ActionParameterType.INT, 0);
    action.setParameter(5, ActionParameterType.FLOAT, 20.0);
    action.setParameter(6, ActionParameterType.FLOAT, lLocation.rotation.x);
    action.setParameter(7, ActionParameterType.FLOAT, lLocation.rotation.y);
    this.caller.actionQueue.add(action);
  },
});

export const GetDistanceBetweenLocations = defineAction({
  id: 298,
  name: "GetDistanceBetweenLocations",
  comment: "298: Get the distance between lLocationA and lLocationB.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    locationParam<EngineLocation>("lLocationA"),
    locationParam<EngineLocation>("lLocationB"),
  ] as const,
  kotor(this: NWScriptInstance, lLocationA, lLocationB) {
    if (lLocationA instanceof EngineLocation && lLocationB instanceof EngineLocation) {
      return lLocationA.position.distanceTo(lLocationB.position);
    }
    return 0;
  },
});

export const GetDistanceBetweenLocations2D = defineAction({
  id: 334,
  name: "GetDistanceBetweenLocations2D",
  comment: "334: Get the distance between lLocationA and lLocationB in 2D.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    locationParam<EngineLocation>("lLocationA"),
    locationParam<EngineLocation>("lLocationB"),
  ] as const,
  kotor(this: NWScriptInstance, lLocationA, lLocationB) {
    if (lLocationA instanceof EngineLocation && lLocationB instanceof EngineLocation) {
      return lLocationA.position.distanceTo(lLocationB.position);
    }
    return 0;
  },
});

export const GetDistanceBetween2D = defineAction({
  id: 319,
  name: "GetDistanceBetween2D",
  comment: "319: Get the distance in metres between oObjectA and oObjectB in 2D.",
  returnType: NWScriptDataType.FLOAT,
  params: [
    objectParam<ModuleObject>("oObjectA"),
    objectParam<ModuleObject>("oObjectB"),
  ] as const,
  kotor(this: NWScriptInstance, oObjectA, oObjectB) {
    if (BitWise.InstanceOfObject(oObjectB, ModuleObjectType.ModuleObject)) {
      const dx = oObjectA.position.x - oObjectB.position.x;
      const dy = oObjectA.position.y - oObjectB.position.y;
      return Math.sqrt((dx * dx) + (dy * dy));
    }
    return 0.0;
  },
});

export const JumpToLocation = defineAction({
  id: 313,
  name: "JumpToLocation",
  comment: "313: Jump to lDestination.",
  returnType: NWScriptDataType.VOID,
  params: [locationParam<EngineLocation>("lDestination")] as const,
  kotor(this: NWScriptInstance, lDestination) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      this.caller.JumpToLocation(lDestination);
    }
  },
});

export const ActionForceMoveToLocation = defineAction({
  id: 382,
  name: "ActionForceMoveToLocation",
  comment: "382: Force the action subject to move to lDestination.",
  returnType: NWScriptDataType.VOID,
  params: [
    locationParam<EngineLocation>("lDestination"),
    intParam("bRun", { optional: true, default: 0 }),
    floatParam("fTimeout", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, lDestination, bRun, fTimeout) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      (this.caller as ModuleCreature).moveToLocation(lDestination, !!bRun);
    }
  },
});

export const ActionForceMoveToObject = defineAction({
  id: 383,
  name: "ActionForceMoveToObject",
  comment: "383: Force the action subject to move to oMoveTo.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oMoveTo"),
    intParam("bRun", { optional: true, default: 0 }),
    floatParam("fRange", { optional: true, default: 0.0 }),
    floatParam("fTimeout", { optional: true, default: 0.0 }),
  ] as const,
  kotor(this: NWScriptInstance, oMoveTo, bRun, fRange, fTimeout) {
    if (BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) {
      (this.caller as ModuleCreature).moveToObject(oMoveTo, !!bRun, fRange);
    }
  },
});

export const JumpToObject = defineAction({
  id: 385,
  name: "JumpToObject",
  comment: "385: Jump to oToJumpTo.",
  returnType: NWScriptDataType.VOID,
  params: [
    objectParam<ModuleObject>("oToJumpTo"),
    intParam("bWalkStraightLineToPoint", { optional: true, default: 0 }),
  ] as const,
  kotor(this: NWScriptInstance, oToJumpTo, bWalkStraightLineToPoint) {
    if (!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)) return;
    if (!BitWise.InstanceOfObject(oToJumpTo, ModuleObjectType.ModuleObject)) return;
    (this.caller as ModuleCreature).jumpToObject(oToJumpTo);
  },
});

export const movementActions = [
  SetFacing,
  ActionRandomWalk,
  ActionMoveToLocation,
  ActionMoveToObject,
  ActionWait,
  ActionJumpToObject,
  ActionJumpToLocation,
  GetDistanceBetweenLocations,
  GetDistanceBetweenLocations2D,
  GetDistanceBetween2D,
  JumpToLocation,
  ActionForceMoveToLocation,
  ActionForceMoveToObject,
  JumpToObject,
] as const;
