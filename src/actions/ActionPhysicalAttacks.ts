import { CombatRound } from "@/combat/CombatRound";
import {
  desiredAttackRange,
  getAttackMoveArriveRange,
  getCreaturePersonalSpace,
  getPathPersonalSpace,
  hasCombatLineOfSight,
  maxAttackRange,
} from "@/combat/attack-range";
import { resolveDuelRoundFlags } from "@/combat/combat-dueling";
import { resolveAttackPauseMs } from "@/combat/combat-round-pause";
import { duelLog, duelWho } from "@/combat/duel-debug";
import { hasTargetBeenDetected } from "@/combat/nearest-enemy";
import { tryStuckLosRetarget } from "@/combat/initialize-new-attack-target";
import { getNearestActionPoint } from "@/combat/nearest-action-point";
import { ModuleObjectConstant, SSFType } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import * as THREE from 'three';
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";
import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";
import {
  testDirectLine,
  TestDirectLineCode,
} from "@/engine/pathfinding/test-direct-line";

export type MeleeBackoffResult = {
  position: THREE.Vector3;
  clippedDesired: number;
  clear: boolean;
};

/**
 * ActionPhysicalAttacks class.
 *
 * physical-attack action:
 * MaxAttackRange for "too far", DesiredAttackRange for melee arrive /
 * too-close. Move arrive = ranged ? max : desired.
 * Approach (too far / no LOS): AddActionToFront PhysicalAttacks →
 * CheckMoveToObjectRadius → ChangeFacingObject → MoveToPoint (target origin
 * or door/placeable action point). No surround/openSpot picker.
 * NPC melee too-close: radial backoff Move only (arrive 0).
 * Duel: ResolveChoreographedState / ResolveEngagedState / ResolveMasterState
 * + StartCombatRound pair sync.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionPhysicalAttacks.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionPhysicalAttacks extends Action {

  /** NPC melee backoff latch — leave only when dist² ≥ desired². */
  private meleeBackoffActive = false;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionPhysicalAttacks;

    //PARAMS
    // 0 - int: bResultsCalculated (cutscene precomputed attack flag)
    // 1 - dword: oTarget (target object id)
    // 2 - int: nActionType (CombatActionType)
    // 3 - int: nAnimationIndex (animation state id)
    // 4 - int: nAnimationLength (animation duration in milliseconds)
    // 5 - int: nNumAttacks (number of attack swings)
    // 6 - int: nFeatId (feat id used in attack, 0 if normal)
    // 7 - int: nAttackAnimation (precomputed attack animation index)
    // 8 - int: nAttackResult (precomputed attack result enum)
    // 9 - int: nAttackDamage (precomputed attack damage amount)
  }

  static resolveMeleeTooCloseHysteresis(
    distSq: number,
    desiredSq: number,
    active: boolean
  ): { tooClose: boolean; active: boolean } {
    if(active){
      const tooClose = distSq < desiredSq;
      return { tooClose, active: tooClose };
    }
    if(distSq < desiredSq - 0.2){
      return { tooClose: true, active: true };
    }
    return { tooClose: false, active: false };
  }

  static getMeleeBackoffIdeal(
    attacker: ModuleCreature,
    target: ModuleObject,
    desired: number
  ): THREE.Vector3 {
    const dx = attacker.position.x - target.position.x;
    const dy = attacker.position.y - target.position.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1.0;
    return new THREE.Vector3(
      target.position.x + (dx / len) * desired,
      target.position.y + (dy / len) * desired,
      attacker.position.z
    );
  }

  static getMeleeBackoffPosition(
    attacker: ModuleCreature,
    target: ModuleObject,
    desired: number
  ): THREE.Vector3 {
    return ActionPhysicalAttacks.resolveMeleeBackoff(attacker, target, desired).position;
  }

  static resolveMeleeBackoff(
    attacker: ModuleCreature,
    target: ModuleObject,
    desired: number
  ): MeleeBackoffResult {
    const ideal = ActionPhysicalAttacks.getMeleeBackoffIdeal(attacker, target, desired);
    const area = attacker.area;
    if(!area){
      return { position: ideal, clippedDesired: desired, clear: true };
    }

    const perspace = getPathPersonalSpace(attacker);
    const ignoreIds: number[] = [];
    if(attacker.id != null) ignoreIds.push(attacker.id);
    if(target.id != null) ignoreIds.push(target.id);

    const hit = testDirectLine(area, attacker.position, ideal, {
      owner: attacker,
      personalSpace: perspace,
      checkCreatures: true,
      ignoreCreatureIds: ignoreIds,
      collectHitInfo: true,
    });
    if(hit.ok || hit.code === TestDirectLineCode.Ok){
      return { position: ideal, clippedDesired: desired, clear: true };
    }

    let clear = hit.clearPoint.clone();
    if(typeof area.getNearestWalkablePoint === 'function'){
      clear = area.getNearestWalkablePoint(clear, perspace);
    }
    const clippedDesired = Math.hypot(
      target.position.x - clear.x,
      target.position.y - clear.y
    );
    return {
      position: clear,
      clippedDesired: clippedDesired > 0 ? clippedDesired : desired,
      clear: false,
    };
  }

  update(delta: number = 0): ActionStatus {
    
    this.target = this.getParameter<ModuleObject>(1);

    if(!isObject(this.target)){
      return ActionStatus.FAILED;
    }

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }


    this.owner.resetExcitedDuration();

    // physical-attack action — load params 0/7/8/9 onto current action
    const combatRound = this.owner.combatRound;
    if(combatRound?.action){
      const resultsCalculated = !!this.getParameter<number>(0);
      if(resultsCalculated){
        combatRound.action.resultsCalculated = true;
        combatRound.action.attackAnimation = this.getParameter<number>(7) | 0;
        combatRound.action.attackResult = this.getParameter<number>(8) as any;
        combatRound.action.attackDamage = this.getParameter<number>(9) | 0;
      }
    }

    if(this.target.isDead()){
      // Always tear down / retarget — even when roundStarted is already false
      // (remaining sched swings at a corpse must not block QueueAttackActions).
      if(this.owner.combatRound){
        this.owner.combatRound.endCombatRound();
      }
      return ActionStatus.FAILED;
    }

    // HasTargetBeenDetected — doors/placeables always; creatures need SEEN
    // (CutsceneAttack does NOT skip detection/range — only ResolveAttackRoll/Damage short-circuit)
    if(!hasTargetBeenDetected(this.owner, this.target)){
      return ActionStatus.FAILED;
    }

    // ResolveChoreographedState — drives Desired/MaxAttackRange (not engaged)
    const duel = resolveDuelRoundFlags(this.owner, this.target);
    const choreographed = duel.choreographed;
    const desired = desiredAttackRange(this.owner, this.target, choreographed);
    const max = maxAttackRange(this.owner, this.target, choreographed);
    const dist = Utility.Distance2D(this.owner.position, this.target.position);
    const distSq = dist * dist;
    const maxSq = max * max;
    const desiredSq = desired * desired;

    // : too far OR (too close by desired²−0.2 when not party-ui) OR no LOS
    // Hysteresis: enter at desired²−0.2, stay until dist² ≥ desired²
    const tooFar = distSq > maxSq;
    const isPartyMember = GameState.PartyManager.party.indexOf(this.owner) >= 0;
    let tooClose = false;
    if(!isPartyMember && !this.owner.isRangedEquipped()){
      const latch = ActionPhysicalAttacks.resolveMeleeTooCloseHysteresis(
        distSq,
        desiredSq,
        this.meleeBackoffActive
      );
      tooClose = latch.tooClose;
      this.meleeBackoffActive = latch.active;
    }
    const hasLos = hasCombatLineOfSight(this.owner, this.target, max);
    // Retail: too far OR (NPC melee too close) OR no LOS → approach/backoff move
    const needCloseOrBack =
      tooFar ||
      (tooClose && !isPartyMember && !this.owner.isRangedEquipped()) ||
      !hasLos;

    if(needCloseOrBack){
      // Stuck-LOS retarget only when standing still with blocked LOS (before move).
      if(!hasLos && !tooFar && !(tooClose && !isPartyMember && !this.owner.isRangedEquipped())){
        this.owner.force = 0;
        this.owner.speed = 0;
        const result = tryStuckLosRetarget(this.owner, this.target, this);
        if(result === 'cancelled'){
          return ActionStatus.COMPLETE;
        }
        if(result === 'retargeted'){
          return ActionStatus.IN_PROGRESS;
        }
        // 'waiting' — first stuck sample; still path toward target (retail).
      }

      const isBackoff = tooClose && !tooFar && !isPartyMember && !this.owner.isRangedEquipped();
      let arriveRange = getAttackMoveArriveRange(this.owner, this.target, choreographed);
      let target_position = getNearestActionPoint(this.target, this.owner.position, this.owner);

      if(isBackoff){
        // Too close: DesiredAttackRange back-off + TestDirectLine / CWalkHitInfo clip
        const backoff = ActionPhysicalAttacks.resolveMeleeBackoff(this.owner, this.target, desired);
        target_position = backoff.position;
        arriveRange = 0;
        this.owner.pathFindApproachPersonalSpace = 0;
        this.owner.pathFindIgnoreObjectId = 0;
      }else{
        // Approach: creature origin / door-placeable action point — no attacker
        // perspace shove (retail uses pathfind field3 + Move arrive instead).
        if(isCreature(this.target)){
          this.owner.pathFindIgnoreObjectId = this.target.id;
          this.owner.pathFindApproachPersonalSpace = Math.max(
            0,
            desired - getCreaturePersonalSpace(this.target)
          );
        }else{
          this.owner.pathFindIgnoreObjectId = this.target.id;
          this.owner.pathFindApproachPersonalSpace = 0;
        }
      }

      // AddActionToFront order → execute: Move → Facing → Check → PhysicalAttacks
      const requeue = new GameState.ActionFactory.ActionPhysicalAttacks(undefined, this.groupId);
      for(let i = 0; i <= 9; i++){
        const p = this.parameters[i];
        if(p){
          requeue.setParameter(i, p.type, p.value);
        }
      }
      requeue.isUserAction = this.isUserAction;
      this.owner.actionQueue.addFront(requeue);

      if(!isBackoff){
        const ranged = this.owner.isRangedEquipped() ? 1 : 0;
        const check = new GameState.ActionFactory.ActionCheckMoveToObjectRadius(undefined, this.groupId);
        check.setParameter(0, ActionParameterType.DWORD, this.target.id);
        check.setParameter(1, ActionParameterType.INT, 1);
        check.setParameter(2, ActionParameterType.FLOAT, arriveRange);
        check.setParameter(3, ActionParameterType.FLOAT, max);
        check.setParameter(4, ActionParameterType.INT, 1);
        check.setParameter(5, ActionParameterType.INT, 0);
        check.setParameter(6, ActionParameterType.INT, ranged);
        this.owner.actionQueue.addFront(check);

        const face = new GameState.ActionFactory.ActionChangeFacingObject(undefined, this.groupId);
        face.setParameter(0, ActionParameterType.DWORD, this.target.id);
        this.owner.actionQueue.addFront(face);
      }

      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, target_position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, target_position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, target_position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, this.target.area?.id ?? this.owner.area?.id ?? 0);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, isBackoff ? ModuleObjectConstant.OBJECT_INVALID : this.target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, arriveRange);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      this.owner.actionQueue.addFront(actionMoveToTarget);

      return ActionStatus.COMPLETE;
    }

    if(this.owner.combatRound){
      this.owner.combatRound.losStuckPosition = undefined;
    }
    this.owner.pathFindApproachPersonalSpace = 0;

    this.owner.force = 0;
    this.owner.speed = 0;

    if(!combatRound){
      return ActionStatus.FAILED;
    }

    // physical-attack action — round_paused early return
    // before duel resolution. Infinite-paused duel slaves wait here and never
    // resolve their own swing while the master drives the round.
    if(combatRound.roundPaused){
      duelLog(this.owner, 'wait:roundPaused', {
        infinite: combatRound.infinitePause,
        pausedBy: duelWho(combatRound.roundPausedBy),
        engaged: combatRound.engaged,
        master: combatRound.master,
      });
      return ActionStatus.IN_PROGRESS;
    }

    const featId = combatRound.action?.featId || 0;

    const pauseMs = resolveAttackPauseMs(
      this.getParameter<number>(4),
      combatRound.action?.animationTime,
      CombatRound.ROUND_LENGTH
    );

    duelLog(this.owner, 'duel-flags', {
      target: duelWho(this.target),
      choreographed: duel.choreographed,
      engaged: duel.engaged,
      master: duel.master,
      duelingAnim: duel.useDuelingAnim,
      cutscene: !!combatRound.action?.resultsCalculated,
    });

    // CutsceneAttack (resultsCalculated) uses the same engaged/master/slave
    // path as normal attacks — never forces them non-engaged.
    if(!duel.engaged){
      // Non-duel: StartCombatRound(target, engaged=0, master)
      duelLog(this.owner, 'branch:non-engaged-start', { target: duelWho(this.target) });
      combatRound.startCombatRound(this.target, false, duel.master, featId);
      if(combatRound.action){
        combatRound.action.animation = ModuleCreatureAnimState.ATTACK;
      }
      combatRound.pauseRound(this.owner, pauseMs);
    }else if(duel.master){
      // Engaged master: start both rounds; slave paused with infinitePause
      duelLog(this.owner, 'branch:master-start', { slave: duelWho(this.target) });
      combatRound.startCombatRound(this.target, true, true, featId);
      if(combatRound.action){
        combatRound.action.animation = duel.useDuelingAnim
          ? ModuleCreatureAnimState.ATTACK_DUELING
          : ModuleCreatureAnimState.ATTACK;
      }
      combatRound.pauseRound(this.owner, pauseMs);

      if(this.target.combatRound){
        this.target.combatRound.startCombatRound(this.owner, true, false, 0);
        if(this.target.combatRound.action){
          this.target.combatRound.action.animation = duel.useDuelingAnim
            ? ModuleCreatureAnimState.ATTACK_DUELING
            : ModuleCreatureAnimState.ATTACK;
        }
        // SetPauseTimer(slave, …, infinitePause=1) while master drives
        this.target.combatRound.pauseRound(this.owner, pauseMs, true);
      }
    }else{
      // Engaged slave: master already StartCombatRound'd us — just ensure anim
      if(combatRound.action){
        combatRound.action.animation = duel.useDuelingAnim
          ? ModuleCreatureAnimState.ATTACK_DUELING
          : ModuleCreatureAnimState.ATTACK;
      }
      if(!combatRound.roundStarted){
        // Master hasn't synced yet — wait
        duelLog(this.owner, 'branch:slave-wait-master', { master: duelWho(this.target) });
        return ActionStatus.IN_PROGRESS;
      }
      duelLog(this.owner, 'branch:slave-resolve', { master: duelWho(this.target) });
      combatRound.pauseRound(this.owner, pauseMs);
    }

    if(combatRound.roundStarted){

      if(isObject(combatRound.newAttackTarget)){
        combatRound.setAttackTarget(combatRound.newAttackTarget);
        this.setParameter(1, ActionParameterType.DWORD, combatRound.newAttackTarget.id);
        this.target = combatRound.newAttackTarget;
        combatRound.newAttackTarget = undefined;
      }

      duelLog(this.owner, 'resolve-attack', {
        target: duelWho(this.target),
        cutscene: !!combatRound.action?.resultsCalculated,
      });
      combatRound.calculateAttackDamage(this.owner, combatRound.action);

      this.owner.setFacing(
        Math.atan2(
          this.owner.position.y - this.target.position.y,
          this.owner.position.x - this.target.position.x
        ) + Math.PI/2,
        false,
        TURN_SPEED_FAST
      );

      const attack_sound = THREE.MathUtils.randInt(0, 2);
      switch(attack_sound){
        case 1:
          this.owner.playSoundSet(SSFType.ATTACK_2);
        break;
        case 2:
          this.owner.playSoundSet(SSFType.ATTACK_3);
        break;
        default:
          this.owner.playSoundSet(SSFType.ATTACK_1);
        break;
      }

      return ActionStatus.COMPLETE;
    }

    return ActionStatus.IN_PROGRESS;
  }

}
