import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";

export class ActionItemCastSpell extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionItemCastSpell;
  }

}
