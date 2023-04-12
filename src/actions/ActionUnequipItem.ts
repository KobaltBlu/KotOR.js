import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action, ActionQueue } from ".";

export class ActionUnequipItem extends Action {

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionUnequipItem;

    //PARAMS
    // 0 - Item (DWORD)
    // 1 - (?) (DWORD)
    // 2 - bInstant (INT)
  }

  update(delta: number = 0){
    return ActionStatus.COMPLETE;
  }

}
