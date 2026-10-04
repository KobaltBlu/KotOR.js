import EngineLocation from "@/engine/EngineLocation";
import { GameState } from "@/GameState";
import type { ModuleCreature, ModuleObject, ModuleArea, ModuleDoor, ModuleEncounter, ModuleItem, ModuleMGEnemy, ModuleMGObstacle, ModuleMGPlayer, ModulePlaceable, ModuleSound, ModuleStore, ModuleTrigger } from "@/module";
import type { TalentObject } from "@/talents/TalentObject";
import type { GameEffect } from "@/effects/GameEffect";
import type { GameEvent } from "@/events/GameEvent";
import type { NWScriptInstance } from "@/nwscript/NWScriptInstance";
import type { OdysseyWalkMesh } from "@/odyssey/OdysseyWalkMesh";
import type { OdysseyModel3D } from "@/three/odyssey";
import { NWScriptDataType } from "@/enums/nwscript/NWScriptDataType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import type { INWScriptDefAction } from "@/interface/nwscript/INWScriptDefAction";

/** Upstream 002dfe03, action #198: upstream-body-changed. */
export const GetTransitionTarget: INWScriptDefAction = {
    comment: "198: Get the destination (a waypoint or a door) for a trigger or a door.\n* Returns OBJECT_INVALID if oTransition is not a valid trigger or door.\n",
    name: "GetTransitionTarget",
    type: NWScriptDataType.OBJECT,
    args: [NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject]){
      if(BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)){
        const linkedTo = (args[0] as any).linkedTo;
        if(linkedTo && linkedTo.length){
          return GameState.ModuleObjectManager.GetObjectByTag(linkedTo, 0);
        }
      }
      return undefined;
    }
  };

/** Upstream 002dfe03, action #226: upstream-body-changed. */
export const GetNearestCreatureToLocation: INWScriptDefAction = {
    comment: "226: Get the creature nearest to lLocation, subject to all the criteria specified.\n- nFirstCriteriaType: CREATURE_TYPE_*\n- nFirstCriteriaValue:\n-> CLASS_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_CLASS\n-> SPELL_* if nFirstCriteriaType was CREATURE_TYPE_DOES_NOT_HAVE_SPELL_EFFECT\nor CREATURE_TYPE_HAS_SPELL_EFFECT\n-> TRUE or FALSE if nFirstCriteriaType was CREATURE_TYPE_IS_ALIVE\n-> PERCEPTION_* if nFirstCriteriaType was CREATURE_TYPE_PERCEPTION\n-> PLAYER_CHAR_IS_PC or PLAYER_CHAR_NOT_PC if nFirstCriteriaType was\nCREATURE_TYPE_PLAYER_CHAR\n-> RACIAL_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_RACIAL_TYPE\n-> REPUTATION_TYPE_* if nFirstCriteriaType was CREATURE_TYPE_REPUTATION\nFor example, to get the nearest PC, use\n(CREATURE_TYPE_PLAYER_CHAR, PLAYER_CHAR_IS_PC)\n- lLocation: We're trying to find the creature of the specified type that is\nnearest to lLocation\n- nNth: We don't have to find the first nearest: we can find the Nth nearest....\n- nSecondCriteriaType: This is used in the same way as nFirstCriteriaType to\nfurther specify the type of creature that we are looking for.\n- nSecondCriteriaValue: This is used in the same way as nFirstCriteriaValue\nto further specify the type of creature that we are looking for.\n- nThirdCriteriaType: This is used in the same way as nFirstCriteriaType to\nfurther specify the type of creature that we are looking for.\n- nThirdCriteriaValue: This is used in the same way as nFirstCriteriaValue to\nfurther specify the type of creature that we are looking for.\n* Return value on error: OBJECT_INVALID\n",
    name: "GetNearestCreatureToLocation",
    type: NWScriptDataType.OBJECT,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [number, number, EngineLocation, number, number, number, number, number]){
      if(!args[2]) return undefined;
      const anchor: any = { position: args[2].position, area: args[2].area };
      return GameState.ModuleObjectManager.GetNearestCreature(
        args[0], args[1], anchor, args[3] || 1,
        args[4], args[5], args[6], args[7]
      );
    }
  };

/** Upstream 002dfe03, action #228: upstream-body-changed. */
export const GetNearestObjectToLocation: INWScriptDefAction = {
    comment: "228: Get the nNth object nearest to lLocation that is of the specified type.\n- nObjectType: OBJECT_TYPE_*\n- lLocation\n- nNth\n* Return value on error: OBJECT_INVALID\n",
    name: "GetNearestObjectToLocation",
    type: NWScriptDataType.OBJECT,
    args: [NWScriptDataType.INTEGER, NWScriptDataType.LOCATION, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [number, EngineLocation, number]){
      if(!args[1]) return undefined;
      const anchor: any = { position: args[1].position, area: args[1].area };
      return GameState.ModuleObjectManager.GetNearestObject(args[0], anchor, args[2]);
    }
  };

/** Upstream 002dfe03, action #326: upstream-body-changed. */
export const GetClickingObject: INWScriptDefAction = {
    comment: "326: Use this in a trigger's OnClick event script to get the object that last\nclicked on it.\nThis is identical to GetEnteringObject.\n",
    name: "GetClickingObject",
    type: NWScriptDataType.OBJECT,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      return (this.caller as any)?.lastUsedBy || undefined;
    }
  };

/** Upstream 002dfe03, action #411: upstream-body-changed. */
export const GetStartingLocation: INWScriptDefAction = {
    comment: "411: Get the starting location of the module.\n",
    name: "GetStartingLocation",
    type: NWScriptDataType.LOCATION,
    args: [],
    action: function(this: NWScriptInstance, args: []){
      const module = GameState.module;
      if(!module) return undefined;
      return new EngineLocation(
        module.entryX || 0, module.entryY || 0, module.entryZ || 0,
        module.entryDirectionX || 0, module.entryDirectionY || 0, 0
      );
    }
  };

/** Upstream 002dfe03, action #488: upstream-body-changed. */
export const GetNearestTrapToObject: INWScriptDefAction = {
    comment: "488: Get the trap nearest to oTarget.\nNote : 'trap objects' are actually any trigger, placeable or door that is\ntrapped in oTarget's area.\n- oTarget\n- nTrapDetected: if this is TRUE, the trap returned has to have been detected\nby oTarget.\n",
    name: "GetNearestTrapToObject",
    type: NWScriptDataType.OBJECT,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER],
    action: function(this: NWScriptInstance, args: [number, ModuleObject, number]){
      const target: any = args[1] ? args[1] : this.caller;
      if(!target) return undefined;
      const nearest = GameState.ModuleObjectManager.GetNearestObject(args[0], target, args[2]);
      return (nearest as any)?.trapFlag ? nearest : undefined;
    }
  };
