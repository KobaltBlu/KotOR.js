import * as THREE from "three";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { Action } from "@/actions/Action";
import { Utility } from "@/utility/Utility";
import { GameState } from "@/GameState";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { BitWise } from "@/utility/BitWise";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleObject } from "@/module/ModuleObject";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { beginInterAreaPath } from "@/engine/pathfinding/inter-area-path";
import { WALK_BACK_DOT } from "@/engine/pathfinding/locomotion";
import {
  walkUpdateLocation,
  resetWalkSpeedFactor,
} from "@/engine/pathfinding/walk-update-location";
import {
  plotPath,
  PlotPathCode,
  type PathFindInfoLite,
} from "@/engine/pathfinding/plot-path";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * ActionMoveToPoint class.
 *
 * Retail AIActionMoveToPoint — path + WalkUpdateLocation trapezoid stepping
 * (not the force-mover speed*2.5 hack).
 *
 * @file ActionMoveToPoint.ts
 */
export class ActionMoveToPoint extends Action {

  target_position: THREE.Vector3 = new THREE.Vector3();
  real_target_position: THREE.Vector3 = new THREE.Vector3();

  /** Lite PlotPath info — lastCode / endpoints for field28_0x88 early-out. */
  pathFindInfo: PathFindInfoLite | undefined;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionMoveToPoint;
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature))
      return ActionStatus.FAILED;

    const owner = this.owner as ModuleCreature;

    const destAreaId = this.getParameter<number>(3);
    const ownerAreaId = owner.area?.id ?? GameState.module?.area?.id;
    if(
      typeof destAreaId === 'number' &&
      typeof ownerAreaId === 'number' &&
      destAreaId !== ownerAreaId
    ){
      if(!owner.interAreaWaypoints?.length){
        beginInterAreaPath(owner, undefined, destAreaId);
      }
      if(owner.interAreaWaypoints?.length){
        const check = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, this.groupId);
        owner.actionQueue.addFront(check);
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.FAILED;
    }

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
    const chaseLive = !!(
      this.target &&
      BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)
    );

    if(chaseLive){
      this.real_target_position.copy(this.target.position);
      if( this.target.isDead() ){
        this.stopMoving(owner);
        this.setComputedPath(undefined);
        return ActionStatus.FAILED;
      }

      const distanceToLive = Utility.Distance2D(owner.position, this.real_target_position);
      if( distanceToLive <= range ){
        this.stopMoving(owner);
        this.setComputedPath(undefined);
        return ActionStatus.COMPLETE;
      }

      if(this.shouldRepathToMovingTarget(distanceToLive)){
        this.enqueueMoveToLiveTarget(range, moveFlags);
        this.setComputedPath(undefined);
        return ActionStatus.COMPLETE;
      }
    }

    if(!this.computedPath){
      const area = owner.area;
      if(area && typeof area.isPointWalkable === 'function' && !area.isPointWalkable(this.target_position)){
        this.target_position.copy(area.getNearestWalkablePoint(this.target_position, 0.05));
      }else if(area && typeof area.getNearestWalkablePoint === 'function' && typeof area.isPointWalkable !== 'function'){
        this.target_position.copy(area.getNearestWalkablePoint(this.target_position, 0.05));
      }
      this.calculatePath();
    }

    // Retail: Incomplete (1) continues; Fail (3) fails — no replot grace
    if(this.pathFindInfo?.lastCode === PlotPathCode.Incomplete && !this.computedPath?.points?.length){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.computedPath?.points?.length){
      this.stopMoving(owner);
      this.setComputedPath(undefined);
      return ActionStatus.FAILED;
    }

    const distance = Utility.Distance2D(owner.position, this.target_position);
    if(distance > (this.computedPath.points.length > 1 ? 0.5 : range)){

      if((owner as any).blockingTimer >= 5 || owner.collisionTimer >= 0.5){
        (owner as any).blockingTimer = 0;
        owner.collisionTimer = 0;
        this.runCreatureAvoidance(delta, this.target_position, this.target);
      }

      const point = this.computedPath.points[0];
      if(point){
        const pointDistance = Utility.Distance2D(owner.position, point.vector);
        const arriveAtPoint = this.computedPath.points.length > 1 ? 0.5 : range;
        if(pointDistance > arriveAtPoint){
          this.stepWalkUpdate(owner, point.vector, run, delta);
        }else{
          this.computedPath.pop();
          const next = this.computedPath.points[0];
          if(next){
            this.stepWalkUpdate(owner, next.vector, run, delta);
          }
        }
      }

      if(this.computedPath.timer < 0){
        if(this.computedPath.realtime){
          this.setComputedPath(undefined);
        }
      }else{
        this.computedPath.timer -= 10*delta;
      }

      // Retail AddMoveToPointAction: timeout 0 = no Jump; >0 = ForceMove countdown.
      const moveTimeout = this.getParameter<number>(8);
      if(typeof moveTimeout === 'number' && moveTimeout > 0){
        const timeout = moveTimeout - delta;
        if(timeout <= 0){
          this.stopMoving(owner);
          // ForceMove expiry — JumpToPoint (ExecuteCommandMoveTo* @ 0053fe00)
          const fallback_action = new GameState.ActionFactory.ActionJumpToPoint(undefined, this.groupId);
          fallback_action.setParameter(0, ActionParameterType.FLOAT, this.real_target_position.x);
          fallback_action.setParameter(1, ActionParameterType.FLOAT, this.real_target_position.y);
          fallback_action.setParameter(2, ActionParameterType.FLOAT, this.real_target_position.z);
          fallback_action.setParameter(3, ActionParameterType.DWORD, GameState.module.area.id);
          fallback_action.setParameter(4, ActionParameterType.INT, 0);
          fallback_action.setParameter(5, ActionParameterType.FLOAT, 20.0);
          fallback_action.setParameter(6, ActionParameterType.FLOAT, 0);
          fallback_action.setParameter(7, ActionParameterType.FLOAT, 0);
          owner.actionQueue.addFront(fallback_action);
          return ActionStatus.FAILED;
        }
        this.setParameter(8, ActionParameterType.FLOAT, timeout);
      }

      return ActionStatus.IN_PROGRESS;
    }else{
      if(chaseLive){
        const liveDist = Utility.Distance2D(owner.position, this.target.position);
        if(liveDist > range){
          this.enqueueMoveToLiveTarget(range, moveFlags);
          this.setComputedPath(undefined);
          return ActionStatus.COMPLETE;
        }
      }
      this.stopMoving(owner);
      this.setComputedPath(undefined);
      return ActionStatus.COMPLETE;
    }
  }

  /**
   * WalkUpdateLocation step toward the next waypoint.
   */
  private stepWalkUpdate(owner: ModuleCreature, goal: THREE.Vector3, run: boolean, delta: number){
    owner.walk = !run;
    owner.force = 0;

    const remaining = this.pathRemaining(owner);
    const shortPath = (this.computedPath?.points?.length ?? 0) <= 2;
    const dx = goal.x - owner.position.x;
    const dy = goal.y - owner.position.y;
    const lenSq = dx * dx + dy * dy;
    let allowWalkBack = false;
    if(!run && shortPath && lenSq < 4.0 && lenSq > 1e-8){
      const len = Math.sqrt(lenSq);
      const gx = dx / len;
      const gy = dy / len;
      const fx = Math.cos(owner.rotation.z + Math.PI / 2);
      const fy = Math.sin(owner.rotation.z + Math.PI / 2);
      if(fx * gx + fy * gy < WALK_BACK_DOT){
        allowWalkBack = true;
        owner.moveDirOverride = { x: gx, y: gy };
        owner.setAnimationState(ModuleCreatureAnimState.WALKING_BACK);
      }
    }
    if(!allowWalkBack){
      owner.moveDirOverride = undefined;
      const atan = Math.atan2(-dy, -dx);
      owner.setFacing(atan + Math.PI / 2, false, TURN_SPEED_FAST);
      owner.setAnimationState(run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING);
    }

    walkUpdateLocation(owner, goal, run, delta, {
      remainingDistance: remaining,
      allowWalkBack,
    });
  }

  private pathRemaining(owner: ModuleCreature): number {
    const pts = this.computedPath?.points;
    if(!pts?.length) return 0;
    let remaining = Utility.Distance2D(owner.position, pts[0].vector);
    for(let i = 1; i < pts.length; i++){
      remaining += Utility.Distance2D(pts[i - 1].vector, pts[i].vector);
    }
    return remaining;
  }

  private stopMoving(owner: ModuleCreature){
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.locomotionScale = 1;
    owner.moveDirOverride = undefined;
    resetWalkSpeedFactor(owner);
  }

  shouldRepathToMovingTarget(distanceToLive: number): boolean {
    if(!this.target || !BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      return false;
    }
    const storedToLive = Utility.Distance2D(this.target_position, this.real_target_position);
    if(storedToLive < 0.001) return false;
    const threshold = Math.max(2.0, distanceToLive * 0.4);
    return storedToLive > threshold;
  }

  enqueueMoveToLiveTarget(range: number, moveFlags: number){
    if(!this.target || !this.owner.area) return;

    let dest = this.real_target_position.clone();
    if(typeof this.owner.area.getNearestWalkablePoint === 'function'){
      dest = this.owner.area.getNearestWalkablePoint(dest, getPathPersonalSpace(this.owner));
    }

    const timeout = this.getParameter<number>(8);
    const move = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
    move.setParameter(0, ActionParameterType.FLOAT, dest.x);
    move.setParameter(1, ActionParameterType.FLOAT, dest.y);
    move.setParameter(2, ActionParameterType.FLOAT, dest.z);
    move.setParameter(3, ActionParameterType.DWORD, this.target.area?.id ?? this.owner.area.id);
    move.setParameter(4, ActionParameterType.DWORD, this.target.id);
    move.setParameter(5, ActionParameterType.INT, moveFlags);
    move.setParameter(6, ActionParameterType.FLOAT, range);
    move.setParameter(7, ActionParameterType.INT, this.getParameter<number>(7) || 0);
    move.setParameter(8, ActionParameterType.FLOAT, typeof timeout === 'number' ? timeout : 0);
    this.owner.actionQueue.addFront(move);
  }

  calculatePath(){
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return;

    const area = GameState.module?.area;
    if(!this.pathFindInfo){
      this.pathFindInfo = {
        ownerId: this.owner.id,
        origin: this.owner.position.clone(),
        dest: this.target_position.clone(),
      };
    }else{
      this.pathFindInfo.ownerId = this.owner.id;
      this.pathFindInfo.origin.copy(this.owner.position);
      this.pathFindInfo.dest.copy(this.target_position);
    }

    const destAreaId = this.getParameter<number>(3);
    if(typeof destAreaId === 'number'){
      this.pathFindInfo.destAreaId = destAreaId;
    }

    const result = plotPath(area, this.owner, this.pathFindInfo);

    if(result.code === PlotPathCode.Fail){
      this.setComputedPath(undefined);
      return;
    }

    // Ready without path — early-out; keep existing computedPath
    if(result.code === PlotPathCode.Ready && !result.path){
      return;
    }

    const path = result.path;
    if(!path){
      this.setComputedPath(undefined);
      return;
    }

    path.fixWalkEdges(getPathPersonalSpace(this.owner));
    path.setColor(this.owner.helperColor);
    this.setComputedPath(path);
  }

}
