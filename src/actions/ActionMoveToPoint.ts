import * as THREE from "three";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { Action } from "@/actions/Action";
import { Utility } from "@/utility/Utility";
import { GameState } from "@/GameState";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ComputedPath } from "@/engine/pathfinding/ComputedPath";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import { runActionCreatureAvoidance } from "@/actions/helpers/CreatureAvoidance";

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
  last_path_target_position: THREE.Vector3 = new THREE.Vector3();

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionMoveToPoint;

    //PARAMS
    // 0 - float: x
    // 1 - float: y
    // 2 - float: z
    // 3 - dword: area object id
    // 4 - dword: target object id
    // 5 - int: move flags
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

    const range = this.getParameter<number>(6) || 0.1;
    const moveFlags = this.getParameter<number>(5) || 0;
    const run = moveFlags & 0x01 ? true : false;

    this.real_target_position.copy(this.target_position);

    this.target = this.getParameter<ModuleObject>(4);
    if(this.target){
      this.real_target_position.copy(this.target.position);
      if( BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature) && this.target.isDead() ){
        this.setComputedPath(undefined);
        return ActionStatus.FAILED;
      }

      if(this.computedPath?.realtime){
        const movedDistance = Utility.Distance2D(this.real_target_position, this.last_path_target_position);
        if(movedDistance > Math.max(0.5, range * 0.5)){
          this.setComputedPath(undefined);
        }
      }

      const distanceRT = Utility.Distance2D(this.owner.position, this.real_target_position);
      if( distanceRT <= range ){
        this.owner.setAnimationState(ModuleCreatureAnimState.IDLE);
        this.owner.force = 0;
        this.owner.speed = 0;
        this.setComputedPath(undefined);
        return ActionStatus.COMPLETE;
      }
    }

    if(!this.computedPath){
      this.target_position.copy(this.resolveTargetPosition(range));
      this.last_path_target_position.copy(this.real_target_position);
      this.calculatePath();
    }

    // Keep the occupancy-adjusted destination across frames instead of
    // replacing it with the original (possibly occupied) requested point.
    if(this.computedPath?.destination){
      this.target_position.copy(this.computedPath.destination.vector);
    }
    if(!this.computedPath){
      return ActionStatus.FAILED;
    }

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
          this.owner.setFacing(atan + Math.PI/2, false, TURN_SPEED_FAST);
          this.owner.forceVector.x = Math.cos(atan);
          this.owner.forceVector.y = Math.sin(atan);
    
          this.owner.forceVector.negate();
          runActionCreatureAvoidance(this, delta, this.target_position, this.target);
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

      const timeout = (this.getParameter<number>(8) ?? 30.0) - delta;
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
      this.setParameter(8, ActionParameterType.FLOAT, timeout);

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

  resolveTargetPosition(range: number): THREE.Vector3 {
    const resolved = this.real_target_position.clone();

    if(this.target && BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      const direction = this.owner.position.clone().sub(this.target.position);
      if(direction.lengthSq() > 0.0001){
        direction.normalize();
        const desiredRange = Math.max(0.5, range * 0.9);
        resolved.copy(this.target.position).add(direction.multiplyScalar(desiredRange));
      }
    }

    return this.findOpenDestination(resolved, range);
  }

  findOpenDestination(baseTarget: THREE.Vector3, range: number): THREE.Vector3 {
    const ownerHitDistance = this.owner.getHitDistance();
    const occupancyRadius = Math.max(0.75, ownerHitDistance * 1.5);
    const sampleRadius = Math.max(occupancyRadius, Math.min(2.0, Math.max(0.75, range)));

    const candidates: THREE.Vector3[] = [baseTarget.clone()];
    for(let i = 0; i < 8; i++){
      const angle = (i / 8) * Math.PI * 2;
      candidates.push(
        baseTarget.clone().add(new THREE.Vector3(
          Math.cos(angle) * sampleRadius,
          Math.sin(angle) * sampleRadius,
          0,
        ))
      );
    }

    let bestCandidate = this.owner.area.getNearestWalkablePoint(baseTarget, ownerHitDistance);
    let bestScore = -Infinity;

    for(let i = 0; i < candidates.length; i++){
      const walkableCandidate = this.owner.area.getNearestWalkablePoint(candidates[i], ownerHitDistance);
      let occupied = false;

      for(let j = 0; j < this.owner.area.creatures.length; j++){
        const creature = this.owner.area.creatures[j];
        if(creature === this.owner || creature === this.target || creature.isDead()){
          continue;
        }

        if(Utility.Distance2D(walkableCandidate, creature.position) < (occupancyRadius + creature.getHitDistance() * 0.5)){
          occupied = true;
          break;
        }
      }

      for(let j = 0; !occupied && j < GameState.PartyManager.party.length; j++){
        const creature = GameState.PartyManager.party[j];
        if(creature === this.owner || creature === this.target || creature.isDead()){
          continue;
        }

        if(Utility.Distance2D(walkableCandidate, creature.position) < (occupancyRadius + creature.getHitDistance() * 0.5)){
          occupied = true;
          break;
        }
      }

      let score = this.owner.area.scorePointEdgeDistance(walkableCandidate);
      score -= walkableCandidate.distanceToSquared(baseTarget) * 0.25;
      if(occupied){
        score -= 1000;
      }

      if(score > bestScore){
        bestScore = score;
        bestCandidate = walkableCandidate;
      }
    }

    return bestCandidate;
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
    if(this.owner && this.owner.getComputedPath() == this.computedPath){
      this.owner.setComputedPath(undefined);
    }
    this.computedPath = undefined;
  }

}
