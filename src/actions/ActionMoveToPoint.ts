import * as THREE from "three";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";
import { Utility } from "../utility/Utility";
import { GameState } from "../GameState";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import type { ModuleObject } from "../module/ModuleObject";
import type { ComputedPath } from "../module/ModulePath";

/**
 * ActionMoveToPoint class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionMoveToPoint.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionMoveToPoint extends Action {

  target_position: THREE.Vector3 = new THREE.Vector3();
  real_target_position: THREE.Vector3 = new THREE.Vector3();

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
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
    // 8 - float: timeout value The amount of time to search for path before jumping to the object (as in ActionJumpToObject()) default 30

  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))
      return ActionStatus.FAILED;

    this.target_position.set(
      this.getParameter<number>(0),
      this.getParameter<number>(1),
      this.getParameter<number>(2),
    );

    this.real_target_position.copy(this.target_position);

    this.target = this.getParameter<ModuleObject>(4);
    if(this.target){
      this.real_target_position.copy(this.target.position);
      if( BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature) && this.target.isDead() ){
        this.setComputedPath(undefined);
        return ActionStatus.FAILED;
      }
    }

    const range = this.getParameter<number>(6) || 0.1;
    const run = this.getParameter<number>(5) ? true : false;

    if(!this.computedPath){
      this.target_position.copy(this.owner.area.getNearestWalkablePoint(this.target_position, this.owner.getHitDistance()));
      this.calculatePath();
    }

    // this.computedPath = this.owner.getComputedPath();

    const distance = Utility.Distance2D(this.owner.position, this.target_position);
    if(distance > (this.computedPath.points.length > 1 ? 0.5 : range)){
  
      if((this.owner as any).blockingTimer >= 5 || this.owner.collisionTimer >= 1){
        (this.owner as any).blockingTimer = 0;
        this.owner.collisionTimer = 0;
      }
  
      const point = this.computedPath.points[0];
      if(point){
        let pointDistance = Utility.Distance2D(this.owner.position, point.vector);
        if(pointDistance > (this.computedPath.points.length > 1 ? 0.5 : range)){
          const tangent = point.vector.clone().sub(this.owner.position.clone());
          const atan = Math.atan2(-tangent.y, -tangent.x);
          this.owner.setFacing(atan + Math.PI/2, false);
          this.owner.forceVector.x = Math.cos(atan);
          this.owner.forceVector.y = Math.sin(atan);
    
          this.runCreatureAvoidance(delta, this.target_position);

          this.owner.forceVector.negate();
          this.owner.force = 1;//Math.min( 1, Math.max( 0.5, ( ( distanceToTarget - arrivalDistance ) / 1 ) ) );
          // this.owner.walk = !run;
          this.owner.setAnimationState(run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING);
        }else{
          this.computedPath.pop();
        }
      }
  
      if(this.computedPath.timer < 0){
        if(this.computedPath.realtime){
          this.setComputedPath(undefined);
        }
      }else{
        this.computedPath.timer -= 10*delta;
      }

      const timeout = this.getParameter<number>(8) - delta;
      if(timeout <= 0){
        const fallback_action = new GameState.ActionFactory.ActionJumpToPoint(undefined, this.groupId);
        fallback_action.setParameter(0, ActionParameterType.FLOAT, this.real_target_position.x);
        fallback_action.setParameter(1, ActionParameterType.FLOAT, this.real_target_position.y);
        fallback_action.setParameter(2, ActionParameterType.FLOAT, this.real_target_position.z);
        fallback_action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
        fallback_action.setParameter(4, ActionParameterType.INT, 0);
        fallback_action.setParameter(5, ActionParameterType.FLOAT, 20.0);
        fallback_action.setParameter(6, ActionParameterType.FLOAT, 0);//target.rotation.x);
        fallback_action.setParameter(7, ActionParameterType.FLOAT, 0)//target.rotation.y);
        this.owner.actionQueue.addFront(fallback_action);
        return ActionStatus.FAILED;
      }
      this.setParameter(8, timeout);

      return ActionStatus.IN_PROGRESS;
    }else{
      this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
      this.owner.force = 0;
      this.owner.speed = 0;
      this.setComputedPath(undefined);
      return ActionStatus.COMPLETE;
    }

    this.setComputedPath(undefined);
    return ActionStatus.FAILED;
  }

  calculatePath(){
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;

    const path = GameState.module.area.path.traverseToPoint(this.owner, this.owner.position, this.target_position);
    path.fixWalkEdges(this.owner.getHitDistance());
    path.setColor(this.owner.helperColor);
    if(BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      path.realtime = true;
    }
    path.timer = 20;
    this.setComputedPath(path);
  }

  dispose(): void {
    super.dispose();
    if(this.owner.getComputedPath() == this.computedPath){
      this.owner.setComputedPath(undefined);
    }
    this.computedPath = undefined;
  }

}
