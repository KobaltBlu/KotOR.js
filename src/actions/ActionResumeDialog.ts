import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { GameState } from "../GameState";
import { Action } from "./Action";

export class ActionResumeDialog extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionResumeDialog;
  }

  update(){
    GameState.InGameDialog.ResumeConversation();
    console.log('ActionResumeDialog', this.owner.getName(), this.owner.getTag());
    return ActionStatus.COMPLETE;
  }

}
