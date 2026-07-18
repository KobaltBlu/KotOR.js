import { GameState } from "@/GameState";
import { ActionParameterType, ModuleObjectType } from "@/enums";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import {
  createFollowRuntime,
  FollowLeaderState,
  FOLLOW_COMFORT,
  FOLLOW_REPATH,
  FOLLOW_STUCK_SEC,
  FOLLOW_TELEPORT_DIST,
  shouldFollowRun,
  type FollowLeaderRuntime,
} from "@/engine/pathfinding/follow-leader";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { walkUpdateLocation } from "@/engine/pathfinding/walk-update-location";
import { getFollowRateScale } from "@/engine/pathfinding/locomotion";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import * as THREE from "three";

/** Repath when live follow goal drifts this far from path end. */
const GOAL_REPATH_DRIFT = 1.25;

/**
 * ActionForceFollowObject class.
 * NWScript ForceFollow — path + WalkUpdateLocation toward live target.
 *
 * @file ActionForceFollowObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionForceFollowObject extends Action {
  private followRuntime: FollowLeaderRuntime = createFollowRuntime();

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionForceFollowObject;
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;
    this.target = this.getParameter<ModuleObject>(0);
    const fDistance = this.getParameter<number>(1) || 0.0;

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    if(this.target.isDead() || owner.isDead() || owner.isDebilitated()){
      return ActionStatus.ERROR;
    }

    const followTarget = this.target as ModuleCreature;
    const followDistance = fDistance > 0 ? fDistance : 2.0;
    const comfort = Math.max(FOLLOW_COMFORT * 0.5, followDistance * 0.85);
    const repath = Math.max(FOLLOW_REPATH * 0.5, followDistance * 1.15);
    const teleportAt = Math.max(FOLLOW_TELEPORT_DIST, followDistance * 4);

    const dist = Utility.Distance2D(owner.position, followTarget.position);

    if(this.followRuntime.state === FollowLeaderState.MovingToOffset){
      if(dist > comfort + 0.25){
        this.followRuntime.stuckTimer += delta;
      }else{
        this.followRuntime.stuckTimer = 0;
      }
    }else{
      this.followRuntime.stuckTimer = 0;
    }

    let next = this.followRuntime.state;
    if(dist >= teleportAt || this.followRuntime.stuckTimer >= FOLLOW_STUCK_SEC){
      next = FollowLeaderState.Teleport;
    }else if(next === FollowLeaderState.MovingToOffset){
      next = dist <= comfort ? FollowLeaderState.Idle : FollowLeaderState.MovingToOffset;
    }else{
      next = dist >= repath ? FollowLeaderState.MovingToOffset : FollowLeaderState.Idle;
    }
    this.followRuntime.state = next;

    if(next === FollowLeaderState.Teleport){
      owner.force = 0;
      owner.speed = 0;
      owner.setComputedPath(undefined);
      const jump = new GameState.ActionFactory.ActionJumpToObject(undefined, this.groupId);
      jump.setParameter(0, ActionParameterType.DWORD, followTarget.id);
      jump.setParameter(1, ActionParameterType.INT, 1);
      owner.actionQueue.addFront(jump);
      this.followRuntime.state = FollowLeaderState.Idle;
      this.followRuntime.stuckTimer = 0;
      return ActionStatus.IN_PROGRESS;
    }

    if(next === FollowLeaderState.MovingToOffset){
      this.driveTowardTarget(owner, followTarget, followDistance, delta, shouldFollowRun(dist, dist));
      return ActionStatus.IN_PROGRESS;
    }

    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.locomotionScale = 1;
    owner.moveDirOverride = undefined;
    owner.setComputedPath(undefined);
    return ActionStatus.IN_PROGRESS;
  }

  /**
   * Stay near the target at followDistance — path + WalkUpdateLocation.
   */
  private driveTowardTarget(
    owner: ModuleCreature,
    followTarget: ModuleCreature,
    followDistance: number,
    delta: number,
    run: boolean
  ){
    const goal = this.computeFollowGoal(owner, followTarget, followDistance);
    this.ensurePathToGoal(owner, goal);

    if(owner.blockingTimer >= 5 || owner.collisionTimer >= 0.5){
      owner.blockingTimer = 0;
      owner.collisionTimer = 0;
      this.runCreatureAvoidance(delta, goal, followTarget);
    }

    const path = owner.getComputedPath();
    const point = path?.points?.[0];
    if(point && Utility.Distance2D(owner.position, point.vector) <= 0.5){
      path.pop();
    }
    const faceGoal = path?.points?.[0]?.vector ?? goal;
    this.faceToward(owner, faceGoal);

    owner.walk = !run;
    owner.force = 0;
    owner.locomotionScale = 1;
    owner.moveDirOverride = undefined;
    owner.setAnimationState(run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING);

    let remaining = Utility.Distance2D(owner.position, faceGoal);
    const pts = path?.points;
    if(pts?.length){
      remaining = Utility.Distance2D(owner.position, pts[0].vector);
      for(let i = 1; i < pts.length; i++){
        remaining += Utility.Distance2D(pts[i - 1].vector, pts[i].vector);
      }
    }

    walkUpdateLocation(owner, faceGoal, run, delta, {
      remainingDistance: remaining,
      followScale: getFollowRateScale(Utility.Distance2D(owner.position, goal)),
    });
  }

  private computeFollowGoal(
    owner: ModuleCreature,
    followTarget: ModuleCreature,
    followDistance: number
  ): THREE.Vector3 {
    const dx = owner.position.x - followTarget.position.x;
    const dy = owner.position.y - followTarget.position.y;
    const len = Math.hypot(dx, dy);
    const goal = new THREE.Vector3();
    if(len < 1e-4){
      goal.set(
        followTarget.position.x + Math.cos(followTarget.rotation.z) * followDistance,
        followTarget.position.y + Math.sin(followTarget.rotation.z) * followDistance,
        followTarget.position.z
      );
    }else{
      const scale = followDistance / len;
      goal.set(
        followTarget.position.x + dx * scale,
        followTarget.position.y + dy * scale,
        followTarget.position.z
      );
    }

    const area = owner.area ?? GameState.module?.area;
    if(area && typeof area.isPointWalkable === 'function' && !area.isPointWalkable(goal)){
      if(typeof area.getNearestWalkablePoint === 'function'){
        return area.getNearestWalkablePoint(goal, 0.05);
      }
    }
    return goal;
  }

  private ensurePathToGoal(owner: ModuleCreature, goal: THREE.Vector3){
    const area = owner.area ?? GameState.module?.area;
    if(!area?.path?.traverseToPoint) return;

    const path = owner.getComputedPath();
    const end = path?.points?.length
      ? path.points[path.points.length - 1].vector
      : undefined;
    const drift = end ? Utility.Distance2D(end, goal) : Infinity;
    if(path?.points?.length && drift <= GOAL_REPATH_DRIFT){
      return;
    }

    const computed = area.path.traverseToPoint(owner, owner.position, goal);
    if(!computed?.points?.length){
      return;
    }
    computed.prunePathPoints();
    computed.smoothCorners();
    computed.fixWalkEdges(getPathPersonalSpace(owner));
    computed.setColor(owner.helperColor);
    computed.realtime = true;
    computed.timer = 20;
    owner.setComputedPath(computed);
  }

  private faceToward(owner: ModuleCreature, goal: THREE.Vector3){
    const dx = goal.x - owner.position.x;
    const dy = goal.y - owner.position.y;
    if(dx * dx + dy * dy < 1e-8) return;
    const atan = Math.atan2(-dy, -dx);
    owner.setFacing(atan + Math.PI / 2, false, TURN_SPEED_FAST);
  }

}
