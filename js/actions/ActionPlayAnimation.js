class ActionPlayAnimation extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.PlayAnimation;

    //PARAMS
    // 0 - int: animation constant value like (10000, 10001, etc...)
    // 1 - float: speed
    // 2 - float: duration
    // 3 - int: unknown
    
  }

  update(delta){
    if(this.overlayAnimation)
      return Action.STATUS.FAILED;

    if(this.animation >= 10000){
      this.owner.animState = this.animation;
    }else{
      console.error('ActionPlayAnimation Invalid animation', this.owner.getName(), this.animation, this);
      return Action.STATUS.FAILED;
    }

    if(this.time == -1){
      return Action.STATUS.COMPLETE;
    }else if(this.time > 0){
      this.time -= delta;
      if(this.time <= 0){
        this.time = 0;
        return Action.STATUS.COMPLETE;
      }
    }else{
      return Action.STATUS.COMPLETE;
    }

    return Action.STATUS.FAILED;
  }

}

module.exports = ActionPlayAnimation;