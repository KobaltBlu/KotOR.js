import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { GameState } from "@/GameState";
import { Action } from "@/actions/Action";

/**
 * ActionPauseDialog class.
 *
 * Retail AIActionPauseDialog @ 0057b290 — sets CSWSObject field15_0x50 so
 * SendDialogEntry defers the next entry while the current node keeps ticking.
 * NWScript ActionPauseConversation applies pause immediately (ExecuteCommand
 * @ 0052d330); this action remains for any queued AI path.
 *
 * @file ActionPauseDialog.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionPauseDialog extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionPauseDialog;
  }

  update(delta: number = 0): ActionStatus {
    GameState.CutsceneManager.pauseConversation();
    return ActionStatus.COMPLETE;
  }

}
