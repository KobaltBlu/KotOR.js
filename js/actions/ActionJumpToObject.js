class ActionJumpToObject extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionJumpToObject;

    //PARAMS
    // 0 - dword: target object id
    // 1 - int: walkStraightLineToPoint 0 | 1
    
  }

  update(delta){

    this.target = this.getParameter(0);

    if(!(this.target instanceof ModuleObject))
      return Action.STATUS.FAILED;

    if(this.owner instanceof ModuleCreature){
      this.owner.setPosition(this.target.position);
      this.owner.setFacing(this.target.rotation.z, false);
      this.owner.groundFace = undefined;
      this.owner.lastGroundFace = undefined;
      //this.getCurrentRoom();
      this.owner.findWalkableFace();
      return Action.STATUS.COMPLETE;
    }

    return Action.STATUS.FAILED;
  }

}

module.exports = ActionJumpToObject;