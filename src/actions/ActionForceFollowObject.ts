import { GameState } from "../GameState";
import { ActionParameterType, ModuleObjectType } from "../enums";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import type { ModuleObject } from "../module/ModuleObject";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";

/**
 * ActionForceFollowObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionForceFollowObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionForceFollowObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionForceFollowObject;

    //PARAMS
    // 0 - dword: object id
    // 1 - float: distance

  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(0);
    const fDistance = this.getParameter<number>(1) || 0.00;

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature))
      return ActionStatus.FAILED;

    const run = true;

    const action = new GameState.ActionFactory.ActionMoveToPoint();
    action.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
    action.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
    action.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
    action.setParameter(3, ActionParameterType.DWORD, this.target.area);
    action.setParameter(4, ActionParameterType.DWORD, 0xFFFFFFFF);
    action.setParameter(5, ActionParameterType.INT, run ? 1 : 0);
    action.setParameter(6, ActionParameterType.FLOAT, fDistance);
    action.setParameter(7, ActionParameterType.INT, 0);
    action.setParameter(8, ActionParameterType.FLOAT, 30.0);
    this.owner.actionQueue.addFront(action);

    return ActionStatus.FAILED;
  }

}
