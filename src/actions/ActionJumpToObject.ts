import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleObject } from "@/module/ModuleObject";
import { Action } from "@/actions/Action";
import { GameState } from "@/GameState";
import {
  classifyJumpDestination,
} from "@/engine/jump-to-location";
import { applyAddToArea, applyLocalJump } from "@/actions/ActionJumpToPoint";

import { isCreature } from "@/module/guards/isCreature";

/**
 * ActionJumpToObject — jump-to-object action.
 * Uses target object's area; AddToArea when crossing loaded areas.
 *
 * @file ActionJumpToObject.ts
 */
export class ActionJumpToObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionJumpToObject;

    //PARAMS
    // 0 - dword: oTarget (target object id to jump to)
    // 1 - int: bWalkStraight (safe location check flag, default 1)
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);

    if(!this.target)
      return ActionStatus.FAILED;

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    const destArea = this.target.area || GameState.module?.area;
    const classified = classifyJumpDestination(
      this.owner.area,
      destArea,
      GameState.module?.filename || ''
    );

    if(classified.kind === 'loadModule' && classified.moduleName){
      const pc = GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
      if(this.owner === pc || this.owner.controlled){
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
      applyAddToArea(this.owner, classified.area);
    }

    applyLocalJump(
      this.owner,
      this.target.position.x,
      this.target.position.y,
      this.target.position.z,
      this.target.rotation?.z ?? 0
    );

    const leader = GameState.PartyManager?.party?.[0];
    if(this.owner === leader){
      GameState.PartyManager.resetFollowPath(this.owner);
    }

    return ActionStatus.COMPLETE;
  }
}
