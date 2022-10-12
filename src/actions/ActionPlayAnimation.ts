import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";

export class ActionPlayAnimation extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionPlayAnimation;

    //PARAMS
    // 0 - int: animation constant value like (10000, 10001, etc...)
    // 1 - float: speed
    // 2 - float: duration
    // 3 - int: unknown
    
  }

  update(delta: number = 0){
    if(this.overlayAnimation)
      return ActionStatus.FAILED;

    this.animation = this.getParameter(0);
    this.speed = this.getParameter(1);
    this.time = this.getParameter(2);

    if(this.animation >= 10000){
      this.owner.animState = this.animation;
    }else{
      console.error('ActionPlayAnimation Invalid animation', this.owner.getName(), this.animation, this);
      return ActionStatus.FAILED;
    }

    if(this.time == -1){
      return ActionStatus.COMPLETE;
    }else if(this.time > 0){
      this.time -= delta;
      if(this.time <= 0){
        this.time = 0;
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.IN_PROGRESS;
    }else{
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
