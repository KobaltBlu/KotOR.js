class ActionFollowLeader extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionFollowLeader;

    //PARAMS
    // No Params

  }

  update(delta){
    //let targetPos = PartyManager.GetFollowPosition(this);
    if(this.owner instanceof ModuleCreature){
      if(Game.inDialog){
        this.owner.animState = ModuleCreature.AnimState.IDLE;
        return Action.STATUS.FAILED;
      }

      let distance = Utility.Distance2D(this.owner.position, PartyManager.party[0].position.clone());
      if(distance > 10){
        action.path_realtime = true;
        try{
          this.actionPathfinder(1.5, true, delta);
        }catch(e){}
        return Action.STATUS.IN_PROGRESS;
      }else{
        this.owner.animState = ModuleCreature.AnimState.IDLE;
        this.owner.force = 0;
        return Action.STATUS.COMPLETE;
      }
    }
    return Action.STATUS.FAILED;
  }

}

module.exports = ActionFollowLeader;