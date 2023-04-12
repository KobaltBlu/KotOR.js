import { Action, ActionQueue } from ".";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObject } from "../module";

export class ActionSetCommandable extends Action {
  object: ModuleObject;

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionSetCommandable;

    //PARAMS
    // 0 - int: commandable value
    
  }

  update(delta: number = 0): ActionStatus {
    if(this.owner instanceof ModuleObject){
      this.owner.setCommandable( this.getParameter(0) ? true : false );
      return ActionStatus.COMPLETE;
    }
    return ActionStatus.FAILED;
  }

}
