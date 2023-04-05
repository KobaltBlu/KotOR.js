import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./";

export class ActionCombat extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionCombat;

    //PARAMS
    // 0 - int: (?) 1 or 0

  }
  
  update(delta: number = 0): ActionStatus {
    return ActionStatus.COMPLETE;
  }

}