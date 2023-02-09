import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { GameState } from "../GameState";
import { MenuManager } from "../gui";
import { Action } from "./Action";

export class ActionPauseDialog extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionPauseDialog;
  }

  update(delta: number = 0): ActionStatus {
    MenuManager.InGameDialog.PauseConversation();
    return ActionStatus.COMPLETE;
  }

}
