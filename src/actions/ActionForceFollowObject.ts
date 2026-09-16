import { GameState } from "@/GameState";
import { ActionParameterType } from "@/enums";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { partyFollowPath } from "@/engine/pathfinding/party-follow-path";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import * as THREE from "three";

import { isCreature } from "@/module/guards/isCreature";

const _followGoal = new THREE.Vector3();

/** Wait duration (0.25s). */
const FORCE_FOLLOW_WAIT = 0.25;
/** Party-member wait (0.1s). */
const FORCE_FOLLOW_WAIT_PARTY = 0.1;

/**
 * ActionForceFollowObject class.
 *
 * force-follow:
 * when outside range: front-load MoveTo + Wait + CheckForceFollow;
 * when in range: hold (IN_PROGRESS). Not a continuous tickCreatureWalk / walk tick SM.
 *
 * @file ActionForceFollowObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionForceFollowObject extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionForceFollowObject;

    //PARAMS
    // 0 - dword: oTarget (target object id to follow)
    // 1 - int: bRun (run vs walk)
    // 2 - float: vOffset.x (follow offset relative to target x)
    // 3 - float: vOffset.y (follow offset relative to target y)
    // 4 - int: bArrived (arrival status tracking flag)
    // 5 - float: vLastTargetPos.x (last recorded target position x)
    // 6 - float: vLastTargetPos.y (last recorded target position y)
  }

  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }

    this.target = this.getParameter<ModuleObject>(0);
    const fDistance = this.getParameter<number>(1) || 0.0;

    if(!isCreature(this.target)){
      return ActionStatus.FAILED;
    }

    if(this.target.isDead() || this.owner.isDead() || this.owner.isDebilitated()){
      return ActionStatus.ERROR;
    }

    // NWScript fFollowDistance; re-queue also uses GetFollowRange
    const scriptDist = fDistance > 0 ? fDistance : 0;
    const partyRange = partyFollowPath.getFollowRange?.() ?? 5.0;
    const followDistance = scriptDist > 0 ? scriptDist : partyRange;

    this.computeFollowGoal(this.owner, this.target, followDistance, _followGoal);
    const goal = _followGoal;
    const distGoal = Utility.Distance2D(this.owner.position, goal);
    // : GetFollowRange² vs |goal − follower|² (hold when inside)
    const holdRange = scriptDist > 0 ? followDistance : partyRange;

    if(distGoal <= holdRange){
      this.parkHold(this.owner);
      return ActionStatus.IN_PROGRESS;
    }

    // Outside range — AddMoveToFront + Wait + Check(0x37), then pop self
    this.enqueueCatchUp(this.owner, this.target, goal, holdRange);
    return ActionStatus.COMPLETE;
  }

  /**
   * order via successive AddActionToFront:
   * MoveTo → Wait → CheckForceFollow (re-enters ForceFollow).
   */
  private enqueueCatchUp(
    owner: ModuleCreature,
    followTarget: ModuleCreature,
    goal: THREE.Vector3,
    arriveRange: number
  ){
    const area = owner.area;
    let dest = goal.clone();
    if(area && typeof area.getNearestWalkablePoint === 'function'){
      dest = area.getNearestWalkablePoint(dest, getPathPersonalSpace(owner));
    }

    const isParty = typeof owner.isPartyMember === 'function'
      ? owner.isPartyMember()
      : (GameState.PartyManager?.party?.indexOf?.(owner) ?? -1) >= 0;
    const waitSec = isParty ? FORCE_FOLLOW_WAIT_PARTY : FORCE_FOLLOW_WAIT;

    const check = new GameState.ActionFactory.ActionCheckForceFollowObject(undefined, this.groupId);
    check.setParameter(0, ActionParameterType.DWORD, followTarget.id);
    check.setParameter(1, ActionParameterType.FLOAT, this.getParameter<number>(1) || arriveRange);

    const wait = new GameState.ActionFactory.ActionWait(undefined, this.groupId);
    wait.setParameter(0, ActionParameterType.FLOAT, waitSec);

    const move = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
    move.setParameter(0, ActionParameterType.FLOAT, dest.x);
    move.setParameter(1, ActionParameterType.FLOAT, dest.y);
    move.setParameter(2, ActionParameterType.FLOAT, dest.z);
    move.setParameter(3, ActionParameterType.DWORD, followTarget.area?.id ?? area?.id ?? 0);
    move.setParameter(4, ActionParameterType.DWORD, followTarget.id);
    move.setParameter(5, ActionParameterType.INT, 1); // run
    move.setParameter(6, ActionParameterType.FLOAT, Math.max(0.1, arriveRange * 0.5));
    move.setParameter(7, ActionParameterType.INT, 0);
    move.setParameter(8, ActionParameterType.FLOAT, 0);

    // Front-load in reverse execution order (Check last among the three)
    owner.actionQueue.addFront(check);
    owner.actionQueue.addFront(wait);
    owner.actionQueue.addFront(move);
  }

  /** Soft hold — do not clear walkSpeedFactor / Jump. */
  private parkHold(owner: ModuleCreature){
    owner.force = 0;
    owner.speed = 0;
    owner.walk = false;
    owner.moveDirOverride = undefined;
  }

  /**
   * Formation-style goal: party follow position when target is party leader;
   * else radial point at followDistance on the attacker side of the target.
   */
  private computeFollowGoal(
    owner: ModuleCreature,
    followTarget: ModuleCreature,
    followDistance: number,
    out: THREE.Vector3
  ): THREE.Vector3 {
    const party = GameState.PartyManager?.party;
    if(party?.[0] === followTarget && typeof GameState.PartyManager?.GetFollowPosition === 'function'){
      out.copy(GameState.PartyManager.GetFollowPosition(owner));
      return out;
    }

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

    const area = owner.area;
    if(area && typeof area.isPointWalkable === 'function' && !area.isPointWalkable(out)){
      if(typeof area.getNearestWalkablePoint === 'function'){
        out.copy(area.getNearestWalkablePoint(out, 0.05));
      }
    }
    return out;
  }

}
