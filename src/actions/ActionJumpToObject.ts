import { ModuleObjectType } from "@/enums";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import { GameState } from "@/GameState";
import {
  classifyJumpDestination,
} from "@/engine/jump-to-location";
import { applyAddToArea, applyLocalJump } from "@/actions/ActionJumpToPoint";

/**
 * ActionJumpToObject — retail jump-to-object action.
 * Uses target object's area; AddToArea when crossing loaded areas.
 *
 * @file ActionJumpToObject.ts
 */
export class ActionJumpToObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionJumpToObject;

    //PARAMS
    // 0 - dword: target object id
    // 1 - int: walkStraightLineToPoint 0 | 1
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);

    if(!this.target)
      return ActionStatus.FAILED;

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const creature = this.owner as ModuleCreature;
    const destArea = this.target.area || GameState.module?.area;
    const classified = classifyJumpDestination(
      creature.area,
      destArea,
      GameState.module?.filename || ''
    );

    if(classified.kind === 'loadModule' && classified.moduleName){
      const pc = GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
      if(creature === pc || creature.controlled){
        const rot = this.target.getRotationFromBearing?.() || this.target.rotation;
        GameState.LoadModuleWithJumpSpawn(classified.moduleName.toLowerCase(), {
          x: this.target.position.x,
          y: this.target.position.y,
          z: this.target.position.z,
          ox: rot?.x ?? 0,
          oy: rot?.y ?? 1,
        });
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.FAILED;
    }

    if(classified.kind === 'reattach' && classified.area){
      applyAddToArea(creature, classified.area);
    }

    applyLocalJump(
      creature,
      this.target.position.x,
      this.target.position.y,
      this.target.position.z,
      this.target.rotation?.z ?? 0
    );

    const leader = GameState.PartyManager?.party?.[0];
    if(creature === leader){
      GameState.PartyManager.resetFollowPath(creature);
    }

    return ActionStatus.COMPLETE;
  }
}
