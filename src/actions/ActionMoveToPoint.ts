import * as THREE from "three";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { Action } from "@/actions/Action";
import { Utility } from "@/utility/Utility";
import { GameState } from "@/GameState";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import type { ModuleObject } from "@/module/ModuleObject";
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import { getPathPersonalSpace } from "@/combat/attack-range";
import { isInUseRange } from "@/actions/use-range";
import { beginInterAreaPath } from "@/engine/pathfinding/inter-area-path";
import { WALK_BACK_DOT } from "@/engine/pathfinding/locomotion";
import {
  CreatureWalkResult,
  updateCreatureWalk,
} from "@/engine/pathfinding/update-creature-walk";
import {
  plotPath,
  PlotPathCode,
  type PathFindInfoLite,
} from "@/engine/pathfinding/plot-path";
import { findSafeLocation } from "@/engine/pathfinding/find-safe-location";
import {
  QuickWalkLocoState,
  setQuickWalkLocoState,
} from "@/engine/pathfinding/quick-walk-loco";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import type { ModuleCreature } from "@/module/ModuleCreature";

import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";

const _safeDest = new THREE.Vector3();

/**
 * Live-chase dest snap: safe location around target (r=20, require LOS).
 * On failure leave dest at the live target position.
 */
function snapLiveChaseDest(
  owner: ModuleCreature,
  live: THREE.Vector3
): THREE.Vector3 {
  const area = owner.area;
  _safeDest.copy(live);
  if(!area){
    return _safeDest.clone();
  }
  const ok = findSafeLocation(area, live, _safeDest, {
    radius: 20,
    requireLineOfSight: true,
    personalSpace: getPathPersonalSpace(owner),
    owner,
  });
  if(!ok){
    _safeDest.copy(live);
  }
  return _safeDest.clone();
}

/**
 * ActionMoveToPoint class.
 *
 * Move-to-point — path + creature walk update trapezoid stepping
 * (not a force-mover speed hack).
 *
 * @file ActionMoveToPoint.ts
 */
export class ActionMoveToPoint extends Action {

  target_position: THREE.Vector3 = new THREE.Vector3();
  real_target_position: THREE.Vector3 = new THREE.Vector3();

  /** Lite pathfind info — lastCode / endpoints for early-out. */
  pathFindInfo: PathFindInfoLite | undefined;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionMoveToPoint;

    //PARAMS
    // 0 - float: target x
    // 1 - float: target y
    // 2 - float: target z
    // 3 - dword: destination area object id
    // 4 - dword: target object id (or invalid)
    // 5 - int: packed flags (bit 0 = run, bit 1 = client path, bit 2 = timeout check, bit 3 = cutscene/direct walk, bit 9 = straight line, bit 10 = personal space)
    // 6 - float: arrival distance tolerance / range
    // 7 - int: client-side path id
    // 8 - float: timeout countdown in seconds (default 30.0; <=0 disables timeout / jump)
    // 9 - float: formation offset X
    // 10 - float: formation offset Y
    // 11 - dword: timeout expiration timestamp days
    // 12 - dword: timeout expiration timestamp ms
  }

  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner))
      return ActionStatus.FAILED;


    const destAreaId = this.getRawNumberParameter(3);
    const ownerAreaId = this.owner.area?.id;
    if(
      typeof destAreaId === 'number' &&
      typeof ownerAreaId === 'number' &&
      destAreaId !== ownerAreaId
    ){
      if(!this.owner.interAreaWaypoints?.length){
        beginInterAreaPath(this.owner, undefined, destAreaId);
      }
      if(this.owner.interAreaWaypoints?.length){
        const check = new GameState.ActionFactory.ActionCheckInterAreaPathfinding(undefined, this.groupId);
        this.owner.actionQueue.addFront(check);
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

    // Client resolve so KeepCorpse shells (removed from GetObjectById) still work
    // as use-range destinations for ActionUseObject → queueMoveIntoUseRange.
    const param4 = this.parameters[4];
    if(param4?.type === ActionParameterType.DWORD && typeof GameState.ModuleObjectManager?.GetClientObjectById === 'function'){
      this.target = GameState.ModuleObjectManager.GetClientObjectById(param4.value as number);
    }else{
      this.target = this.getParameter<ModuleObject>(4);
    }
    const chaseLive = !!(
      this.target &&
      isCreature(this.target) &&
      typeof this.target.isDead === 'function' &&
      !this.target.isDead()
    );
    // Use-object / MoveToObject set param-4 to the use target.
    // Walk-update use-range early-out stops locomotion once in range —
    // Move must complete then too, or OpenDoor/UseObject sit
    // behind a never-finishing Move (arrive + re-click to interact).
    const useRangeTarget = !!(
      this.target &&
      isObject(this.target)
    );

    if(useRangeTarget){
      if(chaseLive){
        this.real_target_position.copy(this.target.position);
      }

      // Use-object completion uses in-use-range (+ slack), not the
      // raw param-6 distance alone. Walk-update's use-range early-out can
      // freeze locomotion while dist is still slightly above param-6 — that left
      // end_m01aa k_pend_traskdl40 Pause→Move→Resume stuck forever, and the same
      // gap blocked door/placeable UseObject after walking into range.
      // Dead corpses / KeepCorpse shells are static use targets (not live chase).
      if(isInUseRange(this.owner, this.target) || Utility.Distance2D(this.owner.position, this.real_target_position) <= range){
        this.stopMoving(this.owner);
        this.setComputedPath(undefined);
        return ActionStatus.COMPLETE;
      }

      if(chaseLive){
        // Continuous live chase can last longer than the combat-state window (8s).
        // Refresh combat state while still closing on a living combat target so
        // clearing combat state does not wipe scheduled actions mid-approach.
        this.refreshCombatStateDuringChase(this.owner);
        const distanceToLive = Utility.Distance2D(this.owner.position, this.real_target_position);
        if(this.shouldRepathToMovingTarget(distanceToLive)){
          // In-place live chase — keep walkSpeedFactor (no COMPLETE / dispose)
          this.repathToLiveTargetInPlace();
        }
      }
    }

    if(!this.computedPath){
      const area = this.owner.area;
      if(area && typeof area.isPointWalkable === 'function' && !area.isPointWalkable(this.target_position)){
        this.target_position.copy(area.getNearestWalkablePoint(this.target_position, 0.05));
      }else if(area && typeof area.getNearestWalkablePoint === 'function' && typeof area.isPointWalkable !== 'function'){
        this.target_position.copy(area.getNearestWalkablePoint(this.target_position, 0.05));
      }
      this.calculatePath();
    }

    // Incomplete path continues; fail stops — no replot grace.
    if(this.pathFindInfo?.lastCode === PlotPathCode.Incomplete && !this.computedPath?.points?.length){
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.computedPath?.points?.length){
      this.stopMoving(this.owner);
      this.setComputedPath(undefined);
      return ActionStatus.FAILED;
    }

    const distance = Utility.Distance2D(this.owner.position, this.target_position);
    if(distance > (this.computedPath.points.length > 1 ? 0.5 : range)){
      let walkResult: CreatureWalkResult | undefined;

      const point = this.computedPath.points[0];
      if(point){
        const pointDistance = Utility.Distance2D(this.owner.position, point.vector);
        const arriveAtPoint = this.computedPath.points.length > 1 ? 0.5 : range;
        if(pointDistance > arriveAtPoint){
          walkResult = this.stepWalkUpdate(this.owner, point.vector, run, delta);
        }else{
          this.computedPath.pop();
          const next = this.computedPath.points[0];
          if(next){
            walkResult = this.stepWalkUpdate(this.owner, next.vector, run, delta);
          }
        }
      }

      if(walkResult === CreatureWalkResult.ARRIVED){
        this.consumeArrivedPathPoint(this.owner, range);
      }else if(walkResult === CreatureWalkResult.BLOCKED){
        this.syncBlockedComputedPath(this.owner);
      }

      // WalkUpdate may clear the this.owner path on hard block (6 fails) — sync leaves
      // computedPath undefined; skip timer until next frame replot.
      if(this.computedPath){
        if(this.computedPath.timer < 0){
          if(this.computedPath.realtime){
            this.setComputedPath(undefined);
          }
        }else{
          this.computedPath.timer -= 10*delta;
        }
      }

      // Timeout 0 = no jump fallback; >0 = force-move countdown.
      const moveTimeout = this.getParameter<number>(8);
      if(typeof moveTimeout === 'number' && moveTimeout > 0){
        const timeout = moveTimeout - delta;
        if(timeout <= 0){
          this.stopMoving(this.owner);
          // Timeout expired — jump to the destination.
          const fallback_action = new GameState.ActionFactory.ActionJumpToPoint(undefined, this.groupId);
          fallback_action.setParameter(0, ActionParameterType.FLOAT, this.real_target_position.x);
          fallback_action.setParameter(1, ActionParameterType.FLOAT, this.real_target_position.y);
          fallback_action.setParameter(2, ActionParameterType.FLOAT, this.real_target_position.z);
          fallback_action.setParameter(3, ActionParameterType.DWORD, this.owner.area?.id ?? 0);
          fallback_action.setParameter(4, ActionParameterType.INT, 0);
          fallback_action.setParameter(5, ActionParameterType.FLOAT, 20.0);
          fallback_action.setParameter(6, ActionParameterType.FLOAT, 0);
          fallback_action.setParameter(7, ActionParameterType.FLOAT, 0);
          this.owner.actionQueue.addFront(fallback_action);
          return ActionStatus.FAILED;
        }
        this.setParameter(8, ActionParameterType.FLOAT, timeout);
      }

      return ActionStatus.IN_PROGRESS;
    }else{
      if(chaseLive){
        if(!isInUseRange(this.owner, this.target)){
          const liveDist = Utility.Distance2D(this.owner.position, this.target.position);
          if(liveDist > range){
            // Arrived at stale path end but live target still out — repath in place
            this.repathToLiveTargetInPlace();
            if(this.computedPath?.points?.length){
              const next = this.computedPath.points[0];
              if(next){
                this.stepWalkUpdate(this.owner, next.vector, run, delta);
              }
              return ActionStatus.IN_PROGRESS;
            }
          }
        }
      }
      this.stopMoving(this.owner);
      this.setComputedPath(undefined);
      return ActionStatus.COMPLETE;
    }
  }

  /**
   * creature walk update step toward the next waypoint.
   */
  private stepWalkUpdate(
    owner: ModuleCreature,
    goal: THREE.Vector3,
    run: boolean,
    delta: number
  ): CreatureWalkResult {
    owner.walk = !run;
    owner.force = 0;

    let remaining = this.pathRemaining(owner);
    // Live chase: ease against distance-to-target−arrive so SQRT engages earlier
    if(
      this.target &&
      isCreature(this.target)
    ){
      const range = this.getParameter<number>(6) || 0.1;
      const liveGap = Math.max(
        0,
        Utility.Distance2D(owner.position, this.target.position) - range
      );
      remaining = Math.max(remaining, liveGap);
    }

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

    return updateCreatureWalk(owner, goal, run, delta, {
      remainingDistance: remaining,
      allowWalkBack,
      useRangeTargetId: this.pathFindInfo?.targetObjectId,
    });
  }

  private consumeArrivedPathPoint(owner: ModuleCreature, range: number): void {
    const point = this.computedPath?.points?.[0];
    if(!point) return;
    const arriveAtPoint = (this.computedPath?.points?.length ?? 0) > 1 ? 0.5 : range;
    if(Utility.Distance2D(owner.position, point.vector) <= arriveAtPoint){
      this.computedPath.pop();
    }
  }

  private syncBlockedComputedPath(owner: ModuleCreature): void {
    const ownerPath = owner.getComputedPath?.();
    if(ownerPath !== this.computedPath){
      this.computedPath = ownerPath;
    }
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
    // Clear physics + walk/run anim.
    owner.clearLocomotionState(false);
    // Mark locomotion paused at end of path.
    setQuickWalkLocoState(owner, QuickWalkLocoState.Paused);
  }

  shouldRepathToMovingTarget(distanceToLive: number): boolean {
    if(!this.target || !isCreature(this.target)){
      return false;
    }
    const storedToLive = Utility.Distance2D(this.target_position, this.real_target_position);
    if(storedToLive < 0.001) return false;
    const threshold = Math.max(2.0, distanceToLive * 0.4);
    return storedToLive > threshold;
  }

  /**
   * Keep combat state alive during continuous live chase so the 8s timer
   * does not clear attacks / remove actions mid-approach.
   */
  private refreshCombatStateDuringChase(owner: ModuleObject): void {
    if(!isCreature(owner)){
      return;
    }
    if(!owner.combatData?.combatState){
      return;
    }
    const chase = this.target;
    if(!chase || (isCreature(chase) && chase.isDead())){
      return;
    }
    const data = owner.combatData;
    const roundActionTarget = owner.combatRound?.action?.target;
    const isCombatChase =
      data.lastAttackTarget === chase ||
      data.lastAttemptedAttackTarget === chase ||
      data.lastSpellTarget === chase ||
      data.lastAttemptedSpellTarget === chase ||
      roundActionTarget === chase ||
      owner.combatRound?.newAttackTarget === chase;
    if(!isCombatChase){
      return;
    }
    // Refresh combat-state timer only — do not re-run full engaged setup each tick.
    if(typeof owner.setCombatState === 'function'){
      owner.setCombatState(true);
    }else{
      owner.combatStateTimer = 8000;
    }
  }

  /**
   * Update dest + replot on the same action — preserves walkSpeedFactor.
   * Used instead of COMPLETE → enqueueMoveToLiveTarget for ordinary chase drift.
   */
  repathToLiveTargetInPlace(){
    if(!this.target || !isCreature(this.owner) || !this.owner.area) return;

    const dest = snapLiveChaseDest(this.owner, this.real_target_position);

    this.target_position.copy(dest);
    this.setParameter(0, ActionParameterType.FLOAT, dest.x);
    this.setParameter(1, ActionParameterType.FLOAT, dest.y);
    this.setParameter(2, ActionParameterType.FLOAT, dest.z);
    // Creature-target drift past threshold → mark for repath.
    setQuickWalkLocoState(this.owner, QuickWalkLocoState.Repath);
    // Clear path only — do not stopMoving / clearLocomotionState
    this.setComputedPath(undefined);
    if(this.pathFindInfo){
      this.pathFindInfo.dest.copy(dest);
      this.pathFindInfo.origin.copy(this.owner.position);
    }
    this.calculatePath();
    // After replot, resume ordinary path walk
    if(this.computedPath?.points?.length){
      setQuickWalkLocoState(this.owner, QuickWalkLocoState.PathWalk);
    }
  }

  enqueueMoveToLiveTarget(range: number, moveFlags: number){
    if(!this.target || !isCreature(this.owner) || !this.owner.area) return;

    const dest = snapLiveChaseDest(this.owner, this.real_target_position);

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
    if(!isCreature(this.owner)) return;

    const area = this.owner?.area;
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

    const destAreaId = this.getRawNumberParameter(3);
    if(typeof destAreaId === 'number'){
      this.pathFindInfo.destAreaId = destAreaId;
    }
    const liveTargetId = this.getRawNumberParameter(4);
    if(typeof liveTargetId === 'number' && liveTargetId > 0){
      this.pathFindInfo.targetObjectId = liveTargetId;
    }else if(this.target?.id){
      this.pathFindInfo.targetObjectId = this.target.id;
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

    path.fixWalkEdges(
      this.owner.pathFindApproachPersonalSpace > 0
        ? this.owner.pathFindApproachPersonalSpace
        : getPathPersonalSpace(this.owner)
    );
    path.setColor(this.owner.helperColor);
    this.setComputedPath(path);
    setQuickWalkLocoState(this.owner, QuickWalkLocoState.PathWalk);
  }

  private getRawNumberParameter(index: number): number | undefined {
    const value = this.parameters[index]?.value;
    return typeof value === 'number' ? value : undefined;
  }

}
