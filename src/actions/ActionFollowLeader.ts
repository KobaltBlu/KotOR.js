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
    _followOffset.copy(GameState.PartyManager.GetFollowPosition(owner));
    const offset = _followOffset;

    // Retail do/while (iVar14 == 1) with field11 abort → Reset
    let iterations = 0;
    let teleport = false;
    while(iterations < FOLLOW_STUCK_ITERATIONS){
      iterations++;
      const step = stepFollowLeaderState(
        this.followRuntime,
        owner,
        leader,
        offset,
        delta,
        (d, g, face) => this.runCreatureAvoidance(d, g, face)
      );
      if(step.teleport){
        teleport = true;
        break;
      }
      if(!step.continueInner) break;
    }

    if(teleport || this.followRuntime.state === FollowLeaderState.Teleport){
      this.teleportToOffset(owner, offset);
      this.followRuntime.state = FollowLeaderState.WaitingForPath;
      this.followRuntime.stuckTimer = 0;
      this.followRuntime.stuckCounter = 0;
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

    // Offset / Idle — soft-separate + look at leader (retail LookAt when step≈0)
    this.parkIdle(owner);
    this.lookAtLeader(owner, leader);
    return ActionStatus.IN_PROGRESS;
  }

  private parkIdle(owner: ModuleCreature){
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.locomotionScale = 1;
    owner.moveDirOverride = undefined;
    owner.setComputedPath(undefined);
    owner.clearLocomotionAnimation?.();
    // Party field426 creatures aren't BumpFriends targets — soft-separate when idle
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
