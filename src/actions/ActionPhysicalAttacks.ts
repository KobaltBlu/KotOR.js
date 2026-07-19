import { CombatRound } from "@/combat/CombatRound";
import {
  desiredAttackRange,
  getAttackMoveArriveRange,
  getPathPersonalSpace,
  hasCombatLineOfSight,
  maxAttackRange,
} from "@/combat/attack-range";
import { resolveDuelRoundFlags } from "@/combat/combat-dueling";
import { hasTargetBeenDetected } from "@/combat/nearest-enemy";
import { tryStuckLosRetarget } from "@/combat/initialize-new-attack-target";
import { getNearestActionPoint } from "@/combat/nearest-action-point";
import { getMeleeBackoffPosition } from "@/combat/melee-backoff";
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

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionPhysicalAttacks;

    //PARAMS
    // 0 - (?)
    // 1 - Target (DWORD)
    // 2 - (?)
    // 3 - AnimationIndex (INT)
    // 4 - AnimationLength (INT)
    // 5 - (?)
    // 6 - (?)
    // 7 - (?)
    // 8 - (?)
    // 9 - (?)
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

    if(target.isDead()){
      if(owner.combatRound?.roundStarted){
        owner.combatRound.endCombatRound();
      }
      return ActionStatus.FAILED;
    }

    // CutsceneAttack: designer-placed poses — skip detection/range/move and play the swing.
    const cutsceneAttack = !!owner.combatRound?.action?.isCutsceneAttack;
    if(cutsceneAttack){
      owner.force = 0;
      owner.speed = 0;
      const combatRound = owner.combatRound;
      if(!combatRound.roundPaused){
        combatRound.startCombatRound(target, false, true, combatRound.action?.featId || 0);
        if(combatRound.action){
          combatRound.action.animation = ModuleCreatureAnimState.ATTACK;
        }
        combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH);
        if(combatRound.roundStarted){
          combatRound.calculateAttackDamage(owner, combatRound.action);
          owner.setFacing(
            Math.atan2(
              owner.position.y - target.position.y,
              owner.position.x - target.position.x
            ) + Math.PI/2,
            false,
            TURN_SPEED_FAST
          );
          return ActionStatus.COMPLETE;
        }
      }
      return ActionStatus.IN_PROGRESS;
    }

    // Retail HasTargetBeenDetected @ 005b48f0 — doors/placeables always; creatures need SEEN
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
    const tooFar = distSq > maxSq;
    const tooClose = distSq < desiredSq - 0.2;
    const isPartyMember = GameState.PartyManager.party.indexOf(owner) >= 0;
    const hasLos = hasCombatLineOfSight(owner, target, max);
    const needCloseOrBack =
      tooFar || (tooClose && !isPartyMember && !owner.isRangedEquipped());

    if(needCloseOrBack){
      let arriveRange = getAttackMoveArriveRange(owner, target, choreographed);
      let target_position = getNearestActionPoint(target, owner.position, owner);

      // Too close: DesiredAttackRange back-off + TestDirectLine-style walkable clip
      if(tooClose && !tooFar){
        target_position = getMeleeBackoffPosition(owner, target, desired);
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

    if(!owner.combatRound){
      return ActionStatus.FAILED;
    }

    const combatRound = owner.combatRound;
    if(!combatRound.roundPaused) {
      const featId = combatRound.action?.featId || 0;

      if(!duel.engaged){
        // Non-duel: StartCombatRound(target, engaged=0, master)
        combatRound.startCombatRound(target, false, duel.master, featId);
        if(combatRound.action){
          combatRound.action.animation = ModuleCreatureAnimState.ATTACK;
        }
        combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH);
      }else if(duel.master){
        // Engaged master: start both rounds; slave paused with infinitePause
        combatRound.startCombatRound(target, true, true, featId);
        if(combatRound.action){
          combatRound.action.animation = duel.useDuelingAnim
            ? ModuleCreatureAnimState.ATTACK_DUELING
            : ModuleCreatureAnimState.ATTACK;
        }
        combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH);

        if(target.combatRound){
          target.combatRound.startCombatRound(owner, true, false, 0);
          if(target.combatRound.action){
            target.combatRound.action.animation = duel.useDuelingAnim
              ? ModuleCreatureAnimState.ATTACK_DUELING
              : ModuleCreatureAnimState.ATTACK;
          }
          // Retail SetPauseTimer(slave, …, infinitePause=1) while master drives
          target.combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH, true);
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
          return ActionStatus.IN_PROGRESS;
        }
        combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH);
      }

      if(combatRound.roundStarted){

        if(BitWise.InstanceOfObject(combatRound.newAttackTarget, ModuleObjectType.ModuleObject)){
          combatRound.setAttackTarget(combatRound.newAttackTarget);
          this.setParameter(1, ActionParameterType.DWORD, combatRound.newAttackTarget.id);
          this.target = combatRound.newAttackTarget;
          combatRound.newAttackTarget = undefined;
        }

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

    }
    return ActionStatus.IN_PROGRESS;
  }

}
