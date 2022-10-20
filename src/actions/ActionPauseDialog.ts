import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { GameState } from "../GameState";
import { Action } from "./Action";

export class ActionPauseDialog extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionPauseDialog;
  }

  update(){
    GameState.InGameDialog.PauseConversation();
    return ActionStatus.COMPLETE;
  }

}
