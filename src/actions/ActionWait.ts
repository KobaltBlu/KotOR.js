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

  /**
   * Creates a new ActionWait instance.
   * @param {number} [actionId=-1] - The unique identifier for this action
   * @param {number} [groupId=-1] - The group identifier this action belongs to
   */
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionWait;

    /**
     * PARAMS
     * @param {number} 0 - float: delta time left to wait
     */
  }

  /**
   * Updates the wait action, reducing the remaining wait time by the delta.
   * @param {number} [delta=0] - The time elapsed since the last update
   * @returns {ActionStatus} COMPLETE when wait time is finished, IN_PROGRESS otherwise
   */
  update(delta: number = 0): ActionStatus {
    if( this.setParameter<number>(0, 1, this.getParameter<number>(0) - delta) <= 0 ){
      return ActionStatus.COMPLETE;
    }
    return ActionStatus.IN_PROGRESS;
  }
}