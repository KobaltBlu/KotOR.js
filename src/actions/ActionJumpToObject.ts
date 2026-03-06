import { ModuleObjectType } from "../enums";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import type { ModuleObject } from "../module/ModuleObject";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";
import { TURN_SPEED_FAST } from "../engine/TurnSpeeds";

/**
 * ActionJumpToObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionJumpToObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionJumpToObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionJumpToObject;

    //PARAMS
    // 0 - dword: target object id
    // 1 - int: walkStraightLineToPoint 0 | 1
    
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter<ModuleObject>(0);

    if(!this.target)
      return ActionStatus.FAILED;

    if(BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      this.owner.setPosition(this.target.position);
      this.owner.setFacing(this.target.rotation.z, false, TURN_SPEED_FAST);
      this.owner.collisionManager.groundFace = undefined;
      this.owner.collisionManager.lastGroundFace = undefined;
      //this.getCurrentRoom();
      this.owner.collisionManager.findWalkableFace();
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
