class ActionCloseDoor extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionCloseDoor;

    //PARAMS
    // 0 - dword: door object id
    // 1 - int : always zero?

  }

  update(delta){
    if(!(this.target instanceof ModuleDoor))
      return Action.STATUS.FAILED;

    if(this.owner instanceof ModuleCreature){
      let distance = Utility.Distance2D(this.owner.position, this.target.position);
            
      if(distance > 2 && !this.target.box.intersectsBox(this.owner.box)){
        try{
          this.actionPathfinder(2, undefined, delta);
        }catch(e){}
        return Action.STATUS.IN_PROGRESS;
      }else{
        this.owner.animState = ModuleCreature.AnimState.IDLE;
        this.owner.force = 0;
        //console.log(action.object);

        this.owner.setFacingObject( this.target );

        /*if(this.target == Game.player){
          return Action.STATUS.COMPLETE;
        }else{
          //this.target.use(Game.player);
          this.target.closeDoor(this.owner);
          return Action.STATUS.COMPLETE;
        }*/
        
        this.target.closeDoor(this.owner);
        return Action.STATUS.COMPLETE;
        
      }
    }else{
      this.target.closeDoor(this.owner);
      return Action.STATUS.COMPLETE;
    }

    return Action.STATUS.FAILED;
  }

}

module.exports = ActionCloseDoor;