class ActionPhysicalAttacks extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionPhysicalAttacks;
  }

  update(delta){
    
    this.target = this.getParameter(1);

    if(!(this.target instanceof ModuleObject)){
      return Action.STATUS.FAILED;
    }

    if(!(this.owner instanceof ModuleCreature)){
      return Action.STATUS.FAILED;
    }

    this.owner.resetExcitedDuration();
    let range = ( this.owner.getEquippedWeaponType() == 4 ? 15.0 : 2.0 );

    //if(!this.combatAction.isCutsceneAttack){
      if(this.target.isDead()){
        return Action.STATUS.FAILED;
      }else{
        let distance = Utility.Distance2D(this.owner.position, this.target.position);
        if( distance > range ){

          this.owner.openSpot = undefined;
          let target_position = this.target.position.clone();

          if(this.target instanceof ModuleCreature){
            if(this.owner.getEquippedWeaponType() != 4){ //RANGED
              this.owner.openSpot = this.target.getClosesetOpenSpot(this.owner);
              if(typeof this.owner.openSpot != 'undefined'){
                target_position.copy(this.owner.openSpot.targetVector);
              }
            }
          }

          let actionMoveToTarget = new ActionMoveToPoint();
          actionMoveToTarget.setParameter(0, Action.Parameter.TYPE.FLOAT, target_position.x);
          actionMoveToTarget.setParameter(1, Action.Parameter.TYPE.FLOAT, target_position.y);
          actionMoveToTarget.setParameter(2, Action.Parameter.TYPE.FLOAT, target_position.z);
          actionMoveToTarget.setParameter(3, Action.Parameter.TYPE.DWORD, Game.module.area.id);
          actionMoveToTarget.setParameter(4, Action.Parameter.TYPE.DWORD, this.target.id);
          actionMoveToTarget.setParameter(5, Action.Parameter.TYPE.INT, 1);
          actionMoveToTarget.setParameter(6, Action.Parameter.TYPE.FLOAT, range );
          actionMoveToTarget.setParameter(7, Action.Parameter.TYPE.INT, 0);
          actionMoveToTarget.setParameter(8, Action.Parameter.TYPE.FLOAT, 30.0);
          this.owner.actionQueue.addFront(actionMoveToTarget);

          return Action.STATUS.IN_PROGRESS;
        }else{
          this.owner.animState = ModuleCreature.AnimState.IDLE;
          this.owner.force = 0;
          this.owner.openSpot = undefined;
          return Action.STATUS.COMPLETE;
        }
      }
    //}
  }

}

module.exports = ActionPhysicalAttacks;