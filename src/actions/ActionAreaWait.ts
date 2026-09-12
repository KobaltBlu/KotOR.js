import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";

/**
 * ActionAreaWait class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionAreaWait.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionAreaWait extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionAreaWait;

    //PARAMS
    // 0 - float: fRemainingTime (time left to wait in area)
  }

  update(delta: number = 0): ActionStatus {
    if( this.setParameter<number>(0, ActionParameterType.FLOAT, (this.getParameter<number>(0) || 0) - delta) <= 0 ){
      return ActionStatus.COMPLETE;
    }
    return ActionStatus.IN_PROGRESS;
  }

}
