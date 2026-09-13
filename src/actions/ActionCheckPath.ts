import * as THREE from "three";
import { Action } from "@/actions/Action";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { getPathPersonalSpace } from "@/combat/attack-range";
import {
  advanceInterAreaWaypoint,
  beginInterAreaPath,
  excludeFailedInterAreaPortal,
  tryUseInterAreaTransition,
} from "@/engine/pathfinding/inter-area-path";
import { findAwayVector } from "@/engine/pathfinding/find-away-vector";
import { canPathToPoint } from "@/engine/pathfinding/can-path-to";
import { isInUseRange } from "@/actions/use-range";
import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";

/**
 * ActionCheckPath — path-validation ActionTypes.
 * Runtime movement pathfinds inside MoveToPoint; these enqueue the
 * corresponding move when params resolve so ActionList/scripts behave correctly.
 *
 * @file ActionCheckPath.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionCheckPath extends Action {

  constructor( type: ActionType, actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = type;
  }

  protected ownerIsValid(): this is this & { owner: ModuleCreature } {
    if(!isCreature(this.owner)){
      return false;
    }
    if(this.owner.isDead?.() || this.owner.isDebilitated?.()){
      return false;
    }
    return true;
  }

  protected clampWalkable(x: number, y: number, z: number): THREE.Vector3 {
    const point = new THREE.Vector3(x, y, z);
    const area = this.owner?.area;
    if(!area?.getNearestWalkablePoint){
      return point;
    }
    const pathRadius = getPathPersonalSpace(this.owner);
    return area.getNearestWalkablePoint(point, pathRadius);
  }

  protected queueMoveTo(
    x: number, y: number, z: number,
    areaId: number,
    targetId: number,
    range: number,
    timeout: number = 30.0,
    bRun: number = 1,
    validatePath: boolean = true
  ): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.ERROR;
    }
    const ownerAreaId = this.owner.area?.id;
    // Foreign area → inter-area path (do not validate local walkmesh to remote coords)
    if(
      typeof areaId === 'number' &&
      typeof ownerAreaId === 'number' &&
      areaId !== ownerAreaId
    ){
      if(!this.owner.interAreaWaypoints?.length){
        beginInterAreaPath(this.owner, undefined, areaId);
      }
      if(this.owner.interAreaWaypoints?.length){
        const check = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, this.groupId);
        this.owner.actionQueue.addFront(check);
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.ERROR;
    }
    const walked = this.clampWalkable(x, y, z);
    if(validatePath){
      if(!canPathToPoint(this.owner, walked)){
        return ActionStatus.ERROR;
      }
    }
    const action = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
    action.setParameter(0, ActionParameterType.FLOAT, walked.x);
    action.setParameter(1, ActionParameterType.FLOAT, walked.y);
    action.setParameter(2, ActionParameterType.FLOAT, walked.z);
    action.setParameter(3, ActionParameterType.DWORD, areaId);
    action.setParameter(4, ActionParameterType.DWORD, targetId);
    action.setParameter(5, ActionParameterType.INT, bRun ? 1 : 0);
    action.setParameter(6, ActionParameterType.FLOAT, range > 0 ? range : 1.0);
    action.setParameter(7, ActionParameterType.INT, 0);
    action.setParameter(8, ActionParameterType.FLOAT, timeout);
    this.owner.actionQueue.addFront(action);
    return ActionStatus.COMPLETE;
  }

  protected queueMoveToObject(target: ModuleObject, range: number, bRun: number = 1, timeout: number = 30.0): ActionStatus {
    if(!this.ownerIsValid()){
      return ActionStatus.ERROR;
    }
    if(!isObject(target)){
      return ActionStatus.ERROR;
    }
    if(isCreature(target) && target.isDead()){
      return ActionStatus.ERROR;
    }
    return this.queueMoveTo(
      target.position.x,
      target.position.y,
      target.position.z,
      target.area?.id ?? this.owner.area?.id ?? 0,
      target.id,
      range,
      timeout,
      bRun
    );
  }

  update(delta: number = 0): ActionStatus {
    return ActionStatus.COMPLETE;
  }

}

export class ActionCheckMoveToObject extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckMoveToObject, actionId, groupId);

    //PARAMS
    // 0 - dword: oTarget (target object id)
    // 1 - int: bRun (run vs walk)
  }

  update(delta: number = 0): ActionStatus {
    const target = this.getParameter<ModuleObject>(0);
    const range = this.getParameter<number>(1) || 1.0;
    const bRun = typeof this.getParameter<number>(2) === 'number' ? (this.getParameter<number>(2) ? 1 : 0) : 1;
    return this.queueMoveToObject(target, range, bRun);
  }
}

export class ActionCheckMoveAwayFromObject extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckMoveAwayFromObject, actionId, groupId);

    //PARAMS
    // 0 - dword: oTarget (object id to flee from)
    // 1 - int: bRun (run vs walk)
    // 2 - float: fRange (flee distance threshold)
    // 3 - int: nRetries (remaining pathfinding retries)
  }

  update(delta: number = 0): ActionStatus {
    if(!this.ownerIsValid()){
      return ActionStatus.ERROR;
    }
    const fleeFrom = this.getParameter<ModuleObject>(0);
    const range = this.getParameter<number>(1) || 10.0;
    const bRun = this.getParameter<number>(2) ? 1 : 0;
    // retry counter (param often 5–10); default 5
    let retries = this.getParameter<number>(3);
    if(typeof retries !== 'number') retries = 5;

    if(!isObject(fleeFrom)){
      return ActionStatus.ERROR;
    }
    // Same-area gate 
    if(fleeFrom.area && this.owner.area && fleeFrom.area !== this.owner.area){
      return ActionStatus.COMPLETE;
    }

    const dx = this.owner.position.x - fleeFrom.position.x;
    const dy = this.owner.position.y - fleeFrom.position.y;
    const dz = this.owner.position.z - fleeFrom.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    if(distSq >= range * range || retries < 1){
      return ActionStatus.COMPLETE;
    }

    const away = findAwayVector(this.owner, fleeFrom.position, range);
    if(!canPathToPoint(this.owner, away)){
      return ActionStatus.ERROR;
    }

    // AddActionToFront order → final queue: Wait, Move, Recheck
    const recheck = new GameState.ActionFactory.ActionCheckMoveAwayFromObject(undefined, this.groupId);
    recheck.setParameter(0, ActionParameterType.DWORD, fleeFrom.id);
    recheck.setParameter(1, ActionParameterType.FLOAT, range);
    recheck.setParameter(2, ActionParameterType.INT, bRun);
    recheck.setParameter(3, ActionParameterType.INT, retries - 1);
    this.owner.actionQueue.addFront(recheck);

    this.queueMoveTo(
      away.x, away.y, away.z,
      this.owner.area?.id ?? 0,
      ModuleObjectConstant.OBJECT_INVALID,
      1.0,
      30.0,
      bRun,
      false
    );

    const wait = new GameState.ActionFactory.ActionWait(undefined, this.groupId);
    wait.setParameter(0, ActionParameterType.FLOAT, 0.75);
    this.owner.actionQueue.addFront(wait);
    return ActionStatus.COMPLETE;
  }
}

/**
 * : inter-area pathfinding check action
 * Advances inter-area waypoint list; SetIntraAreaGoal → MoveTo + Wait(0.75).
 * When in use-range of the portal: OpenDoor / LoadModule / JumpTo linked.
 */
export class ActionCheckInterAreaPathfinding extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckInterAreaPathfinding, actionId, groupId);

    //PARAMS
    // none (uses creature CPathfindInformation)
  }

  update(delta: number = 0): ActionStatus {
    if(!this.ownerIsValid()){
      return ActionStatus.ERROR;
    }

    // Prefer explicit inter-area waypoints (PlotInterAreaPath seed)
    let wp = this.owner.interAreaWaypoints?.[0];
    if(!wp){
      if(!beginInterAreaPath(this.owner)){
        // Fall back to local computedPath hop
        const path = this.owner.getComputedPath?.() || this.computedPath;
        if(!path || !path.points || path.points.length < 2){
          return ActionStatus.ERROR;
        }
        const next = path.points[0];
        if(!next?.vector){
          return ActionStatus.ERROR;
        }
        const hop = this.queueMoveTo(
          next.vector.x,
          next.vector.y,
          next.vector.z,
          this.owner.area?.id ?? 0,
          ModuleObjectConstant.OBJECT_INVALID,
          0.5,
          30.0,
          0,
          false
        );
        if(hop === ActionStatus.ERROR){
          return ActionStatus.ERROR;
        }
        const waitLocal = new GameState.ActionFactory.ActionWait(undefined, this.groupId);
        waitLocal.setParameter(0, ActionParameterType.FLOAT, 0.75);
        this.owner.actionQueue.addFront(waitLocal);
        return ActionStatus.COMPLETE;
      }
      wp = this.owner.interAreaWaypoints[0];
    }else if(this.owner.interAreaWaypoints.length >= 2){
      wp = advanceInterAreaWaypoint(this.owner);
    }

    if(!wp?.goal){
      this.owner.interAreaWaypoints = [];
      return ActionStatus.ERROR;
    }

    // In range of portal → open / transit / jump (last hop or mid-hop door)
    if(wp.object && isInUseRange(this.owner, wp.object)){
      if(tryUseInterAreaTransition(this.owner, wp, this.groupId)){
        return ActionStatus.COMPLETE;
      }
      // PlotInterAreaPath: exclude failed portal + recompute
      if(excludeFailedInterAreaPortal(this.owner, wp.object.id)){
        const recheck = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, this.groupId);
        this.owner.actionQueue.addFront(recheck);
        return ActionStatus.COMPLETE;
      }
      this.owner.interAreaWaypoints = [];
      return ActionStatus.ERROR;
    }

    // Add*ToFront order → final: Wait, Move, Recheck
    const recheck = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, this.groupId);
    this.owner.actionQueue.addFront(recheck);

    const toDoor = this.queueMoveTo(
      wp.goal.x,
      wp.goal.y,
      wp.goal.z,
      this.owner.area?.id ?? 0,
      wp.object?.id ?? ModuleObjectConstant.OBJECT_INVALID,
      wp.range || 0.5,
      30.0,
      0,
      false
    );
    if(toDoor === ActionStatus.ERROR){
      // Path to this portal blocked — exclude and try another 
      if(wp.object && excludeFailedInterAreaPortal(this.owner, wp.object.id)){
        const retry = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, this.groupId);
        this.owner.actionQueue.addFront(retry);
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.ERROR;
    }

    const wait = new GameState.ActionFactory.ActionWait(undefined, this.groupId);
    wait.setParameter(0, ActionParameterType.FLOAT, 0.75);
    this.owner.actionQueue.addFront(wait);

    return ActionStatus.COMPLETE;
  }
}

export class ActionCheckMoveToPoint extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckMoveToPoint, actionId, groupId);

    //PARAMS
    // 0 - float: target x
    // 1 - float: target y
    // 2 - float: target z
    // 3 - dword: target area object id
    // 4 - dword: target object id (or 0x7f000000)
    // 5 - int: bRun (run vs walk)
  }

  update(delta: number = 0): ActionStatus {
    if(!this.ownerIsValid()){
      return ActionStatus.ERROR;
    }
    const x = this.getParameter<number>(0);
    const y = this.getParameter<number>(1);
    const z = this.getParameter<number>(2);
    if(typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number'){
      return ActionStatus.ERROR;
    }
    const areaId = this.getParameter<number>(3) ?? this.owner.area?.id ?? 0;
    const ownerAreaId = this.owner.area?.id ?? 0;
    // Destination in another area → seed inter-area waypoints + CheckInterArea
    if(areaId !== ownerAreaId){
      if(!this.owner.interAreaWaypoints?.length){
        beginInterAreaPath(this.owner, undefined, areaId);
      }
      if(this.owner.interAreaWaypoints?.length){
        const check = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, this.groupId);
        this.owner.actionQueue.addFront(check);
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.ERROR;
    }
    const range = this.getParameter<number>(6) || 1.0;
    const timeout = this.getParameter<number>(8) || 30.0;
    const bRunParam = this.getParameter<number>(5);
    const bRun = typeof bRunParam === 'number' ? (bRunParam ? 1 : 0) : 1;
    return this.queueMoveTo(x, y, z, areaId, ModuleObjectConstant.OBJECT_INVALID, range, timeout, bRun);
  }
}

export class ActionCheckMoveToObjectRadius extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckMoveToObjectRadius, actionId, groupId);

    //PARAMS
    // 0 - dword: oTarget (target object id)
    // 1 - int: bRun (run vs walk)
    // 2 - float: fRange (target arrival distance)
    // 3 - float: fTolerance (arrival tolerance / range slack)
    // 4 - int: bWalkStraight (straight line check flag)
    // 5 - int: bIgnoreOrientation (ignore orientation flag)
    // 6 - int: nPersonalSpace (personal space padding)
  }

  update(delta: number = 0): ActionStatus {
    const target = this.getParameter<ModuleObject>(0);
    const range = this.getParameter<number>(1) || 1.0;
    return this.queueMoveToObject(target, range);
  }
}

export class ActionCheckMoveToPointRadius extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckMoveToPointRadius, actionId, groupId);

    //PARAMS
    // 0 - float: target x
    // 1 - float: target y
    // 2 - float: target z
    // 3 - dword: target area object id
    // 4 - dword: target object id
    // 5 - int: bRun (run vs walk)
    // 6 - float: fRange (target arrival distance)
    // 7 - int: nPersonalSpace (personal space padding)
  }

  update(delta: number = 0): ActionStatus {
    if(!this.ownerIsValid()){
      return ActionStatus.ERROR;
    }
    const x = this.getParameter<number>(0);
    const y = this.getParameter<number>(1);
    const z = this.getParameter<number>(2);
    if(typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number'){
      return ActionStatus.ERROR;
    }
    const areaId = this.getParameter<number>(3) ?? this.owner.area?.id ?? 0;
    const ownerAreaId = this.owner.area?.id ?? 0;
    if(areaId !== ownerAreaId){
      if(!this.owner.interAreaWaypoints?.length){
        beginInterAreaPath(this.owner, undefined, areaId);
      }
      if(this.owner.interAreaWaypoints?.length){
        const check = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, this.groupId);
        this.owner.actionQueue.addFront(check);
        return ActionStatus.COMPLETE;
      }
      return ActionStatus.ERROR;
    }
    const range = this.getParameter<number>(6) || 1.0;
    return this.queueMoveTo(x, y, z, areaId, ModuleObjectConstant.OBJECT_INVALID, range);
  }
}

export class ActionCheckMoveAwayFromLocation extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckMoveAwayFromLocation, actionId, groupId);

    //PARAMS
    // 0 - float: threat location x
    // 1 - float: threat location y
    // 2 - float: threat location z
    // 3 - int: bRun (run vs walk)
    // 4 - float: fRange (flee distance threshold)
    // 5 - int: nRetries (remaining pathfinding retries)
  }

  update(delta: number = 0): ActionStatus {
    if(!this.ownerIsValid()){
      return ActionStatus.ERROR;
    }
    const x = this.getParameter<number>(0);
    const y = this.getParameter<number>(1);
    const z = this.getParameter<number>(2);
    if(typeof x !== 'number' || typeof y !== 'number'){
      return ActionStatus.ERROR;
    }
    const range = this.getParameter<number>(3) || 10.0;
    const bRun = this.getParameter<number>(4) ? 1 : 0;
    const threatZ = typeof z === 'number' ? z : this.owner.position.z;
    const threat = new THREE.Vector3(x, y, threatZ);

    const dx = this.owner.position.x - x;
    const dy = this.owner.position.y - y;
    const dz = this.owner.position.z - threatZ;
    const distSq = dx * dx + dy * dy + dz * dz;
    if(distSq >= range * range){
      return ActionStatus.COMPLETE;
    }

    const away = findAwayVector(this.owner, threat, range);
    if(!canPathToPoint(this.owner, away)){
      return ActionStatus.ERROR;
    }

    // : re-queue Check, MoveTo, Wait → final Wait, Move, Recheck
    const recheck = new GameState.ActionFactory.ActionCheckMoveAwayFromLocation(undefined, this.groupId);
    recheck.setParameter(0, ActionParameterType.FLOAT, x);
    recheck.setParameter(1, ActionParameterType.FLOAT, y);
    recheck.setParameter(2, ActionParameterType.FLOAT, threatZ);
    recheck.setParameter(3, ActionParameterType.FLOAT, range);
    recheck.setParameter(4, ActionParameterType.INT, bRun);
    this.owner.actionQueue.addFront(recheck);

    this.queueMoveTo(
      away.x, away.y, away.z,
      this.owner.area?.id ?? 0,
      ModuleObjectConstant.OBJECT_INVALID,
      1.0,
      30.0,
      bRun,
      false
    );

    const wait = new GameState.ActionFactory.ActionWait(undefined, this.groupId);
    wait.setParameter(0, ActionParameterType.FLOAT, 0.75);
    this.owner.actionQueue.addFront(wait);
    return ActionStatus.COMPLETE;
  }
}

export class ActionCheckForceFollowObject extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckForceFollowObject, actionId, groupId);

    //PARAMS
    // 0 - dword: oTarget (target object id to follow)
    // 1 - int: bRun (run vs walk)
    // 2 - float: offset x
    // 3 - float: offset y
  }

  update(delta: number = 0): ActionStatus {
    if(!this.ownerIsValid()){
      return ActionStatus.ERROR;
    }
    const target = this.getParameter<ModuleObject>(0);
    const distance = this.getParameter<number>(1) || 2.0;
    if(!isObject(target)){
      return ActionStatus.ERROR;
    }
    if(isCreature(target) && target.isDead()){
      return ActionStatus.ERROR;
    }
    const follow = new GameState.ActionFactory.ActionForceFollowObject(undefined, this.groupId);
    follow.setParameter(0, ActionParameterType.DWORD, target.id);
    follow.setParameter(1, ActionParameterType.FLOAT, distance);
    this.owner.actionQueue.addFront(follow);
    return ActionStatus.COMPLETE;
  }
}

export class ActionCheckMoveToFollowRadius extends ActionCheckPath {
  constructor( actionId: number = -1, groupId: number = -1 ){
    super(ActionType.ActionCheckMoveToFollowRadius, actionId, groupId);

    //PARAMS
    // 0 - float: target x
    // 1 - float: target y
    // 2 - float: target z
    // 3 - dword: target area object id
    // 4 - dword: target object id
    // 5 - int: bRun (run vs walk)
    // 6 - float: fRange (follow distance radius)
  }

  update(delta: number = 0): ActionStatus {
    const target = this.getParameter<ModuleObject>(0);
    const range = this.getParameter<number>(1) || 2.0;
    return this.queueMoveToObject(target, range);
  }
}
