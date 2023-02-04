import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { ModuleObject } from "../module";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";
import { ActionMoveToPoint } from "./ActionMoveToPoint";

export class ActionUseObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionUseObject;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter(0);

    if(!(this.target instanceof ModuleObject)){
      return ActionStatus.FAILED;
    }

    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 1.5){
        
      this.owner.openSpot = undefined;
      let actionMoveToTarget = new ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 1.5 );
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);

      return ActionStatus.IN_PROGRESS;
    }else{
      this.owner.animState = ModuleCreatureAnimState.IDLE;
      this.owner.force = 0;
      this.owner.speed = 0;
      //console.log(this.target);

      this.owner.setFacingObject( this.target );

      if(this.target != GameState.player){
        this.target.use(this.owner);
      }

      return ActionStatus.COMPLETE;
    }
    return ActionStatus.FAILED;
  }

}
