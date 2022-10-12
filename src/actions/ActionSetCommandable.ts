import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";

export class ActionSetCommandable extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionSetCommandable;

    //PARAMS
    // 0 - int: commandable value
    
  }

  update(delta: number = 0){
    if(this.object instanceof ModuleObject){
      this.object.setCommandable( this.getParameter(0) ? 1 : 0 );
      return ActionStatus.COMPLETE;
    }
    return ActionStatus.FAILED;
  }

}
