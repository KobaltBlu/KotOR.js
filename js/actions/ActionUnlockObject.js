class ActionUnlockObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionUnlockObject;
    this.timer = 1.5;

    //PARAMS
    // 0 - dword: object id
    
  }

  update(delta){
    if(!(this.owner instanceof ModuleCreature))
      return Action.STATUS.FAILED;

    if(!(this.target instanceof ModuleDoor) || !(this.target instanceof ModulePlaceable))
      return Action.STATUS.FAILED;

    if(!this.shouted){
      this.shouted = true;
      this.owner.PlaySoundSet(SSFObject.TYPES.UNLOCK);
    }

    let distance = Utility.Distance2D(this.owner.position, this.target.position);
    if(distance > 1.5){
      try{
        this.actionPathfinder(1.5, undefined, delta);
      }catch(e){}
      return Action.STATUS.IN_PROGRESS;
    }else{
      this.owner.animState = ModuleCreature.AnimState.IDLE;
      this.owner.force = 0;
                        
      if(this.owner instanceof ModuleCreature)
        this.owner.setFacingObject( this.target );

      if(this.timer == undefined){
        this.timer = 1.5;
        this.target.audioEmitter.PlaySound('gui_lockpick');
      }

      if(!this.owner.isSimpleCreature()){
        if(this.target instanceof ModuleDoor){
          this.owner.overlayAnimation = 'unlockdr';
        }else{
          this.owner.overlayAnimation = 'unlockcntr';
        }
      }

      this.timer -= delta;

      if(this.timer <= 0){
        this.target.attemptUnlock(this.owner);
        return Action.STATUS.COMPLETE;
      }

      return Action.STATUS.IN_PROGRESS;
      
    }

    return Action.STATUS.FAILED;
  }

}

module.exports = ActionUnlockObject;