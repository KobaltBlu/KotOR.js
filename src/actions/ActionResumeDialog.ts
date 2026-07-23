import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { GameState } from "@/GameState";
import { Action } from "@/actions/Action";

/**
 * ActionResumeDialog class.
 *
 * Retail AIActionResumeDialog @ 0057b320 — clears pause and flushes any
 * deferred SendDialogEntry pending while paused.
 *
 * @file ActionResumeDialog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionResumeDialog extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionResumeDialog;
  }

  update(delta: number = 0): ActionStatus {
    GameState.CutsceneManager.resumeConversation();
    return ActionStatus.COMPLETE;
  }

}
