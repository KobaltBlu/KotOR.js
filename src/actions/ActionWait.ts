import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";

/**
 * ActionWait class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionWait.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionWait extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(groupId);
    this.type = ActionType.ActionWait;

    //PARAMS
    // 0 - float: delta time left to wait
    
  }

  update(delta: number = 0): ActionStatus {
    if( this.setParameter(0, 1, this.getParameter(0) - delta) <= 0 ){
      return ActionStatus.COMPLETE;
    }
    return ActionStatus.IN_PROGRESS;
  }

}
