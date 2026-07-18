import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";

/**
 * ActionChangeFacingPoint class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionChangeFacingPoint.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionChangeFacingPoint extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionChangeFacingPoint;

    //PARAMS
    // 0 - float: x
    // 1 - float: y
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const x = this.getParameter<number>(0);
    const y = this.getParameter<number>(1);
    if(typeof x !== 'number' || typeof y !== 'number'){
      return ActionStatus.FAILED;
    }

    const facing = Math.atan2(
      y - this.owner.position.y,
      x - this.owner.position.x
    );
    this.owner.setFacing(facing);
    return ActionStatus.COMPLETE;
  }

}
