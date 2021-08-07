class ActionUseObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionUseObject;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta){

    this.target = this.getParameter(0);

    if(!(this.target instanceof ModuleObject)){
      return Action.STATUS.FAILED;
    }

    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 1.5){
        
      this.owner.openSpot = undefined;
      let actionMoveToTarget = new ActionMoveToPoint();
      actionMoveToTarget.setParameter(0, Action.Parameter.TYPE.FLOAT, this.target.position.x);
      actionMoveToTarget.setParameter(1, Action.Parameter.TYPE.FLOAT, this.target.position.y);
      actionMoveToTarget.setParameter(2, Action.Parameter.TYPE.FLOAT, this.target.position.z);
      actionMoveToTarget.setParameter(3, Action.Parameter.TYPE.DWORD, Game.module.area.id);
      actionMoveToTarget.setParameter(4, Action.Parameter.TYPE.DWORD, this.target.id);
      actionMoveToTarget.setParameter(5, Action.Parameter.TYPE.INT, 1);
      actionMoveToTarget.setParameter(6, Action.Parameter.TYPE.FLOAT, 1.5 );
      actionMoveToTarget.setParameter(7, Action.Parameter.TYPE.INT, 0);
      actionMoveToTarget.setParameter(8, Action.Parameter.TYPE.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);

      return Action.STATUS.IN_PROGRESS;
    }else{
      this.owner.animState = ModuleCreature.AnimState.IDLE;
      this.owner.force = 0;
      //console.log(this.target);

      this.owner.setFacingObject( this.target );

      if(this.target != Game.player){
        this.target.use(this);
      }

      return Action.STATUS.COMPLETE;
    }
    return Action.STATUS.FAILED;
  }

}

module.exports = ActionUseObject;