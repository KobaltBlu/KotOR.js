import { CombatRound } from "@engine/combat/CombatRound";
import {
  desiredAttackRange,
  getAttackMoveArriveRange,
  getCreaturePersonalSpace,
  getPathPersonalSpace,
  hasCombatLineOfSight,
  maxAttackRange,
} from "@engine/combat/attack-range";
import { resolveDuelRoundFlags } from "@engine/combat/combat-dueling";
import { resolveAttackPauseMs } from "@engine/combat/combat-round-pause";
import { duelLog, duelWho } from "@engine/combat/duel-debug";
import { hasTargetBeenDetected } from "@engine/combat/nearest-enemy";
import { initializeNewAttackTarget, tryStuckLosRetarget } from "@engine/combat/initialize-new-attack-target";
import { getNearestActionPoint } from "@engine/combat/nearest-action-point";
import { GameObjectConstant, SSFType } from "@core/enums";
import { ActionParameterType } from "@core/enums/actions/ActionParameterType";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { canAttackByAIState } from "@engine/module/creature/ai-state";
import { CombatFeatType } from "@core/enums/combat/CombatFeatType";
import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";
import { GameState } from "@engine/runtime/GameState";
import type { Creature } from "@engine/module/Creature";
import type { GameObject } from "@engine/module/GameObject";
import { Utility } from "@core/utility/Utility";
import { Action } from "@engine/actions/Action";
import * as THREE from 'three';
import { TURN_SPEED_FAST } from "@engine/movement/TurnSpeeds";
import { isCreature } from "@engine/module/guards/isCreature";
import { isGameObject } from "@engine/module/guards/isGameObject";
import {
  hasWalkLineClear,
  WalkLineHitCode,
} from "@engine/pathfinding/walk-line-clear";
import { tryForceJumpApproach } from "@engine/combat/try-force-jump-approach";

export type MeleeBackoffResult = {
  position: THREE.Vector3;
  clippedDesired: number;
  clear: boolean;
};

/**
 * ActionPhysicalAttacks class.
 *
 * Physical attack action:
 * Max range for "too far", desired range for melee arrive / too-close.
 * Move arrive = ranged ? max : desired.
 * Approach (too far / no LOS): requeue this action, then radius check,
 * face target, and move to point (target origin or door/placeable
 * action point). No surround/openSpot picker.
 * NPC melee too-close: radial backoff move only (arrive 0).
 * Duel: choreographed / engaged / master resolution + paired round sync.
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
    // 0 - int: resultsCalculated (cutscene precomputed attack flag)
    // 1 - dword: target object id
    // 2 - int: combat action type
    // 3 - int: animation state id
    // 4 - int: animation duration in milliseconds
    // 5 - int: number of attack swings
    // 6 - int: feat id (0 if normal attack)
    // 7 - int: precomputed attack animation index
    // 8 - int: precomputed attack result
    // 9 - int: precomputed attack damage
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
    attacker: Creature,
    target: GameObject,
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
    attacker: Creature,
    target: GameObject,
    desired: number
  ): THREE.Vector3 {
    return ActionPhysicalAttacks.resolveMeleeBackoff(attacker, target, desired).position;
  }

  static resolveMeleeBackoff(
    attacker: Creature,
    target: GameObject,
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

    const hit = hasWalkLineClear(area, attacker.position, ideal, {
      owner: attacker,
      personalSpace: perspace,
      checkCreatures: true,
      ignoreCreatureIds: ignoreIds,
      collectHitInfo: true,
    });
    if(hit.ok || hit.code === WalkLineHitCode.Ok){
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
    
    this.target = this.getParameter<GameObject>(1);

    if(!isGameObject(this.target)){
      return ActionStatus.FAILED;
    }

    if(!isCreature(this.owner)){
      return ActionStatus.FAILED;
    }


    this.owner.resetExcitedDuration();

    // Dazed creatures (e.g. just after Force Push) give up the attack.
    if(!canAttackByAIState(this.owner)){
      return ActionStatus.FAILED;
    }

    // Load cutscene precomputed results onto the current combat action.
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
      // Drop swings scheduled against the corpse so they cannot block the
      // next round's queueing. The round itself ends on its own timer, which
      // is where the switch to the nearest enemy happens.
      const round = this.owner.combatRound;
      if(round){
        round.pruneDeadAttackActions();
        if(!round.roundStarted && round.action && round.action.target === this.target){
          round.action = undefined;
        }
      }
      return ActionStatus.FAILED;
    }

    // Detection: doors/placeables always; creatures need SEEN.
    // Cutscene attacks still require detection/range — only roll/damage short-circuit.
    if(!hasTargetBeenDetected(this.owner, this.target)){
      return ActionStatus.FAILED;
    }

    // Duel flags drive desired/max attack range when not engaged.
    const duel = resolveDuelRoundFlags(this.owner, this.target);
    const choreographed = duel.choreographed;
    const desired = desiredAttackRange(this.owner, this.target, choreographed);
    const max = maxAttackRange(this.owner, this.target, choreographed);
    const dist = Utility.Distance2D(this.owner.position, this.target.position);
    const distSq = dist * dist;
    const maxSq = max * max;
    const desiredSq = desired * desired;

    // Too far, NPC melee too close (hysteresis), or no LOS → approach/backoff.
    // Hysteresis: enter at desired²−0.2, stay until dist² ≥ desired².
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
        // First stuck sample — still path toward target.
      }

      const isBackoff = tooClose && !tooFar && !isPartyMember && !this.owner.isRangedEquipped();

      // Force-jump approach when LOS is clear — skip the move on success.
      // hasLos is capped at attack range; the leap needs a clear line over the
      // full distance, so retest uncapped when out of range.
      let forceJumped = false;
      const jumpLos = hasLos || (
        tooFar &&
        !!this.owner.getHasFeat?.(CombatFeatType.FORCE_JUMP) &&
        hasCombatLineOfSight(this.owner, this.target, dist + 1)
      );
      if(!isBackoff && jumpLos){
        const featOut = { featId: this.getParameter<number>(6) | 0 };
        if(tryForceJumpApproach(this.owner, this.target, featOut)){
          this.setParameter(6, ActionParameterType.INT, featOut.featId);
          if(combatRound?.action){
            combatRound.action.featId = featOut.featId;
          }
          forceJumped = true;
        }
      }

      if(!forceJumped){
        let arriveRange = getAttackMoveArriveRange(this.owner, this.target, choreographed);
        let target_position = getNearestActionPoint(this.target, this.owner.position, this.owner);

        if(isBackoff){
          // Too close: back off to desired range, clipped by walk-line clearance.
          const backoff = ActionPhysicalAttacks.resolveMeleeBackoff(this.owner, this.target, desired);
          target_position = backoff.position;
          arriveRange = 0;
          this.owner.pathFindApproachPersonalSpace = 0;
          this.owner.pathFindIgnoreObjectId = 0;
        }else{
          // Approach: creature origin / door-placeable action point — no attacker
          // personal-space shove (pathfind padding + move arrive instead).
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

        // Front-queue order → execute: Move → Facing → Check → PhysicalAttacks
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
        actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, isBackoff ? GameObjectConstant.OBJECT_INVALID : this.target.id);
        actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
        actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, arriveRange);
        actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
        actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
        this.owner.actionQueue.addFront(actionMoveToTarget);

        return ActionStatus.COMPLETE;
      }
      // Force jump applied — fall through to start combat round with stamped feat.
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

    // Wait while the round is paused (duel slaves stay here until the master drives).
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

    // Cutscene precomputed attacks use the same engaged/master/slave
    // path as normal attacks — never force them non-engaged.
    if(!duel.engaged){
      // Non-duel: start combat round (not engaged).
      duelLog(this.owner, 'branch:non-engaged-start', { target: duelWho(this.target) });
      combatRound.startCombatRound(this.target, false, duel.master, featId);
      if(combatRound.action){
        combatRound.action.animation = ModuleCreatureAnimState.ATTACK;
      }
      combatRound.pauseRound(this.owner, pauseMs);
    }else if(duel.master){
      // Engaged master: start both rounds; slave paused indefinitely.
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
        // Pause the slave with infinite pause while the master drives.
        this.target.combatRound.pauseRound(this.owner, pauseMs, true);
      }
    }else{
      // Engaged slave: master already started our round — ensure anim only.
      if(combatRound.action){
        combatRound.action.animation = duel.useDuelingAnim
          ? ModuleCreatureAnimState.ATTACK_DUELING
          : ModuleCreatureAnimState.ATTACK;
      }
      if(!combatRound.roundStarted){
        // Master hasn't synced yet — wait.
        duelLog(this.owner, 'branch:slave-wait-master', { master: duelWho(this.target) });
        return ActionStatus.IN_PROGRESS;
      }
      duelLog(this.owner, 'branch:slave-resolve', { master: duelWho(this.target) });
      combatRound.pauseRound(this.owner, pauseMs);
    }

    if(combatRound.roundStarted){

      if(isGameObject(combatRound.newAttackTarget)){
        const retarget = combatRound.newAttackTarget;
        initializeNewAttackTarget(this.owner, retarget, this);
        if(combatRound.action){
          combatRound.action.target = retarget;
        }
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
