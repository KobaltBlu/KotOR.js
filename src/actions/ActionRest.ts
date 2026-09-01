import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";

/**
 * ActionRest class.
 * Retail rest action — always returns COMPLETE.
 *
 * @file ActionRest.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionRest extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionRest;

    //PARAMS
  }

  update(delta: number = 0): ActionStatus {
    return ActionStatus.COMPLETE;
  }

}
