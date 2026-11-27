import EngineLocation from "@/engine/EngineLocation";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
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

/** Upstream 002dfe03, action #23: upstream-body-changed. */
export const ActionMoveAwayFromObject: INWScriptDefAction = {
    comment: "23: Cause the action subject to move to a certain distance away from oFleeFrom.\n- oFleeFrom: This is the object we wish the action subject to move away from.\nIf oFleeFrom is not in the same area as the action subject, nothing will\nhappen.\n- bRun: If this is TRUE, the action subject will run rather than walk\n- fMoveAwayRange: This is the distance we wish the action subject to put\nbetween themselves and oFleeFrom\n* No return value, but if an error occurs the log file will contain\n'ActionMoveAwayFromObject failed.'\n",
    name: "ActionMoveAwayFromObject",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [ModuleObject, number, number]){
      if(!BitWise.InstanceOfObject(this.caller, ModuleObjectType.ModuleCreature)){
        return;
      }
      if(!BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)){
        return;
      }

      const caller = this.caller as ModuleCreature;
      const fleeFrom = args[0];
      const bRun = !!args[1];
      const range = args[2] || 10.0;

      // Calculate a point that is range meters from fleeFrom, along the
      // direction from fleeFrom through the caller
      const dx = caller.position.x - fleeFrom.position.x;
      const dy = caller.position.y - fleeFrom.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;

      // Already far enough away
      if(dist >= range){
        return;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const targetX = fleeFrom.position.x + nx * range;
      const targetY = fleeFrom.position.y + ny * range;
      const targetZ = caller.position.z;

      const action = new GameState.ActionFactory.ActionMoveToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, targetX);
      action.setParameter(1, ActionParameterType.FLOAT, targetY);
      action.setParameter(2, ActionParameterType.FLOAT, targetZ);
      action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      action.setParameter(4, ActionParameterType.DWORD, 0);
      action.setParameter(5, ActionParameterType.INT, bRun ? 1 : 0);
      action.setParameter(6, ActionParameterType.FLOAT, 1.0);
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.FLOAT, 30.0);
      caller.actionQueue.add(action);
    }
  };

/** Upstream 002dfe03, action #360: upstream-body-changed. */
export const ActionMoveAwayFromLocation: INWScriptDefAction = {
    comment: "360: Causes the action subject to move away from lMoveAwayFrom.\n",
    name: "ActionMoveAwayFromLocation",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.LOCATION, NWScriptDataType.INTEGER, NWScriptDataType.FLOAT],
    action: function(this: NWScriptInstance, args: [EngineLocation, number, number]){
      const caller: any = this.caller;
      if(!caller || !args[0]) return;
      const range = args[2] || 40.0;
      const dx = caller.position.x - args[0].position.x;
      const dy = caller.position.y - args[0].position.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const action = new GameState.ActionFactory.ActionMoveToPoint();
      action.setParameter(0, ActionParameterType.FLOAT, args[0].position.x + (dx/dist) * range);
      action.setParameter(1, ActionParameterType.FLOAT, args[0].position.y + (dy/dist) * range);
      action.setParameter(2, ActionParameterType.FLOAT, caller.position.z);
      action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      action.setParameter(4, ActionParameterType.DWORD, 0);
      action.setParameter(5, ActionParameterType.INT, args[1] ? 1 : 0);
      action.setParameter(6, ActionParameterType.FLOAT, 1.0);
      action.setParameter(7, ActionParameterType.INT, 0);
      action.setParameter(8, ActionParameterType.FLOAT, 30.0);
      caller.actionQueue.add(action);
      return;
    }
  };

/** Upstream 002dfe03, action #553: upstream-body-changed. */
export const FaceObjectAwayFromObject: INWScriptDefAction = {
    comment: "553: FaceObjectAwayFromObject\nThis will cause the object oFacer to face away from oObjectToFaceAwayFrom.\nThe objects must be in the same area for this to work.\n",
    name: "FaceObjectAwayFromObject",
    type: NWScriptDataType.VOID,
    args: [NWScriptDataType.OBJECT, NWScriptDataType.OBJECT],
    action: function(this: NWScriptInstance, args: [ModuleObject, ModuleObject]){
      if(!BitWise.InstanceOfObject(args[0], ModuleObjectType.ModuleObject)) return;
      if(!BitWise.InstanceOfObject(args[1], ModuleObjectType.ModuleObject)) return;
      const facing = Math.atan2(
        args[0].position.y - args[1].position.y,
        args[0].position.x - args[1].position.x
      );
      args[0].setFacing(facing, false);
      return;
    }
  };
