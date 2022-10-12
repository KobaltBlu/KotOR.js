import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { GameState } from "../GameState";
import { Action } from "./Action";

class OpenDoor extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionOpenDoor;

    //PARAMS
    // 0 - dword: door object id
    // 1 - int : always zero?

  }

  update(delta: number = 0){

    this.target = this.getParameter(0);

    if(!(this.target instanceof ModuleDoor))
      return ActionStatus.FAILED;

    if(this.target.isOpen())
      return ActionStatus.FAILED;

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
        this.owner.speed = 0;
        //console.log(action.object);

        this.owner.setFacingObject( this.target );

        if(this.target == GameState.player){
          return ActionStatus.COMPLETE;
        }else{
          this.target.use(GameState.player);
          return ActionStatus.COMPLETE;
        }
        
      }
    }else{
      this.target.use(this.owner);
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
