import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action, ActionQueue } from ".";

export class ActionItemCastSpell extends Action {

  spell: any = {}

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionItemCastSpell;
  }

}
