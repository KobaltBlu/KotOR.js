import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";

export class ActionItemCastSpell extends Action {

  spell: any = {}

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionItemCastSpell;
  }

}
