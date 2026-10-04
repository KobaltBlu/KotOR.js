import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { GameState } from "@engine/runtime/GameState";
import { Action } from "@engine/actions/Action";

/**
 * ActionResumeDialog class.
 *
 * resume-dialog action — clears pause; deferred
 * SendDialogEntry / SendDialogReplies flush happens in UpdateDialog
 * (CutsceneManager.update), not here.
 *
 * @file ActionResumeDialog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionResumeDialog extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionResumeDialog;
    // ClearAllActions (SetState path) keeps conversation
    // control actions — losing Resume while Pause is set hangs the dialog
    // (tar08_calo082 / k_ptar_calofade: Pause → Wait → Resume, then Horrified).
    this.clearable = false;

    //PARAMS
    // none
  }

  update(delta: number = 0): ActionStatus {
    GameState.CutsceneManager.resumeConversation();
    return ActionStatus.COMPLETE;
  }

}
