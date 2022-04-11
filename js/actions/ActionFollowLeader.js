class ActionFollowLeader extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionFollowLeader;

    //PARAMS
    // No Params

  }

  update(delta){
    if(this.owner instanceof ModuleCreature){
      if(Game.inDialog){
        this.owner.animState = ModuleCreature.AnimState.IDLE;
        return Action.STATUS.FAILED;
      }

      this.target = PartyManager.party[0];

      const follow_destination = PartyManager.GetFollowPosition(this.owner);
      const distance = Utility.Distance2D(this.owner.position, this.target.position.clone());
      if(distance > 5){
        this.path_realtime = true;
        this.owner.openSpot = undefined;
        let actionMoveToTarget = new ActionMoveToPoint();
        actionMoveToTarget.setParameter(0, Action.Parameter.TYPE.FLOAT, follow_destination.x);
        actionMoveToTarget.setParameter(1, Action.Parameter.TYPE.FLOAT, follow_destination.y);
        actionMoveToTarget.setParameter(2, Action.Parameter.TYPE.FLOAT, follow_destination.z);
        actionMoveToTarget.setParameter(3, Action.Parameter.TYPE.DWORD, Game.module.area.id);
        actionMoveToTarget.setParameter(4, Action.Parameter.TYPE.DWORD, this.target.id);
        actionMoveToTarget.setParameter(5, Action.Parameter.TYPE.INT, 1);
        actionMoveToTarget.setParameter(6, Action.Parameter.TYPE.FLOAT, 4.5 );
        actionMoveToTarget.setParameter(7, Action.Parameter.TYPE.INT, 0);
        actionMoveToTarget.setParameter(8, Action.Parameter.TYPE.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);

        return Action.STATUS.IN_PROGRESS;
      }else{
        this.owner.animState = ModuleCreature.AnimState.IDLE;
        this.owner.force = 0;
        this.owner.speed = 0;
        return Action.STATUS.COMPLETE;
      }
    }
    return Action.STATUS.FAILED;
  }

}

module.exports = ActionFollowLeader;