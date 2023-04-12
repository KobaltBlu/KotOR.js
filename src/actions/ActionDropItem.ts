import { Action, ActionQueue } from ".";
import { ActionType } from "../enums/actions/ActionType";

export class ActionDropItem extends Action {

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionDropItem;
  }

}
