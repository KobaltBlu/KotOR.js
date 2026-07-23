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
  resolveFollowState,
  shouldFollowRun,
  type FollowLeaderRuntime,
} from "@/engine/pathfinding/follow-leader";
import {
  driveTowardOffset,
} from "@/engine/pathfinding/follow-leader-sm";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import * as THREE from "three";

const _followGoal = new THREE.Vector3();

/**
 * ActionForceFollowObject class.
 * NWScript ForceFollow (0x37) — path + WalkUpdate toward live target.
 * Shares Moving_To_Offset helpers with FollowLeader; not the party ring SM.
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

    this.computeFollowGoal(owner, followTarget, followDistance, _followGoal);
    const goal = _followGoal;
    const dist = Utility.Distance2D(owner.position, followTarget.position);
    const distGoal = Utility.Distance2D(owner.position, goal);

    if(this.followRuntime.state === FollowLeaderState.MovingToOffset){
      if(distGoal > comfort + 0.25){
        this.followRuntime.stuckTimer += delta;
      }else{
        this.followRuntime.stuckTimer = 0;
      }
    }else{
      this.followRuntime.stuckTimer = 0;
    }

    // ForceFollow uses Offset / MovingToOffset / Teleport only (not full party SM)
    let next = resolveFollowState(
      dist,
      distGoal,
      this.followRuntime.state,
      this.followRuntime.stuckTimer
    );
    // Scale teleport/repath with NWScript distance param
    if(dist >= teleportAt || this.followRuntime.stuckTimer >= FOLLOW_STUCK_SEC){
      next = FollowLeaderState.Teleport;
    }else if(next === FollowLeaderState.MovingToOffset || next === FollowLeaderState.Offset){
      if(distGoal <= comfort){
        next = FollowLeaderState.Offset;
      }else if(distGoal >= repath || dist >= repath){
        next = FollowLeaderState.MovingToOffset;
      }
    }
    this.followRuntime.state = next;

    if(next === FollowLeaderState.Teleport){
      this.teleportNearTarget(owner, followTarget, goal);
      this.followRuntime.state = FollowLeaderState.Offset;
      this.followRuntime.stuckTimer = 0;
      return ActionStatus.IN_PROGRESS;
    }

    if(next === FollowLeaderState.MovingToOffset){
      driveTowardOffset(
        owner,
        goal,
        followTarget,
        delta,
        shouldFollowRun(dist, distGoal),
        (d, g, face) => this.runCreatureAvoidance(d, g, face)
      );
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
   * Jump to walkable near live follow goal (parity with FollowLeader Teleport path).
   */
  private teleportNearTarget(
    owner: ModuleCreature,
    followTarget: ModuleCreature,
    goal: THREE.Vector3
  ){
    const area = owner.area ?? GameState.module?.area;
    const dest = new THREE.Vector3().copy(goal);
    if(area?.getNearestWalkablePoint){
      dest.copy(area.getNearestWalkablePoint(goal, 0.5));
    }
    owner.force = 0;
    owner.speed = 0;
    owner.locomotionScale = 1;
    owner.moveDirOverride = undefined;
    owner.setComputedPath(undefined);
    const jump = new GameState.ActionFactory.ActionJumpToPoint(undefined, this.groupId);
    jump.setParameter(0, ActionParameterType.FLOAT, dest.x);
    jump.setParameter(1, ActionParameterType.FLOAT, dest.y);
    jump.setParameter(2, ActionParameterType.FLOAT, dest.z);
    jump.setParameter(3, ActionParameterType.DWORD, area?.id ?? GameState.module.area.id);
    jump.setParameter(4, ActionParameterType.INT, 0);
    jump.setParameter(5, ActionParameterType.FLOAT, 20.0);
    jump.setParameter(6, ActionParameterType.FLOAT, followTarget.rotation?.z ?? 0);
    jump.setParameter(7, ActionParameterType.FLOAT, 0);
    owner.actionQueue.addFront(jump);
  }

  private computeFollowGoal(
    owner: ModuleCreature,
    followTarget: ModuleCreature,
    followDistance: number,
    out: THREE.Vector3
  ): THREE.Vector3 {
    const dx = owner.position.x - followTarget.position.x;
    const dy = owner.position.y - followTarget.position.y;
    const len = Math.hypot(dx, dy);
    if(len < 1e-4){
      out.set(
        followTarget.position.x + Math.cos(followTarget.rotation.z) * followDistance,
        followTarget.position.y + Math.sin(followTarget.rotation.z) * followDistance,
        followTarget.position.z
      );
    }else{
      const scale = followDistance / len;
      out.set(
        followTarget.position.x + dx * scale,
        followTarget.position.y + dy * scale,
        followTarget.position.z
      );
    }

    const area = owner.area ?? GameState.module?.area;
    if(area && typeof area.isPointWalkable === 'function' && !area.isPointWalkable(out)){
      if(typeof area.getNearestWalkablePoint === 'function'){
        out.copy(area.getNearestWalkablePoint(out, 0.05));
      }
    }
    return out;
  }

}
