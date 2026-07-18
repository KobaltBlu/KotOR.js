import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import {
  createFollowRuntime,
  FollowLeaderState,
  FOLLOW_COMFORT,
  resolveFollowState,
  shouldFollowRun,
  type FollowLeaderRuntime,
} from "@/engine/pathfinding/follow-leader";
import { getFollowRateScale } from "@/engine/pathfinding/locomotion";
import { partySoftSeparate } from "@/engine/pathfinding/party-soft-separate";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { walkUpdateLocation } from "@/engine/pathfinding/walk-update-location";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import * as THREE from "three";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";

const _followOffset = new THREE.Vector3();
/** Repath when the live offset drifts this far from the path end. */
const OFFSET_REPATH_DRIFT = 1.25;

/**
 * ActionFollowLeader class.
 * Party companion follow — retail thresholds / follow ring + WalkUpdateLocation.
 *
 * @file ActionFollowLeader.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionFollowLeader extends Action {
  private followRuntime: FollowLeaderRuntime = createFollowRuntime();

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionFollowLeader;
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner = this.owner as ModuleCreature;

    if(GameState.Mode == EngineMode.DIALOG){
      owner.force = 0;
      owner.speed = 0;
      return ActionStatus.FAILED;
    }

    if(GameState.SOLOMODE){
      this.parkIdle(owner);
      return ActionStatus.COMPLETE;
    }

    const leader = GameState.PartyManager.party[0];
    if(!leader || leader === owner){
      this.parkIdle(owner);
      return ActionStatus.COMPLETE;
    }

    this.target = leader;
    _followOffset.copy(GameState.PartyManager.GetFollowPosition(owner));
    const offset = _followOffset;
    const distLeader = Utility.Distance2D(owner.position, leader.position);
    const distOffset = Utility.Distance2D(owner.position, offset);

    if(this.followRuntime.state === FollowLeaderState.MovingToOffset){
      if(distOffset > FOLLOW_COMFORT + 0.25){
        this.followRuntime.stuckTimer += delta;
      }else{
        this.followRuntime.stuckTimer = 0;
      }
    }else{
      this.followRuntime.stuckTimer = 0;
    }

    const next = resolveFollowState(
      distLeader,
      distOffset,
      this.followRuntime.state,
      this.followRuntime.stuckTimer
    );
    this.followRuntime.state = next;

    if(next === FollowLeaderState.Teleport){
      this.teleportToOffset(owner, offset);
      this.followRuntime.state = FollowLeaderState.Idle;
      this.followRuntime.stuckTimer = 0;
      return ActionStatus.IN_PROGRESS;
    }

    if(next === FollowLeaderState.MovingToOffset){
      this.driveTowardOffset(owner, offset, leader, delta, shouldFollowRun(distLeader, distOffset));
      return ActionStatus.IN_PROGRESS;
    }

    this.parkIdle(owner);
    return ActionStatus.IN_PROGRESS;
  }

  /**
   * WalkUpdateLocation toward follow offset (retail FollowLeader bands via followScale).
   */
  private driveTowardOffset(
    owner: ModuleCreature,
    offset: THREE.Vector3,
    leader: ModuleCreature,
    delta: number,
    run: boolean
  ){
    this.ensurePathToOffset(owner, offset);

    if(owner.blockingTimer >= 5 || owner.collisionTimer >= 0.5){
      owner.blockingTimer = 0;
      owner.collisionTimer = 0;
      this.runCreatureAvoidance(delta, offset, leader);
    }

    const path = owner.getComputedPath();
    const point = path?.points?.[0];
    if(point && Utility.Distance2D(owner.position, point.vector) <= 0.5){
      path.pop();
    }
    const goal = path?.points?.[0]?.vector ?? offset;
    this.faceToward(owner, goal);

    owner.walk = !run;
    owner.force = 0;
    owner.moveDirOverride = undefined;
    owner.setAnimationState(run ? ModuleCreatureAnimState.RUNNING : ModuleCreatureAnimState.WALKING);

    let remaining = Utility.Distance2D(owner.position, goal);
    const pts = path?.points;
    if(pts?.length){
      remaining = Utility.Distance2D(owner.position, pts[0].vector);
      for(let i = 1; i < pts.length; i++){
        remaining += Utility.Distance2D(pts[i - 1].vector, pts[i].vector);
      }
    }

    walkUpdateLocation(owner, goal, run, delta, {
      remainingDistance: remaining,
      followScale: getFollowRateScale(Utility.Distance2D(owner.position, offset)),
    });
  }

  private faceToward(owner: ModuleCreature, goal: THREE.Vector3){
    const dx = goal.x - owner.position.x;
    const dy = goal.y - owner.position.y;
    if(dx * dx + dy * dy < 1e-8) return;
    const atan = Math.atan2(-dy, -dx);
    owner.setFacing(atan + Math.PI / 2, false, TURN_SPEED_FAST);
  }

  private ensurePathToOffset(owner: ModuleCreature, offset: THREE.Vector3){
    const area = owner.area ?? GameState.module?.area;
    if(!area?.path?.traverseToPoint) return;

    const path = owner.getComputedPath();
    const end = path?.points?.length
      ? path.points[path.points.length - 1].vector
      : undefined;
    const drift = end ? Utility.Distance2D(end, offset) : Infinity;
    if(path?.points?.length && drift <= OFFSET_REPATH_DRIFT){
      return;
    }

    let dest = offset;
    if(typeof area.getNearestWalkablePoint === 'function' && typeof area.isPointWalkable === 'function'){
      if(!area.isPointWalkable(offset)){
        dest = area.getNearestWalkablePoint(offset, 0.05);
      }
    }

    const computed = area.path.traverseToPoint(owner, owner.position, dest);
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

  private parkIdle(owner: ModuleCreature){
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.locomotionScale = 1;
    owner.moveDirOverride = undefined;
    owner.setComputedPath(undefined);
    // Party field426 creatures aren't BumpFriends targets — soft-separate when idle
    partySoftSeparate(owner);
  }

  /**
   * Retail TeleportForward (@ 00512de0) advances the party follow-path ring.
   */
  private teleportToOffset(owner: ModuleCreature, offset: THREE.Vector3){
    const area = owner.area;
    const dest = new THREE.Vector3();
    if(!GameState.PartyManager.teleportFollowForward(owner, dest)){
      dest.copy(offset);
      if(area?.getNearestWalkablePoint){
        dest.copy(area.getNearestWalkablePoint(offset, 0.5));
      }
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
    jump.setParameter(6, ActionParameterType.FLOAT, 0);
    jump.setParameter(7, ActionParameterType.FLOAT, 0);
    owner.actionQueue.addFront(jump);
  }

}
