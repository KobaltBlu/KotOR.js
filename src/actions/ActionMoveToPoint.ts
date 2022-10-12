import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";
import * as THREE from "three";

export class ActionMoveToPoint extends Action {

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionMoveToPoint;

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

  update(delta: number = 0){
    if(!(this.owner instanceof ModuleCreature))
      return ActionStatus.FAILED;

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
        return ActionStatus.FAILED;
      }
    }

    this.range = this.getParameter(6) || 0.1;
    this.run = this.getParameter(5);

    this.distance = Utility.Distance2D(this.owner.position, this.target_position);
    if(this.distance > (this.path?.length > 1 ? 0.5 : this.range)){

      let distanceToTarget = Utility.Distance2D(this.owner.position, this.target_position);
      if(this.path == undefined){
        if(this.owner.openSpot){
          this.path_realtime = true;
          this.path = GameState.module.area.path.traverseToPoint(this.owner.position, this.owner.openSpot.targetVector);
          //this.path.unshift(this.target.position.clone());
        }else{
          this.path = GameState.module.area.path.traverseToPoint(this.owner.position, this.target_position);
          if(this.target instanceof ModuleCreature){
            this.path_realtime = true;
          }
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
  
      if(!(point instanceof THREE.Vector3))
        point = point.vector;
  
      let pointDistance = Utility.Distance2D(this.owner.position, point);
      if(pointDistance > (this.path?.length > 1 ? 0.5 : this.range)){
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
        this.owner.animState = this.run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING;
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

      return ActionStatus.IN_PROGRESS;
    }else{
      this.owner.animState = ModuleCreatureAnimState.IDLE;
      this.owner.force = 0;
      this.owner.speed = 0;
      return ActionStatus.COMPLETE;
    }

    return ActionStatus.FAILED;
  }

}
