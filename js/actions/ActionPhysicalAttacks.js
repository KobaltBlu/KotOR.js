class ActionPhysicalAttacks extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionPhysicalAttacks;
  }

  update(delta){
    this.owner.resetExcitedDuration();
    if(!this.combatAction.isCutsceneAttack){
      if(this.target.isDead()){
        return Action.STATUS.FAILED;
      }else{
        distance = Utility.Distance2D(this.owner.position, this.target.position);
        if(distance > ( this.owner.getEquippedWeaponType() == 4 ? 15.0 : 2.0 ) ){
          try{
            this.actionPathfinder(( this.owner.getEquippedWeaponType() == 4 ? 15.0 : 2.0 ), undefined, delta);
          }catch(e){}
          return Action.STATUS.WAITING;
        }else{
          this.owner.animState = ModuleCreature.AnimState.IDLE;
          this.owner.force = 0;
          return Action.STATUS.COMPLETE;
        }
      }
    }
  }

}

module.exports = ActionPhysicalAttacks;