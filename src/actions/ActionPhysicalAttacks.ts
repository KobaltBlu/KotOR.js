import { CombatRound } from "@/combat/CombatRound";
import {
  desiredAttackRange,
  getAttackMoveArriveRange,
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
import { resolveMeleeBackoff, resolveMeleeTooCloseHysteresis } from "@/combat/melee-backoff";
import { ModuleObjectConstant, ModuleObjectType, SSFType } from "@/enums";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { BitWise } from "@/utility/BitWise";
import { Utility } from "@/utility/Utility";
import { Action } from "@/actions/Action";
import * as THREE from 'three';
import { TURN_SPEED_FAST } from "@/engine/TurnSpeeds";

/**
 * ActionPhysicalAttacks class.
 *
 * Retail AIActionPhysicalAttacks @ 005bbbf0:
 * MaxAttackRange for "too far", DesiredAttackRange for melee arrive /
 * too-close. Move arrive = ranged ? max : desired.
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
    // 0 - resultsCalculated (INT) — retail CutsceneAttack precomputed flag
    // 1 - Target (DWORD)
    // 2 - actionType (INT)
    // 3 - AnimationIndex (INT)
    // 4 - AnimationLength (INT)
    // 5 - numAttacks (INT)
    // 6 - featId (INT)
    // 7 - attackAnimation row (INT) when resultsCalculated
    // 8 - attackResult (INT) when resultsCalculated
    // 9 - attackDamage (INT) when resultsCalculated
  }

  update(delta: number = 0): ActionStatus {
    
    this.target = this.getParameter<ModuleObject>(1);

    if(!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleObject)){
      return ActionStatus.FAILED;
    }

    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as any;
    const target: ModuleCreature = this.target as any;

    owner.resetExcitedDuration();

    // Retail AIActionPhysicalAttacks @ 005bbbf0 — load params 0/7/8/9 onto current action
    const combatRound = owner.combatRound;
    if(combatRound?.action){
      const resultsCalculated = !!this.getParameter<number>(0);
      if(resultsCalculated){
        combatRound.action.resultsCalculated = true;
        combatRound.action.attackAnimation = this.getParameter<number>(7) | 0;
        combatRound.action.attackResult = this.getParameter<number>(8) as any;
        combatRound.action.attackDamage = this.getParameter<number>(9) | 0;
      }
    }

    if(typeof (target as any).isDead === 'function' && target.isDead()){
      // Always tear down / retarget — even when roundStarted is already false
      // (remaining sched swings at a corpse must not block CreateNewAttackActions).
      if(owner.combatRound){
        owner.combatRound.endCombatRound();
      }
      return ActionStatus.FAILED;
    }

    // Retail HasTargetBeenDetected @ 005b48f0 — doors/placeables always; creatures need SEEN
    // (CutsceneAttack does NOT skip detection/range — only ResolveAttackRoll/Damage short-circuit)
    if(!hasTargetBeenDetected(owner, target)){
      return ActionStatus.FAILED;
    }

    // Retail ResolveChoreographedState — drives Desired/MaxAttackRange (not engaged)
    const duel = resolveDuelRoundFlags(owner, target);
    const choreographed = duel.choreographed;
    const desired = desiredAttackRange(owner, target, choreographed);
    const max = maxAttackRange(owner, target, choreographed);
    const dist = Utility.Distance2D(owner.position, target.position);
    const distSq = dist * dist;
    const maxSq = max * max;
    const desiredSq = desired * desired;

    // Retail: too far OR (too close by desired²−0.2 when not party-ui) OR no LOS
    // Hysteresis: enter at desired²−0.2, stay until dist² ≥ desired²
    const tooFar = distSq > maxSq;
    const isPartyMember = GameState.PartyManager.party.indexOf(owner) >= 0;
    let tooClose = false;
    if(!isPartyMember && !owner.isRangedEquipped()){
      const latch = resolveMeleeTooCloseHysteresis(
        distSq,
        desiredSq,
        this.meleeBackoffActive
      );
      tooClose = latch.tooClose;
      this.meleeBackoffActive = latch.active;
    }
    const hasLos = hasCombatLineOfSight(owner, target, max);
    const needCloseOrBack =
      tooFar || (tooClose && !isPartyMember && !owner.isRangedEquipped());

    if(needCloseOrBack){
      let arriveRange = getAttackMoveArriveRange(owner, target, choreographed);
      let target_position = getNearestActionPoint(target, owner.position, owner);

      // Too close: DesiredAttackRange back-off + TestDirectLine / CWalkHitInfo clip
      if(tooClose && !tooFar){
        const backoff = resolveMeleeBackoff(owner, target, desired);
        target_position = backoff.position;
        arriveRange = 0;
      }else if(owner.area?.getNearestWalkablePoint){
        target_position = owner.area.getNearestWalkablePoint(
          target_position,
          getPathPersonalSpace(owner)
        );
      }

      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, target_position.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, target_position.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, target_position.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, target.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, tooClose && !tooFar ? ModuleObjectConstant.OBJECT_INVALID : target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, arriveRange);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      owner.actionQueue.addFront(actionMoveToTarget);

      return ActionStatus.IN_PROGRESS;
    }

    // In range but ClearLineOfSight blocked — retail may retarget via GetNearestEnemy
    // when the attacker has been standing still (stuck) at the same position.
    if(!hasLos){
      owner.force = 0;
      owner.speed = 0;
      const result = tryStuckLosRetarget(owner, target, this);
      if(result === 'cancelled'){
        return ActionStatus.COMPLETE;
      }
      // retargeted or waiting — keep PhysicalAttacks alive
      return ActionStatus.IN_PROGRESS;
    }

    if(owner.combatRound){
      owner.combatRound.losStuckPosition = undefined;
    }

    owner.force = 0;
    owner.speed = 0;

    if(!combatRound){
      return ActionStatus.FAILED;
    }

    // Retail AIActionPhysicalAttacks @ 005bbbf0 — round_paused early return
    // before duel resolution. Infinite-paused duel slaves wait here and never
    // resolve their own swing while the master drives the round.
    if(combatRound.roundPaused){
      duelLog(owner, 'wait:roundPaused', {
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

    duelLog(owner, 'duel-flags', {
      target: duelWho(target),
      choreographed: duel.choreographed,
      engaged: duel.engaged,
      master: duel.master,
      duelingAnim: duel.useDuelingAnim,
      cutscene: !!combatRound.action?.resultsCalculated,
    });

    // CutsceneAttack (resultsCalculated) uses the same engaged/master/slave
    // path as normal attacks — retail never forces them non-engaged.
    if(!duel.engaged){
      // Non-duel: StartCombatRound(target, engaged=0, master)
      duelLog(owner, 'branch:non-engaged-start', { target: duelWho(target) });
      combatRound.startCombatRound(target, false, duel.master, featId);
      if(combatRound.action){
        combatRound.action.animation = ModuleCreatureAnimState.ATTACK;
      }
      combatRound.pauseRound(owner, pauseMs);
    }else if(duel.master){
      // Engaged master: start both rounds; slave paused with infinitePause
      duelLog(owner, 'branch:master-start', { slave: duelWho(target) });
      combatRound.startCombatRound(target, true, true, featId);
      if(combatRound.action){
        combatRound.action.animation = duel.useDuelingAnim
          ? ModuleCreatureAnimState.ATTACK_DUELING
          : ModuleCreatureAnimState.ATTACK;
      }
      combatRound.pauseRound(owner, pauseMs);

      if(target.combatRound){
        target.combatRound.startCombatRound(owner, true, false, 0);
        if(target.combatRound.action){
          target.combatRound.action.animation = duel.useDuelingAnim
            ? ModuleCreatureAnimState.ATTACK_DUELING
            : ModuleCreatureAnimState.ATTACK;
        }
        // Retail SetPauseTimer(slave, …, infinitePause=1) while master drives
        target.combatRound.pauseRound(owner, pauseMs, true);
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
        duelLog(owner, 'branch:slave-wait-master', { master: duelWho(target) });
        return ActionStatus.IN_PROGRESS;
      }
      duelLog(owner, 'branch:slave-resolve', { master: duelWho(target) });
      combatRound.pauseRound(owner, pauseMs);
    }

    if(combatRound.roundStarted){

      if(BitWise.InstanceOfObject(combatRound.newAttackTarget, ModuleObjectType.ModuleObject)){
        combatRound.setAttackTarget(combatRound.newAttackTarget);
        this.setParameter(1, ActionParameterType.DWORD, combatRound.newAttackTarget.id);
        this.target = combatRound.newAttackTarget;
        combatRound.newAttackTarget = undefined;
      }

      duelLog(owner, 'resolve-attack', {
        target: duelWho(target),
        cutscene: !!combatRound.action?.resultsCalculated,
      });
      combatRound.calculateAttackDamage(owner, combatRound.action);

      owner.setFacing(
        Math.atan2(
          owner.position.y - target.position.y,
          owner.position.x - target.position.x
        ) + Math.PI/2,
        false,
        TURN_SPEED_FAST
      );

      const attack_sound = THREE.MathUtils.randInt(0, 2);
      switch(attack_sound){
        case 1:
          owner.playSoundSet(SSFType.ATTACK_2);
        break;
        case 2:
          owner.playSoundSet(SSFType.ATTACK_3);
        break;
        default:
          owner.playSoundSet(SSFType.ATTACK_1);
        break;
      }

      return ActionStatus.COMPLETE;
    }

    return ActionStatus.IN_PROGRESS;
  }

}
