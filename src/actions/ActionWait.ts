import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action, ActionQueue } from ".";

export class ActionWait extends Action {

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionWait;

    //PARAMS
    // 0 - float: delta time left to wait
    
  }

  update(delta: number = 0): ActionStatus {
    if( this.setParameter(0, 1, this.getParameter(0) - delta) <= 0 ){
      return ActionStatus.COMPLETE;
    }
    return ActionStatus.IN_PROGRESS;
  }

}
