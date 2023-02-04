import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreature, ModuleObject } from "../module";
import { Action } from "./Action";

export class ActionJumpToObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionJumpToObject;

    //PARAMS
    // 0 - dword: target object id
    // 1 - int: walkStraightLineToPoint 0 | 1
    
  }

  update(delta: number = 0): ActionStatus {

    this.target = this.getParameter(0);

    if(!(this.target instanceof ModuleObject))
      return ActionStatus.FAILED;

    if(this.owner instanceof ModuleCreature){
      this.owner.setPosition(this.target.position);
      this.owner.setFacing(this.target.rotation.z, false);
      this.owner.collisionData.groundFace = undefined;
      this.owner.collisionData.lastGroundFace = undefined;
      //this.getCurrentRoom();
      this.owner.collisionData.findWalkableFace();
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
