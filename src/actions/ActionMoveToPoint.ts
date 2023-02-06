import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";
import * as THREE from "three";
import { ModuleCreature, ModuleObject } from "../module";
import { Utility } from "../utility/Utility";
import { GameState } from "../GameState";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";

export class ActionMoveToPoint extends Action {

  target_position: THREE.Vector3 = new THREE.Vector3();
  real_target_position: THREE.Vector3 = new THREE.Vector3();

  constructor( groupId = 0 ){
    super(groupId);
    this.type = ActionType.ActionMoveToPoint;

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

  update(delta: number = 0): ActionStatus {
    if(!(this.owner instanceof ModuleCreature))
      return ActionStatus.FAILED;

    this.target_position.set(
      this.getParameter(0),
      this.getParameter(1),
      this.getParameter(2),
    );

    this.real_target_position.copy(this.target_position);

    this.target = this.getParameter(4);
    if(this.target instanceof ModuleObject){
      this.real_target_position.copy(this.target.position);
      if( this.target instanceof ModuleCreature && this.target.isDead() ){
        if(this.owner.computedPath) this.owner.computedPath.dispose();
        this.owner.computedPath = undefined;
        return ActionStatus.FAILED;
      }
    }

    const range = this.getParameter(6) || 0.1;
    const run = this.getParameter(5) ? true : false;

    if(this.owner.computedPath == undefined){
      this.calculatePath();
    }

    const distance = Utility.Distance2D(this.owner.position, this.target_position);
    if(distance > (this.owner.computedPath.points.length > 1 ? 0.5 : range)){
  
      if(this.owner.blockingTimer >= 5 || this.owner.collisionTimer >= 1){
        this.owner.blockingTimer = 0;
        this.owner.collisionTimer = 0;
      }

      let distanceToTarget = Utility.Distance2D(this.owner.position, this.target_position);

      if(this.owner.openSpot){
        distanceToTarget = Utility.Distance2D(this.owner.position, this.owner.openSpot.targetVector);
      }
  
      let point = this.owner.computedPath.points[0];
      if(point){
        let pointDistance = Utility.Distance2D(this.owner.position, point.vector);
        if(pointDistance > (this.owner.computedPath.points.length > 1 ? 0.5 : range)){
          let tangent = point.vector.clone().sub(this.owner.position.clone());
          let atan = Math.atan2(-tangent.y, -tangent.x);
          this.owner.setFacing(atan + Math.PI/2, false);
          this.owner.AxisFront.x = Math.cos(atan);
          this.owner.AxisFront.y = Math.sin(atan);
    
          this.runCreatureAvoidance(delta);
    
          let arrivalDistance = range;
          if( this.openSpot ){
            arrivalDistance = 1.5;
          }

          this.owner.AxisFront.negate();
          this.owner.force = 1;//Math.min( 1, Math.max( 0.5, ( ( distanceToTarget - arrivalDistance ) / 1 ) ) );
          this.owner.walk = !run;
          this.owner.animState = run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING;
        }else{
          this.owner.computedPath.points.shift();
        }
      }else{
        // console.warn(`No more points on path`, this.owner.getTag(), this.owner.computedPath);
      }
  
      if(this.owner.computedPath.timer < 0){
        if(this.owner.computedPath.realtime){
          if(this.owner.computedPath) this.owner.computedPath.dispose();
          this.owner.computedPath = undefined;
          //console.log('Path invalidated');
        }
      }else{
        this.owner.computedPath.timer -= 10*delta;
      }

      return ActionStatus.IN_PROGRESS;
    }else{
      this.owner.animState = ModuleCreatureAnimState.IDLE;
      this.owner.force = 0;
      this.owner.speed = 0;
      if(this.owner.computedPath) this.owner.computedPath.dispose();
      this.owner.computedPath = undefined;
      return ActionStatus.COMPLETE;
    }

    if(this.owner.computedPath) this.owner.computedPath.dispose();
    this.owner.computedPath = undefined;
    return ActionStatus.FAILED;
  }

  calculatePath(){
    if(!(this.owner instanceof ModuleCreature)) return;
    if(this.owner.openSpot){
      this.owner.computedPath = GameState.module.area.path.traverseToPoint(this.owner.position, this.owner.openSpot.targetVector);
      this.owner.computedPath.realtime = true;
    }else{
      this.owner.computedPath = GameState.module.area.path.traverseToPoint(this.owner.position, this.target_position);
      if(this.target instanceof ModuleCreature){
        this.owner.computedPath.realtime = true;
      }
    }
    // distanceToTarget = Utility.Distance2D(this.owner.position, this.target_position);
    this.owner.computedPath.timer = 20;
    if(this.owner.computedPath){
      // this.owner.computedPath.buildHelperLine();
      // (this.owner.computedPath.line.material as THREE.LineBasicMaterial).color.copy(this.owner.helperColor);
    }
  }

}
