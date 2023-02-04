import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import { ModuleCreature, ModuleDoor, ModulePlaceable } from "../module";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";
import { ActionMoveToPoint } from "./ActionMoveToPoint";

export class ActionLockObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionLockObject;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta: number = 0): ActionStatus {
    if(!(this.target instanceof ModuleDoor) && !(this.target instanceof ModulePlaceable))
      return ActionStatus.FAILED;

    this.target = this.getParameter(0);

    if(this.owner instanceof ModuleCreature){
      let distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 2 && !this.target.box.intersectsBox(this.owner.box)){
        
        this.owner.openSpot = undefined;
        let actionMoveToTarget = new ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, this.target.position.x);
        actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, this.target.position.y);
        actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, this.target.position.z);
        actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, 2 );
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);
  
        return ActionStatus.IN_PROGRESS;
      }else{
        this.owner.animState = ModuleCreatureAnimState.IDLE;
        this.owner.force = 0;
        //console.log(action.object);

        this.owner.setFacingObject( this.target );

        if(this.target instanceof ModuleDoor){
          this.target.closeDoor(this.owner);
        }else if(this.target instanceof ModulePlaceable){
          this.target.close(this.owner);
        }

        this.target.setLocked(true);
        return ActionStatus.COMPLETE;
        
      }
    }else{
      if(this.target instanceof ModuleDoor){
        this.target.closeDoor(this.owner);
      }else if(this.target instanceof ModulePlaceable){
        this.target.close(this.owner);
      }

      this.target.setLocked(true);
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
