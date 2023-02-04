import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObject } from "../module";
import { Action } from "./Action";

export class ActionSetCommandable extends Action {
  object: ModuleObject;

  constructor( groupId = 0 ){
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
