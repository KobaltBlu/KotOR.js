import { ModuleObjectType } from "../enums";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
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
    super(groupId);
    this.type = ActionType.ActionForceFollowObject;

    //PARAMS
    // 0 - dword: door object id
    // 1 - float: distance

  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter(0);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleDoor))
      return ActionStatus.FAILED;

    return ActionStatus.FAILED;
  }

}
