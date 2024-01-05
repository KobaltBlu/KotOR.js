import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { GameState } from "../GameState";
import { Action } from "./Action";

/**
 * ActionResumeDialog class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionResumeDialog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionResumeDialog extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionResumeDialog;
  }

  update(delta: number = 0): ActionStatus {
    GameState.ConversationPaused = false;
    console.log('ActionResumeDialog', this.owner.getName(), this.owner.getTag());
    return ActionStatus.COMPLETE;
  }

}
