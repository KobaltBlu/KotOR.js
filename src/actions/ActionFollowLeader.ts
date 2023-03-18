import { ActionMoveToPoint } from ".";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { EngineMode } from "../enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { PartyManager } from "../managers/PartyManager";
import { ModuleCreature } from "../module";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";

export class ActionFollowLeader extends Action {
  path_realtime: boolean;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionFollowLeader;

    //PARAMS
    // No Params

  }

  update(delta: number = 0): ActionStatus {
    if(this.owner instanceof ModuleCreature){
      if(GameState.Mode == EngineMode.DIALOG){
        this.owner.animState = ModuleCreatureAnimState.IDLE;
        return ActionStatus.FAILED;
      }

      this.target = PartyManager.party[0];

      const follow_destination = PartyManager.GetFollowPosition(this.owner);
      const distance = Utility.Distance2D(this.owner.position, this.target.position.clone());
      if(distance > 5){
        this.path_realtime = true;
        this.owner.openSpot = undefined;
        let actionMoveToTarget = new ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, follow_destination.x);
        actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, follow_destination.y);
        actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, follow_destination.z);
        actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 4.5 );
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);

        return ActionStatus.IN_PROGRESS;
      }else{
        this.owner.animState = ModuleCreatureAnimState.IDLE;
        this.owner.force = 0;
        this.owner.speed = 0;
        return ActionStatus.COMPLETE;
      }
    }
    return ActionStatus.FAILED;
  }

}
