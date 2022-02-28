class ActionMoveToPoint extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = Action.TYPE.ActionMoveToPoint;

    this.target_position = new THREE.Vector3();

    //PARAMS
    // 0 - float: x
    // 1 - float: y
    // 2 - float: z
    // 3 - dword: area object id
    // 4 - dword: target object id
    // 5 - int: 0 == walk | 1 == run
    // 6 - float: min range/distance
    // 7 - int: unknown
    // 8 - float: timeout value

  }

  update(delta){
    if(!(this.owner instanceof ModuleCreature))
      return Action.STATUS.FAILED;

    this.target_position.set(
      this.getParameter(0),
      this.getParameter(1),
      this.getParameter(2),
    );

    this.real_target_position = this.target_position.clone();

    this.target = this.getParameter(4);
    if(this.target instanceof ModuleObject){
      this.real_target_position.copy(this.target.position);
      if( this.target instanceof ModuleCreature && this.target.isDead() ){
        return Action.STATUS.FAILED;
      }
    }

    this.range = this.getParameter(6) || 0.1;
    this.run = this.getParameter(5);

    this.distance = Utility.Distance2D(this.owner.position, this.target_position);
    if(this.distance > this.range){

      let distanceToTarget = Utility.Distance2D(this.owner.position, this.target_position);
      if(this.path == undefined){
        if(this.owner.openSpot){
          this.path_realtime = true;
          this.path = Game.module.area.path.traverseToPoint(this.owner.position, this.owner.openSpot.targetVector);
          this.path.unshift(this.target.position.clone());
        }else{
          this.path = Game.module.area.path.traverseToPoint(this.owner.position, this.target_position);
        }
        distanceToTarget = Utility.Distance2D(this.owner.position, this.target_position);
        this.path_timer = 20;
      }

      if(this.owner.openSpot){
        distanceToTarget = Utility.Distance2D(this.owner.position, this.owner.openSpot.targetVector);
      }
  
      let point = this.path[0];
  
      if(this.blockingTimer >= 5 || this.collisionTimer >= 1){
        this.owner.blockingTimer = 0;
        this.owner.collisionTimer = 0;
      }
  
      if(point == undefined)
        point = this.target_position;
  
      if(!(point instanceof THREE.Vector3))
        point = point.vector;
  
      let pointDistance = Utility.Distance2D(this.owner.position, point);
      if(pointDistance > this.range){
        let tangent = point.clone().sub(this.owner.position.clone());
        let atan = Math.atan2(-tangent.y, -tangent.x);
        this.owner.setFacing(atan + Math.PI/2, false);
        this.owner.AxisFront.x = Math.cos(atan);
        this.owner.AxisFront.y = Math.sin(atan);
  
        this.runCreatureAvoidance(delta);
  
        let arrivalDistance = this.range;
        if( this.openSpot ){
          arrivalDistance = 1.5;
        }

        this.owner.AxisFront.negate();
        this.owner.force = Math.min( 1, Math.max( 0.5, ( ( distanceToTarget - arrivalDistance ) / 1 ) ) );
        this.owner.walk = !this.run;
        this.owner.animState = this.run ? ModuleCreature.AnimState.RUNNING : ModuleCreature.AnimState.WALKING;
      }else{
        this.path.shift();
      }
  
      if(this.path_timer < 0){
        if(this.path_realtime){
          this.path = undefined;
          this.path_timer = 20;
          //console.log('Path invalidated');
        }
      }else{
        this.path_timer -= 10*delta;
      }

      return Action.STATUS.IN_PROGRESS;
    }else{
      this.owner.animState = ModuleCreature.AnimState.IDLE;
      this.owner.force = 0;
      this.owner.speed = 0;
      return Action.STATUS.COMPLETE;
    }

    return Action.STATUS.FAILED;
  }

}

module.exports = ActionMoveToPoint;