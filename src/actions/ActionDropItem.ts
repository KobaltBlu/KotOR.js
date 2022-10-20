import { Action } from ".";
import { ActionType } from "../enums/actions/ActionType";

export class ActionDropItem extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionDropItem;
  }

}
