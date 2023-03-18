import { Action } from ".";
import { ActionType } from "../enums/actions/ActionType";

export class ActionDropItem extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionDropItem;
  }

}
