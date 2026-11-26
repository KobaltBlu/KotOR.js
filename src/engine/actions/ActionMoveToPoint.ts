import * as THREE from "three";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { Action } from "@engine/actions/Action";
import { Utility } from "@core/utility/Utility";
import { GameState } from "@engine/runtime/GameState";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import type { GameObject } from "@engine/module/GameObject";
import { TURN_SPEED_FAST } from "@engine/movement/TurnSpeeds";
import { getPathPersonalSpace } from "@engine/combat/attack-range";
import { isInUseRange } from "@engine/actions/use-range";
import { beginInterAreaPath } from "@engine/pathfinding/inter-area-path";
import { WALK_BACK_DOT } from "@engine/pathfinding/locomotion";
import {
  CreatureWalkResult,
  tickCreatureWalk,
} from "@engine/pathfinding/tick-creature-walk";
import {
  buildWalkPath,
  WalkPathCode,
  type PathFindInfoLite,
} from "@engine/pathfinding/build-walk-path";
import {
  dropWalkmeshBlockedPathPrefix,
  findWalkClearDetour,
  isWalkmeshEdgeWalkClear,
  isWalkmeshHopBlocked,
  pathHopsAreWalkClear,
} from "@engine/pathfinding/path-hops-clear";
import { ComputedPath } from "@engine/pathfinding/ComputedPath";
import { findOpeningDoorOnLine } from "@engine/pathfinding/door-opening";
import { findOpenWalkLocation } from "@engine/pathfinding/open-walk-location";
import { isSafeWalkPoint } from "@engine/pathfinding/safe-walk-point";
import { ensureSafeStandingPosition } from "@engine/pathfinding/ensure-safe-standing";
import {
  CreatureLocoState,
  setCreatureLocoState,
} from "@engine/pathfinding/creature-loco";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import type { Creature } from "@engine/module/Creature";

import { isCreature } from "@engine/module/guards/isCreature";
import { isGameObject } from "@engine/module/guards/isGameObject";

const _safeDest = new THREE.Vector3();

/** Min seconds between jam repath+detour attempts on one ActionMoveToPoint. */
const JAM_REPATH_COOLDOWN_S = 0.5;

/**
 * Live-chase dest snap: safe location around target (r=20, require LOS).
 * On failure leave dest at the live target position.
 */
function snapLiveChaseDest(
  owner: Creature,
  live: THREE.Vector3
): THREE.Vector3 {
  const area = owner.area;
  _safeDest.copy(live);
  if(!area){
    return _safeDest.clone();
  }
  const ok = findOpenWalkLocation(area, live, _safeDest, {
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
 * PreferWalkable / tiny 0.05 snaps can leave a dest on a walk face whose
 * capsule overlaps NonWalk. Ring-search a capsule-safe dest nearby.
 */
function snapCapsuleSafeDest(
  owner: Creature,
  dest: THREE.Vector3
): void {
  const area = owner.area;
  if(!area) return;
  if(isSafeWalkPoint(area, dest, owner)) return;
  const perspace = getPathPersonalSpace(owner) || 0.5;
  if(
    findOpenWalkLocation(area, dest, _safeDest, {
      radius: Math.max(2, perspace * 2),
      personalSpace: perspace,
      owner,
    })
  ){
    dest.copy(_safeDest);
  }
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

  /**
   * Seconds remaining before the next jam repath+detour is allowed.
   * Throttles escapeWalkmeshJam so blocked creatures do not replot every tick.
   */
  jamRepathCooldown = 0;

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

    if(this.jamRepathCooldown > 0){
      this.jamRepathCooldown = Math.max(0, this.jamRepathCooldown - delta);
    }


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
    if(param4?.type === ActionParameterType.DWORD && typeof GameState.GameObjectManager?.GetClientObjectById === 'function'){
      this.target = GameState.GameObjectManager.GetClientObjectById(param4.value as number);
    }else{
      this.target = this.getParameter<GameObject>(4);
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
      isGameObject(this.target)
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

    if(!this.computedPath?.points?.length){
      const area = this.owner.area;
      // Fresh plot only — Incomplete resume must not re-snap endpoints every
      // frame (jitters dest and forces traverseToPoint to restart).
      if(this.pathFindInfo?.lastCode !== WalkPathCode.Incomplete){
        if(area && typeof area.isPointWalkable === 'function' && !area.isPointWalkable(this.target_position)){
          this.target_position.copy(area.getNearestWalkablePoint(this.target_position, 0.05));
        }else if(area && typeof area.getNearestWalkablePoint === 'function' && typeof area.isPointWalkable !== 'function'){
          this.target_position.copy(area.getNearestWalkablePoint(this.target_position, 0.05));
        }
        snapCapsuleSafeDest(this.owner, this.target_position);
      }
      this.calculatePath();
    }

    // Incomplete mid-plot (budget / smooth resume): keep trying next tick.
    // Empty-but-truthy computedPath must not skip replot (walk-in-place bug).
    if(this.pathFindInfo?.lastCode === WalkPathCode.Incomplete && !this.computedPath?.points?.length){
      this.pauseWalkInPlace(this.owner);
      return ActionStatus.IN_PROGRESS;
    }

    // A door on the way that is already being opened (typically by the same
    // script that queued this move) is not a reason to give up: replot next
    // tick once it has opened.
    if(
      !this.computedPath?.points?.length &&
      findOpeningDoorOnLine(this.owner.area, this.owner.position, this.target_position)
    ){
      this.pauseWalkInPlace(this.owner);
      return ActionStatus.IN_PROGRESS;
    }

    if(!this.computedPath?.points?.length){
      // Poison / unreachable plot — try walk-clear ring detour before failing.
      if(this.tryWalkClearDetour(this.owner) && this.computedPath?.points?.length){
        // Fall through to walk the detour path this frame.
      }else{
        this.stopMoving(this.owner);
        this.setComputedPath(undefined);
        return ActionStatus.FAILED;
      }
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
        // null = keep walking; COMPLETE / FAILED (undefined) = terminal
        const blockedStatus = this.handleWalkmeshBlocked(
          this.owner,
          range,
          useRangeTarget
        );
        if(blockedStatus !== null){
          return blockedStatus;
        }
      }

      // tickCreatureWalk / walk tick may clear the this.owner path on hard block (6 fails) — sync leaves
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
    owner: Creature,
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

    return tickCreatureWalk(owner, goal, run, delta, {
      remainingDistance: remaining,
      allowWalkBack,
      useRangeTargetId: this.pathFindInfo?.targetObjectId,
    });
  }

  /**
   * Hold still while pathfinding resumes — clear walk cycle / speed without
   * failing the action or running full stopMoving recovery.
   */
  private pauseWalkInPlace(owner: Creature): void {
    owner.force = 0;
    owner.speed = 0;
    owner.walkSpeedFactor = 0;
    owner.moveDirOverride = undefined;
    owner.setAnimationState?.(ModuleCreatureAnimState.PAUSE);
  }

  private consumeArrivedPathPoint(owner: Creature, range: number): void {
    const point = this.computedPath?.points?.[0];
    if(!point) return;
    const arriveAtPoint = (this.computedPath?.points?.length ?? 0) > 1 ? 0.5 : range;
    if(Utility.Distance2D(owner.position, point.vector) <= arriveAtPoint){
      this.computedPath.pop();
    }
  }

  private syncBlockedComputedPath(owner: Creature): void {
    const ownerPath = owner.getComputedPath?.();
    if(ownerPath !== this.computedPath){
      this.computedPath = ownerPath;
    }
  }

  /**
   * Walkmesh / stale-hop recovery after drive BLOCKED.
   * Creature blocks are handled inside tickCreatureWalk (hex / fail count);
   * this recovers when the next path hop is not walk-line clear.
   *
   * @returns `null` to keep walking; `COMPLETE` / `FAILED` to stop the action.
   * (`FAILED` is `undefined` in ActionStatus — do not use undefined as continue.)
   */
  private handleWalkmeshBlocked(
    owner: Creature,
    range: number,
    useRangeTarget: boolean
  ): ActionStatus | null {
    this.syncBlockedComputedPath(owner);

    // Already in arrive / use range — complete even if path is poisoned.
    if(useRangeTarget && this.target && isGameObject(this.target)){
      if(
        isInUseRange(owner, this.target) ||
        Utility.Distance2D(owner.position, this.real_target_position) <= range
      ){
        this.stopMoving(owner);
        this.setComputedPath(undefined);
        return ActionStatus.COMPLETE;
      }
    }else if(Utility.Distance2D(owner.position, this.target_position) <= range){
      this.stopMoving(owner);
      this.setComputedPath(undefined);
      return ActionStatus.COMPLETE;
    }

    // tickCreatureWalk may have cleared the path (creature hex / 6 fails).
    if(!this.computedPath?.points?.length){
      return this.escapeWalkmeshJam(owner);
    }

    const area = owner.area;
    const next = this.computedPath.points[0]?.vector;
    if(!area || !next){
      return this.escapeWalkmeshJam(owner);
    }

    const blockingTimer = owner.blockingTimer | 0;
    if(!isWalkmeshHopBlocked(area, owner.position, next, owner, blockingTimer)){
      return null;
    }

    dropWalkmeshBlockedPathPrefix(
      area,
      owner.position,
      this.computedPath,
      owner,
      blockingTimer
    );

    const still = this.computedPath?.points?.[0]?.vector;
    if(
      !still ||
      isWalkmeshHopBlocked(area, owner.position, still, owner, blockingTimer)
    ){
      return this.escapeWalkmeshJam(owner);
    }
    return null;
  }

  /**
   * Repath from current position; if the first hop is still walkmesh-blocked
   * (or plot fails), ring-search a walk-clear detour. No escape → FAILED.
   * Throttled to at most once per {@link JAM_REPATH_COOLDOWN_S} so a stuck
   * creature does not spend a full path plan every tick.
   *
   * @returns `null` if a usable path was installed (or cooldown holds);
   *          otherwise `FAILED`.
   */
  private escapeWalkmeshJam(owner: Creature): ActionStatus | null {
    if(this.jamRepathCooldown > 0){
      // Keep blocked state; try again after cooldown.
      return null;
    }
    this.jamRepathCooldown = JAM_REPATH_COOLDOWN_S;

    this.repathFromCurrentPosition();

    const area = owner.area;
    const next = this.computedPath?.points?.[0]?.vector;
    const blockingTimer = owner.blockingTimer | 0;
    if(
      next &&
      area &&
      !isWalkmeshHopBlocked(area, owner.position, next, owner, blockingTimer)
    ){
      return null;
    }

    if(this.tryWalkClearDetour(owner)){
      return null;
    }

    this.stopMoving(owner);
    this.setComputedPath(undefined);
    return ActionStatus.FAILED;
  }

  /**
   * Ring-search a walk-clear intermediate and install a validated two-leg path
   * owner → detour → real destination. Does not mutate action destination params.
   * Off-walkmesh origins get a synthetic escape hop onto the detour.
   */
  private tryWalkClearDetour(owner: Creature): boolean {
    const area = owner.area;
    if(!area) return false;

    const realDest = this.target_position.clone();
    const detour = findWalkClearDetour(
      area,
      owner.position,
      realDest,
      owner
    );
    if(!detour) return false;

    const originOffMesh =
      typeof area.isPointWalkable === "function" &&
      !area.isPointWalkable(owner.position);

    let leg1Path: ComputedPath | undefined;
    if(originOffMesh){
      // Drive soft-start can leave the mesh; force the first waypoint onto the
      // rebased walkable / ring detour so buildWalkPath hop-clear does not kill recovery.
      leg1Path = ComputedPath.FromVector3List([detour.clone()]);
    }else{
      const leg1Info: PathFindInfoLite = {
        ownerId: owner.id,
        origin: owner.position.clone(),
        dest: detour.clone(),
        replot: true,
      };
      const leg1 = buildWalkPath(area, owner, leg1Info);
      if(leg1.code !== WalkPathCode.Ready || !leg1.path?.points?.length){
        return false;
      }
      leg1Path = leg1.path;
    }

    const leg2Info: PathFindInfoLite = {
      ownerId: owner.id,
      origin: detour.clone(),
      dest: realDest.clone(),
      replot: true,
    };
    const leg2 = buildWalkPath(area, owner, leg2Info);
    let leg2Path: ComputedPath | undefined =
      leg2.code === WalkPathCode.Ready && leg2.path?.points?.length
        ? leg2.path
        : undefined;
    if(!leg2Path){
      // Graph plot can Fail with NonWalk chords even when the straight
      // detour → dest chord is face-walkable — prefer the direct hop.
      if(
        Utility.Distance2D(detour, realDest) > 0.5 &&
        isWalkmeshEdgeWalkClear(area, detour, realDest, owner)
      ){
        leg2Path = ComputedPath.FromVector3List([realDest.clone()]);
      }else if(Utility.Distance2D(detour, realDest) > 0.5){
        // Detour may itself be the destination (nearest walkable clear to dest).
        return false;
      }
    }

    const merged = typeof leg1Path.clone === "function"
      ? leg1Path.clone()
      : leg1Path;
    if(leg2Path?.points?.length){
      if(typeof merged.merge === "function"){
        merged.merge(leg2Path);
      }else{
        return false;
      }
    }

    // Drop leading origin duplicates so the first hop is the detour.
    while(merged.points.length > 1){
      const first = merged.points[0]?.vector;
      if(!first) break;
      if(Utility.Distance2D(owner.position, first) > 0.05) break;
      merged.pop();
    }

    if(!merged.points?.length){
      return false;
    }

    // Narrow-corridor escape: validate and drive with personalSpace 0 so
    // doorway chords that are face-walkable are not rejected by appearance pad.
    owner.pathFindDrivePersonalSpace = 0;

    // Full hop-clear from an off-mesh start always fails; leg2 already validated
    // the on-mesh remainder when present.
    if(
      !originOffMesh &&
      !pathHopsAreWalkClear(area, owner.position, merged, owner)
    ){
      owner.pathFindDrivePersonalSpace = -1;
      return false;
    }

    // Keep pathFindInfo aimed at the real attack / move destination.
    if(!this.pathFindInfo){
      this.pathFindInfo = {
        ownerId: owner.id,
        origin: owner.position.clone(),
        dest: realDest.clone(),
      };
    }else{
      this.pathFindInfo.ownerId = owner.id;
      this.pathFindInfo.origin.copy(owner.position);
      this.pathFindInfo.dest.copy(realDest);
      this.pathFindInfo.replot = false;
      this.pathFindInfo.lastCode = WalkPathCode.Ready;
      this.pathFindInfo.lastOrigin = owner.position.clone();
      this.pathFindInfo.lastDest = realDest.clone();
    }

    const perspace = owner.pathFindApproachPersonalSpace > 0
      ? owner.pathFindApproachPersonalSpace
      : getPathPersonalSpace(owner);
    merged.fixWalkEdges?.(perspace);
    merged.setColor?.(owner.helperColor);
    this.setComputedPath(merged);
    setCreatureLocoState(owner, CreatureLocoState.PathWalk);
    if(originOffMesh){
      return true;
    }
    return !isWalkmeshHopBlocked(
      area,
      owner.position,
      merged.points[0].vector,
      owner,
      owner.blockingTimer | 0
    );
  }

  /**
   * Clear poisoned path and replot from the creature's current position.
   */
  private repathFromCurrentPosition(): void {
    if(!isCreature(this.owner)) return;
    setCreatureLocoState(this.owner, CreatureLocoState.Repath);
    this.setComputedPath(undefined);
    if(this.pathFindInfo){
      this.pathFindInfo.replot = true;
      this.pathFindInfo.origin.copy(this.owner.position);
      this.pathFindInfo.dest.copy(this.target_position);
      this.pathFindInfo.lastCode = undefined;
      this.pathFindInfo.lastOrigin = undefined;
      this.pathFindInfo.lastDest = undefined;
    }
    this.calculatePath();
    if(this.computedPath?.points?.length){
      setCreatureLocoState(this.owner, CreatureLocoState.PathWalk);
    }
  }

  private pathRemaining(owner: Creature): number {
    const pts = this.computedPath?.points;
    if(!pts?.length) return 0;
    let remaining = Utility.Distance2D(owner.position, pts[0].vector);
    for(let i = 1; i < pts.length; i++){
      remaining += Utility.Distance2D(pts[i - 1].vector, pts[i].vector);
    }
    return remaining;
  }

  private stopMoving(owner: Creature){
    // Clear physics + walk/run anim.
    owner.clearLocomotionState(false);
    // Drop narrow-corridor escape override.
    owner.pathFindDrivePersonalSpace = -1;
    // Mark locomotion paused at end of path.
    setCreatureLocoState(owner, CreatureLocoState.Paused);
    // PreferWalkable path ends can leave feet on a walk face inside the
    // wall buffer — recover so WASD can leave the stand.
    ensureSafeStandingPosition(owner);
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
  private refreshCombatStateDuringChase(owner: GameObject): void {
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
      owner.combatRound?.attackTarget === chase ||
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
    setCreatureLocoState(this.owner, CreatureLocoState.Repath);
    // Clear path only — do not stopMoving / clearLocomotionState
    this.setComputedPath(undefined);
    if(this.pathFindInfo){
      this.pathFindInfo.dest.copy(dest);
      this.pathFindInfo.origin.copy(this.owner.position);
    }
    this.calculatePath();
    // After replot, resume ordinary path walk
    if(this.computedPath?.points?.length){
      setCreatureLocoState(this.owner, CreatureLocoState.PathWalk);
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

    // The "endpoints unchanged" early-out keeps the caller's current path, so it
    // is only valid while there is one (the walk tick clears it on a body-block).
    if(!this.computedPath?.points?.length){
      this.pathFindInfo.replot = true;
    }

    const result = buildWalkPath(area, this.owner, this.pathFindInfo);

    if(result.code === WalkPathCode.Fail){
      this.setComputedPath(undefined);
      return;
    }

    // Ready without path — early-out; keep existing computedPath
    if(result.code === WalkPathCode.Ready && !result.path){
      return;
    }

    const path = result.path;
    if(!path){
      this.setComputedPath(undefined);
      return;
    }

    // Empty Incomplete (budget / DFS stub): do not drive a stay-put hop.
    // Mid-smooth Incomplete often already has a full polyline — discarding it
    // forced traverse+smooth every loco frame (live tar_m02ac droid/woman spin).
    if(result.code === WalkPathCode.Incomplete && !path.points?.length){
      this.setComputedPath(undefined);
      return;
    }

    // Ready or driveable Incomplete (mid-smooth / mid-DFS): ship points without
    // pathHopsAreWalkClear — that plot-grade check was re-run every stuck frame.
    path.fixWalkEdges(
      this.owner.pathFindApproachPersonalSpace > 0
        ? this.owner.pathFindApproachPersonalSpace
        : getPathPersonalSpace(this.owner)
    );
    path.setColor(this.owner.helperColor);
    this.setComputedPath(path);
    setCreatureLocoState(this.owner, CreatureLocoState.PathWalk);

    // Face-clear plot hops can still fail appearance personal-space in narrow
    // corridors (doorways) — allow drive to match the plot face-clear bar.
    const first = path.points[0]?.vector;
    if(
      first &&
      isWalkmeshHopBlocked(area, this.owner.position, first, this.owner, 0)
    ){
      this.owner.pathFindDrivePersonalSpace = 0;
    }
  }

  private getRawNumberParameter(index: number): number | undefined {
    const value = this.parameters[index]?.value;
    return typeof value === 'number' ? value : undefined;
  }

}
