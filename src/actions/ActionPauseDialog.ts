import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { GameState } from "../GameState";
import { MenuManager } from "../gui";
import { Action, ActionQueue } from ".";

export class ActionPauseDialog extends Action {

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionPauseDialog;
  }

  update(delta: number = 0): ActionStatus {
    GameState.ConversationPaused = true;
    return ActionStatus.COMPLETE;
  }

}
