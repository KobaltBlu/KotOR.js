class ActionJumpToPoint extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionJumpToPoint;

    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.facing = 0;
    this.target = undefined;

    //PARAMS
    // 0 - float: x
    // 1 - float: y
    // 2 - float: z
    // 3 - dword: target object id
    // 4 - int: unknown
    // 5 - float: 20.0? maybe max safe distance check radius
    // 6 - float: rotation x
    // 7 - float: rotation y
    
  }

  update(delta){
    this.target = this.getParameter(3);

    //if(!(this.target instanceof ModuleObject))
    //  return Action.STATUS.FAILED;

    this.x = this.getParameter(0);
    this.y = this.getParameter(1);
    this.z = this.getParameter(2);

    this.facing = -Math.atan2(
      this.getParameter(6),
      this.getParameter(7)
    );

    if(this.owner instanceof ModuleCreature){
      this.owner.setPosition(new THREE.Vector3(this.x, this.y, this.z));
      this.owner.setFacing(this.facing, false);
      this.owner.groundFace = undefined;
      this.owner.lastGroundFace = undefined;
      //this.getCurrentRoom();
      this.owner.findWalkableFace();
      return Action.STATUS.COMPLETE;
    }

    return Action.STATUS.FAILED;
  }

}

module.exports = ActionJumpToPoint;