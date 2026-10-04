import { GameState } from "@/GameState";
import { ActionParameterType, ModuleObjectType } from "@/enums";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import { enqueueMoveToPoint } from "@/actions/helpers/enqueueMoveToPoint";

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

    enqueueMoveToPoint(this.owner, {
      x: this.target.position.x,
      y: this.target.position.y,
      z: this.target.position.z,
      area: this.target.area,
      target: 0xFFFFFFFF,
      run,
      range: fDistance,
      timeout: 30.0,
      groupId: this.groupId,
    });

    return ActionStatus.FAILED;
  }

}
