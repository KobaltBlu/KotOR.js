import type { ModuleCreature, ModuleObject, ModuleArea, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModulePlaceable, ModuleSound, ModuleStore, ModuleTrigger } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import type { GameEffect } from "@/effects/GameEffect";
import type { GameEvent } from "@/events/GameEvent";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { NW_FALSE, NW_TRUE } from "@/nwscript/NWScriptConstants";
import { BitWise } from "@/utility/BitWise";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #537: upstream-body-changed. */
export const GetLockKeyRequired: INWScriptDefAction = {
    comment: "537: * Returns TRUE if a specific key is required to open the lock on oObject.\n",
    name: "GetLockKeyRequired",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)){
        return (args[0] as any).keyRequired ? NW_TRUE : NW_FALSE;
      }
      return NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #538: upstream-body-changed. */
export const GetLockKeyTag: INWScriptDefAction = {
    comment: "538: Get the tag of the key that will open the lock on oObject.\n",
    name: "GetLockKeyTag",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)){
        return (args[0] as any).keyName || '';
      }
      return '';
    }
  };

/** Upstream 002dfe03, action #539: upstream-body-changed. */
export const GetLockLockable: INWScriptDefAction = {
    comment: "539: * Returns TRUE if the lock on oObject is lockable.\n",
    name: "GetLockLockable",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)){
        return (args[0] as any).lockable ? NW_TRUE : NW_FALSE;
      }
      return NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #540: upstream-body-changed. */
export const GetLockUnlockDC: INWScriptDefAction = {
    comment: "540: Get the DC for unlocking oObject.\n",
    name: "GetLockUnlockDC",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)){
        return (args[0] as any).openLockDC || 0;
      }
      return 0;
    }
  };

/** Upstream 002dfe03, action #541: upstream-body-changed. */
export const GetLockLockDC: INWScriptDefAction = {
    comment: "541: Get the DC for locking oObject.\n",
    name: "GetLockLockDC",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)){
        return (args[0] as any).closeLockDC || 0;
      }
      return 0;
    }
  };

/** Upstream 002dfe03, action #544: upstream-body-changed. */
export const SetPlaceableIllumination: INWScriptDefAction = {
    comment: "544: Set the status of the illumination for oPlaceable.\n- oPlaceable\n- bIlluminate: if this is TRUE, oPlaceable's illumination will be turned on.\nIf this is FALSE, oPlaceable's illumination will be turned off.\nNote: You must call RecomputeStaticLighting() after calling this function in\norder for the changes to occur visually for the players.\nSetPlaceableIllumination() buffers the illumination changes, which are then\nsent out to the players once RecomputeStaticLighting() is called.  As such,\nit is best to call SetPlaceableIllumination() for all the placeables you wish\nto set the illumination on, and then call RecomputeStaticLighting() once after\nall the placeable illumination has been set.\n* If oPlaceable is not a placeable object, or oPlaceable is a placeable that\ndoesn't have a light, nothing will happen.\n",
    name: "SetPlaceableIllumination",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [ModuleObject, number]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModulePlaceable)){
        (args[0] as ModulePlaceable).lightState = args[1] ? true : false;
      }
      return;
    }
  };

/** Upstream 002dfe03, action #545: upstream-body-changed. */
export const GetPlaceableIllumination: INWScriptDefAction = {
    comment: "545: * Returns TRUE if the illumination for oPlaceable is on\n",
    name: "GetPlaceableIllumination",
    type: NWScriptDataType.INTEGER,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModulePlaceable)){
        return (args[0] as ModulePlaceable).lightState ? NW_TRUE : NW_FALSE;
      }
      return NW_FALSE;
    }
  };

/** Upstream 002dfe03, action #555: upstream-body-changed. */
export const SetTrapDisabled: INWScriptDefAction = {
    comment: "555: Disable oTrap.\n- oTrap: a placeable, door or trigger.\n",
    name: "SetTrapDisabled",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)){
        (args[0] as any).trapFlag = false;
      }
      return;
    }
  };
