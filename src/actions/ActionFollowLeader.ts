import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { EngineMode } from "@/enums/engine/EngineMode";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import {
  createFollowRuntime,
  FollowLeaderState,
  FOLLOW_STUCK_ITERATIONS,
  FOLLOW_TELEPORT_DIST,
  isFollowWaitState,
  type FollowLeaderRuntime,
} from "@/engine/pathfinding/follow-leader";
import {
  isActivelyApproaching,
  stepFollowLeaderState,
} from "@/engine/pathfinding/follow-leader-sm";
import { partySoftSeparate } from "@/engine/pathfinding/party-soft-separate";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BitWise } from "@/utility/BitWise";
import { Action } from "@/actions/Action";
import * as THREE from "three";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";

const _followOffset = new THREE.Vector3();

/**
 * ActionFollowLeader class.
 * Party companion follow — retail WalkUpdateLocation_QuickWalk_FollowLeader
 * 11-state SM + follow ring + WalkUpdateLocation.
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
    // Sync in-safety range from party follow info into the SM runtime
    if(owner.partyFollowInfo){
      this.followRuntime.inSafetyRange = owner.partyFollowInfo.inSafetyRange | 0;
    }
    // Seed lastSample once before first WaitingForPath LOS
    if(
      this.followRuntime.lastSampleX === 0 &&
      this.followRuntime.lastSampleY === 0 &&
      this.followRuntime.lastSampleZ === 0
    ){
      this.followRuntime.lastSampleX = owner.position.x;
      this.followRuntime.lastSampleY = owner.position.y;
      this.followRuntime.lastSampleZ = owner.position.z;
    }
    _followOffset.copy(GameState.PartyManager.GetFollowPosition(owner));
    const offset = _followOffset;

    // Retail retry loop; abort after stuck iterations → Reset
    let iterations = 0;
    let teleport = false;
    while(iterations < FOLLOW_STUCK_ITERATIONS){
      iterations++;
      const step = stepFollowLeaderState(
        this.followRuntime,
        owner,
        leader,
        offset,
        delta
      );
      if(step.teleport){
        teleport = true;
        break;
      }
      if(!step.continueInner) break;
    }

    if(teleport || this.followRuntime.state === FollowLeaderState.Teleport){
      this.softTeleportForward(owner, leader, offset);
      return ActionStatus.IN_PROGRESS;
    }

    if(isActivelyApproaching(this.followRuntime)){
      return ActionStatus.IN_PROGRESS;
    }

    // WaitDest / WaitingForPath — hold without clearing a pending path
    if(isFollowWaitState(this.followRuntime.state)){
      owner.force = 0;
      owner.speed = 0;
      owner.moveDirOverride = undefined;
      owner.clearLocomotionAnimation?.();
      return ActionStatus.IN_PROGRESS;
    }

    // Offset — continuous trail walk. Soft-park only after a short idle hold so
    // intermittent zero-step frames cannot restart AnimRun mid run↔pause blend
    // (frozen gait while SetPosition still advances = slide).
    if(this.followRuntime.state === FollowLeaderState.Offset){
      if(this.followRuntime.offsetStepped){
        this.followRuntime.offsetIdleTime = 0;
        return ActionStatus.IN_PROGRESS;
      }
      this.followRuntime.offsetIdleTime += Math.max(0, delta);
      owner.force = 0;
      owner.speed = 0;
      owner.moveDirOverride = undefined;
      if(this.followRuntime.offsetIdleTime >= 0.25){
        this.parkIdleSoft(owner);
      }
      this.lookAtLeader(owner, leader);
      return ActionStatus.IN_PROGRESS;
    }

    // Fallback idle
    this.parkIdle(owner);
    this.lookAtLeader(owner, leader);
    return ActionStatus.IN_PROGRESS;
  }

  /** Hard stop — solo / leave party / no leader. */
  private parkIdle(owner: ModuleCreature){
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.locomotionScale = 1;
    owner.moveDirOverride = undefined;
    owner.setComputedPath(undefined);
    owner.clearLocomotionAnimation?.();
    // Party members are not BumpFriends targets — soft-separate when idle
    partySoftSeparate(owner);
  }

  /**
   * Soft park when Offset sample has been stationary ≥0.25s — keep walkSpeedFactor
   * so the next Offset/Moving frame does not ramp from zero. Clear sticky run/walk
   * anim so companions do not moonwalk in place once truly parked on the follow sample.
   */
  private parkIdleSoft(owner: ModuleCreature){
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.moveDirOverride = undefined;
    owner.clearLocomotionAnimation?.();
    // Do not resetWalkSpeedFactor / setComputedPath
    partySoftSeparate(owner);
  }

  private lookAtLeader(owner: ModuleCreature, leader: ModuleCreature){
    const dx = leader.position.x - owner.position.x;
    const dy = leader.position.y - owner.position.y;
    if(dx * dx + dy * dy < 1e-8) return;
    const atan = Math.atan2(-dy, -dx);
    owner.setFacing(atan + Math.PI / 2, false, TURN_SPEED_FAST);
  }

  /**
   * Retail TeleportForward — advance one safe ring slot, seed the
   * walk sample, then enter MovingToPath (not JumpToPoint + WaitingForPath).
   * Jump only if the ring cannot catch up and the companion is still ≥15m out.
   */
  private softTeleportForward(
    owner: ModuleCreature,
    leader: ModuleCreature,
    offset: THREE.Vector3
  ){
    const dest = new THREE.Vector3();
    this.followRuntime.stuckTimer = 0;
    this.followRuntime.stuckCounter = 0;

    if(GameState.PartyManager.teleportFollowForward(owner, dest)){
      owner.force = 0;
      owner.speed = 0;
      owner.locomotionScale = 1;
      owner.moveDirOverride = undefined;
      owner.setComputedPath(undefined);
      if(typeof owner.setPosition === 'function'){
        owner.setPosition(dest);
      }else{
        owner.position.copy(dest);
      }
      this.followRuntime.lastSampleX = dest.x;
      this.followRuntime.lastSampleY = dest.y;
      this.followRuntime.lastSampleZ = dest.z;
      // Retail TeleportForward → state MovingToPath (2)
      this.followRuntime.state = FollowLeaderState.MovingToPath;
      return;
    }

    // Ring cannot advance — only hard-jump when still beyond teleport band
    const distLeader = Math.hypot(
      owner.position.x - leader.position.x,
      owner.position.y - leader.position.y
    );
    if(distLeader < FOLLOW_TELEPORT_DIST){
      this.followRuntime.state = FollowLeaderState.FindPath;
      return;
    }

    this.jumpToFollowOffset(owner, offset);
    this.followRuntime.state = FollowLeaderState.WaitingForPath;
  }

  /**
   * Last-resort JumpToPoint when TeleportForward cannot place a ring slot.
   */
  private jumpToFollowOffset(owner: ModuleCreature, offset: THREE.Vector3){
    const area = owner.area;
    const dest = new THREE.Vector3();
    dest.copy(offset);
    if(area?.getNearestWalkablePoint){
      dest.copy(area.getNearestWalkablePoint(offset, 0.5));
    }
    // Avoid Jump-to-self (cold GetFollowPosition === feet)
    const dx = dest.x - owner.position.x;
    const dy = dest.y - owner.position.y;
    if(dx * dx + dy * dy < 0.25){
      const leader = GameState.PartyManager.party[0];
      if(leader){
        dest.copy(leader.position);
        if(area?.getNearestWalkablePoint){
          dest.copy(area.getNearestWalkablePoint(leader.position, 1.5));
        }
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
