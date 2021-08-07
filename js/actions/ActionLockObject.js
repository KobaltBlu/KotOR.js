class ActionLockObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionLockObject;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta){
    if(!(this.target instanceof ModuleDoor) && !(this.target instanceof ModulePlaceable))
      return Action.STATUS.FAILED;

    this.target = this.getParameter(0);

    if(this.owner instanceof ModuleCreature){
      let distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 2 && !this.target.box.intersectsBox(this.owner.box)){
        
        this.owner.openSpot = undefined;
        let actionMoveToTarget = new ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, Action.Parameter.TYPE.FLOAT, this.target.position.x);
        actionMoveToTarget.setParameter(1, Action.Parameter.TYPE.FLOAT, this.target.position.y);
        actionMoveToTarget.setParameter(2, Action.Parameter.TYPE.FLOAT, this.target.position.z);
        actionMoveToTarget.setParameter(3, Action.Parameter.TYPE.DWORD, Game.module.area.id);
        actionMoveToTarget.setParameter(4, Action.Parameter.TYPE.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, Action.Parameter.TYPE.INT, 1);
        actionMoveToTarget.setParameter(6, Action.Parameter.TYPE.FLOAT, 2 );
        actionMoveToTarget.setParameter(7, Action.Parameter.TYPE.INT, 0);
        actionMoveToTarget.setParameter(8, Action.Parameter.TYPE.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);
  
        return Action.STATUS.IN_PROGRESS;
      }else{
        this.owner.animState = ModuleCreature.AnimState.IDLE;
        this.owner.force = 0;
        //console.log(action.object);

        this.owner.setFacingObject( this.target );

        if(this.target instanceof ModuleDoor){
          this.target.closeDoor(this.owner);
        }else if(this.target instanceof ModulePlaceable){
          this.target.close();
        }

        this.target.setLocked(true);
        return Action.STATUS.COMPLETE;
        
      }
    }else{
      if(this.target instanceof ModuleDoor){
        this.target.closeDoor(this.owner);
      }else if(this.target instanceof ModulePlaceable){
        this.target.close();
      }

      this.target.setLocked(true);
      return Action.STATUS.COMPLETE;
    }

    return Action.STATUS.FAILED;
  }

}

module.exports = ActionLockObject;