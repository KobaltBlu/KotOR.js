import { CombatRound } from "../combat/CombatRound";
import { ModuleObjectType, SSFType } from "../enums";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { AttackResult } from "../enums/combat/AttackResult";
import { ModuleCreatureAnimState } from "../enums/module/ModuleCreatureAnimState";
import { GameState } from "../GameState";
import type { ModuleCreature } from "../module/ModuleCreature";
import type { ModuleObject } from "../module/ModuleObject";
import { BitWise } from "../utility/BitWise";
import { Utility } from "../utility/Utility";
import { Action } from "./Action";
import * as THREE from 'three';

/**
 * ActionPhysicalAttacks class.
 * Executes a physical attack (melee or ranged) against a target. Matches RunActions case 0xc
 * and CSWSCreature::AIActionPhysicalAttacks: only runs for creature (object_type 5), uses
 * desired range (melee 2.0 / ranged 15.0), move-to-target when out of range, combat round
 * begin/pause, engaged vs dueling animation, then calculateAttackDamage / facing / attack sound.
 * RunActions stores action node float at 0x38 in object.field27 before the call and resets
 * after; on non-complete it calls GetWorldTime (timestamp for retry/cooldown). We end the
 * combat round when target is dead for parity.
 *
 * @file ActionPhysicalAttacks.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionPhysicalAttacks extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionPhysicalAttacks;

    // Params match ActionCombat ProcessPendingCombatActions ATTACK/ATTACK_USE_FEAT and binary layout.
    // 0 - INT: resultsCalculated (pre-calculated attack roll/damage)
    // 1 - DWORD: target object id
    // 2 - INT: CombatActionType (ATTACK / ATTACK_USE_FEAT)
    // 3 - INT: animation index
    // 4 - INT: animationTime
    // 5 - INT: numAttacks
    // 6 - INT: feat id (0 if none)
    // 7 - INT: attackAnimation (when resultsCalculated)
    // 8 - INT: attackResult AttackResult (when resultsCalculated)
    // 9 - INT: attackDamage (when resultsCalculated)
  }

  update(delta: number = 0): ActionStatus {
    this.target = this.getParameter<ModuleObject>(1);

    if (!BitWise.InstanceOfObject(this.target, ModuleObjectType.ModuleObject)) {
      return ActionStatus.FAILED;
    }

    if (!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) {
      return ActionStatus.FAILED;
    }

    const owner: ModuleCreature = this.owner as any;
    const target: ModuleCreature = this.target as any;

    owner.resetExcitedDuration();
    const range = owner.isRangedEquipped() ? 15.0 : 2.0;

    if (target.isDead()) {
      if (owner.combatRound?.roundStarted) {
        owner.combatRound.endCombatRound();
      }
      return ActionStatus.FAILED;
    }

    const distance = Utility.Distance2D(owner.position, target.position);
    if (distance > range) {
      const targetPosition = target.position.clone();
      const actionMoveToTarget = new GameState.ActionFactory.ActionMoveToPoint(this.groupId);
      actionMoveToTarget.setParameter(0, ActionParameterType.FLOAT, targetPosition.x);
      actionMoveToTarget.setParameter(1, ActionParameterType.FLOAT, targetPosition.y);
      actionMoveToTarget.setParameter(2, ActionParameterType.FLOAT, targetPosition.z);
      actionMoveToTarget.setParameter(3, ActionParameterType.DWORD, target.area.id);
      actionMoveToTarget.setParameter(4, ActionParameterType.DWORD, target.id);
      actionMoveToTarget.setParameter(5, ActionParameterType.INT, 1);
      actionMoveToTarget.setParameter(6, ActionParameterType.FLOAT, range);
      actionMoveToTarget.setParameter(7, ActionParameterType.INT, 0);
      actionMoveToTarget.setParameter(8, ActionParameterType.FLOAT, 30.0);
      owner.actionQueue.addFront(actionMoveToTarget);
      return ActionStatus.IN_PROGRESS;
    }

    owner.force = 0;
    owner.speed = 0;

    if (!owner.combatRound) {
      return ActionStatus.FAILED;
    }

    const combatRound = owner.combatRound;
    const combatAction = combatRound.action;

    if (!combatAction) {
      return ActionStatus.FAILED;
    }

    combatAction.target = target;
    const resultsCalculated = !!this.getParameter<number>(0);
    const actionType = this.getParameter<number>(2);
    const animationIndex = this.getParameter<number>(3);
    const animationTime = this.getParameter<number>(4);
    const numAttacks = this.getParameter<number>(5);
    const featId = this.getParameter<number>(6) ?? 0;
    const attackAnimation = this.getParameter<number>(7);
    const attackResult = this.getParameter<number>(8);
    const attackDamage = this.getParameter<number>(9);

    if (resultsCalculated) {
      combatAction.resultsCalculated = true;
      combatAction.attackAnimation = attackAnimation ?? combatAction.attackAnimation;
      combatAction.attackResult = (attackResult ?? AttackResult.MISS) as AttackResult;
      combatAction.attackDamage = attackDamage ?? 0;
    }
    if (actionType !== undefined && actionType >= 0) {
      combatAction.actionType = actionType as any;
    }
    if (animationIndex !== undefined && animationIndex >= 0) {
      combatAction.animation = animationIndex;
    }
    if (animationTime !== undefined && animationTime >= 0) {
      combatAction.animationTime = animationTime;
    }
    if (numAttacks !== undefined && numAttacks >= 0) {
      combatAction.numAttacks = numAttacks;
    }
    if (featId && BitWise.InstanceOfObject(owner, ModuleObjectType.ModuleCreature)) {
      const feat = owner.getFeat(featId);
      combatAction.setFeat(feat);
    }

    if (!combatRound.roundPaused) {
      if (!combatRound.engaged) {
        combatRound.beginCombatRound();
        combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH);
        combatAction.animation = ModuleCreatureAnimState.ATTACK;
      } else {
        combatRound.beginCombatRound();
        combatAction.animation = ModuleCreatureAnimState.ATTACK_DUELING;
        combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH);
        if (combatRound.master && target.combatRound) {
          target.combatRound.beginCombatRound();
          target.combatRound.pauseRound(owner, CombatRound.ROUND_LENGTH / 2);
          if (target.combatRound.action) {
            target.combatRound.action.animation = ModuleCreatureAnimState.ATTACK_DUELING;
          }
        }
      }

      if (combatRound.roundStarted) {
        if (BitWise.InstanceOfObject(combatRound.newAttackTarget, ModuleObjectType.ModuleObject)) {
          combatRound.setAttackTarget(combatRound.newAttackTarget);
        }

        combatRound.calculateAttackDamage(owner, combatAction);

        owner.setFacing(
          Math.atan2(
            owner.position.y - target.position.y,
            owner.position.x - target.position.x
          ) + Math.PI / 2,
          false
        );

        const attackSound = THREE.MathUtils.randInt(0, 2);
        switch (attackSound) {
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
