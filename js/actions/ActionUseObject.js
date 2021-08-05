class ActionUseObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionUseObject;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta){
    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 1.5){
      try{
        this.actionPathfinder(1.5, undefined, delta);
      }catch(e){}
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