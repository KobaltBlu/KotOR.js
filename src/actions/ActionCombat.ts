import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { Action } from "@/actions/Action";
import { CombatActionType } from "@/enums/combat/CombatActionType";
import { ActionParameterType } from "@/enums/actions/ActionParameterType";
import { ModuleObjectConstant } from "@/enums";
import { GameState } from "@/GameState";
import { CombatRound } from "@/combat/CombatRound";
import { resolveSpellCastTarget, parseForceMenuIndex } from "@/combat/spell-self-target";
import { isCreature } from "@/module/guards/isCreature";
import { isObject } from "@/module/guards/isObject";

/**
 * ActionCombat class.
 *
 * combat-dispatch action — dispatches scheduled CombatRound actions.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file ActionCombat.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionCombat extends Action {

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionCombat;

    //PARAMS
    // 0 - int: bClear (1 = initialize combat round, 0 = default)

  }
  
  /**
   * Updates the combat action state.
   * 
   * Processes the combat round and executes scheduled combat actions like attacks and spells.
   * Adds appropriate actions to the owner's action queue based on the combat action type.
   * 
   * @param delta - Time elapsed since last update in seconds
   * @returns ActionStatus indicating the current state of the combat action:
   * - FAILED if owner is not a creature
   * - COMPLETE if no combat round exists
   * - IN_PROGRESS if round is paused
   * - Status from processing scheduled actions
   */
  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)) return ActionStatus.FAILED;

    const combatRound = this.owner.combatRound;
    if(!combatRound) return ActionStatus.COMPLETE;

    const scheduledActionList = combatRound.scheduledActionList;

    // : round_paused or server combat-pause → IN_PROGRESS (1)
    if(combatRound.roundPaused) return ActionStatus.IN_PROGRESS;
    if(!scheduledActionList.length){
      // : empty pending + round_started → IN_PROGRESS; else COMPLETE (2)
      return combatRound.roundStarted ? ActionStatus.IN_PROGRESS : ActionStatus.COMPLETE;
    }
    const combatAction = scheduledActionList.shift();
    if(!combatAction){
      return ActionStatus.COMPLETE;
    }

    combatRound.action = combatAction;
    const pauseMs = Math.max(0, combatAction.animationTime || CombatRound.ROUND_LENGTH);

    switch(combatAction.actionType){
      case CombatActionType.ATTACK:
      case CombatActionType.ATTACK_USE_FEAT: {
        const targetId = combatAction.target?.id;
        if(!targetId || targetId === ModuleObjectConstant.OBJECT_INVALID){
          // Unresolved SchedAction target after mid-combat load — skip, do not throw.
          return scheduledActionList.length
            ? ActionStatus.IN_PROGRESS
            : (combatRound.roundStarted ? ActionStatus.IN_PROGRESS : ActionStatus.COMPLETE);
        }
        const attackAction = new GameState.ActionFactory.ActionPhysicalAttacks();
        attackAction.setParameter(0, ActionParameterType.INT, combatAction.resultsCalculated ? 1 : 0);
        attackAction.setParameter(1, ActionParameterType.DWORD, targetId);
        attackAction.setParameter(2, ActionParameterType.INT, combatAction.actionType);
        attackAction.setParameter(3, ActionParameterType.INT, combatAction.animation);
        attackAction.setParameter(4, ActionParameterType.INT, combatAction.animationTime);
        attackAction.setParameter(5, ActionParameterType.INT, combatAction.numAttacks);
        attackAction.setParameter(6, ActionParameterType.INT, combatAction.feat ? combatAction.feat.id : 0);
        attackAction.setParameter(7, ActionParameterType.INT, combatAction.resultsCalculated ? combatAction.attackAnimation : 0);
        attackAction.setParameter(8, ActionParameterType.INT, combatAction.resultsCalculated ? combatAction.attackResult : 4);
        attackAction.setParameter(9, ActionParameterType.INT, combatAction.resultsCalculated ? combatAction.attackDamage : 0);
        attackAction.isUserAction = combatAction.isUserAction;
        this.owner.actionQueue.unshift(attackAction);
        return ActionStatus.WAITING;
      }

      case CombatActionType.PAUSE:
        // case 3 — pause round for animationTime
        combatRound.pauseRound(this.owner, pauseMs);
        return ActionStatus.IN_PROGRESS;

      case CombatActionType.CAST_SPELL: {
        // GetSelfForcePowers / range P — bind to caster before queueing
        // ActionCastSpell (look-at companion must not become MoveTo destination).
        const castTarget = resolveSpellCastTarget(
          combatAction.spell,
          combatAction.target as any,
          this.owner,
          { isUserAction: combatAction.isUserAction }
        );
        combatAction.target = castTarget;
        const spellAction = new GameState.ActionFactory.ActionCastSpell();
        spellAction.setParameter(0, ActionParameterType.INT, combatAction.spell ? combatAction.spell.id : 0);
        spellAction.setParameter(1, ActionParameterType.INT, combatAction.spellClassIndex);
        spellAction.setParameter(2, ActionParameterType.INT, combatAction.domainLevel);
        spellAction.setParameter(3, ActionParameterType.INT, 0);
        spellAction.setParameter(4, ActionParameterType.INT, 0);
        spellAction.setParameter(5, ActionParameterType.DWORD, castTarget?.id || ModuleObjectConstant.OBJECT_INVALID);
        spellAction.setParameter(6, ActionParameterType.FLOAT, castTarget?.position?.x || 0);
        spellAction.setParameter(7, ActionParameterType.FLOAT, castTarget?.position?.y || 0);
        spellAction.setParameter(8, ActionParameterType.FLOAT, castTarget?.position?.z || 0);
        spellAction.setParameter(9, ActionParameterType.INT, combatAction.projectilePath);
        spellAction.setParameter(10, ActionParameterType.INT, -1);
        spellAction.setParameter(11, ActionParameterType.INT, combatAction.overrideSpell ? combatAction.overrideSpell.id : -1);
        spellAction.isUserAction = combatAction.isUserAction;
        this.owner.actionQueue.unshift(spellAction);
        return ActionStatus.WAITING;
      }

      case CombatActionType.ITEM_CAST_SPELL: {
        // AIActionCombat case 10 — FORCEHOSTILE < 1 clears non-self
        // object id but keeps the scheduled position (grenade location casts).
        // Compare by id so a stamped self-target cannot be treated as "other".
        const rawTarget = combatAction.target;
        const ownerId = this.owner?.id;
        const forceHostile = parseForceMenuIndex(combatAction.spell?.forcehostile);
        const isSelfTarget =
          !!rawTarget &&
          (rawTarget === this.owner || (!!ownerId && rawTarget.id === ownerId));
        let itemTargetId = rawTarget?.id || ModuleObjectConstant.OBJECT_INVALID;
        let posSource = rawTarget;
        if(forceHostile < 1 && rawTarget && !isSelfTarget){
          itemTargetId = ModuleObjectConstant.OBJECT_INVALID;
          combatAction.target = undefined;
          // Keep rawTarget position for approach / grenade impact location.
        }else if(isSelfTarget){
          // Personal menu stamp — always resolve to the caster object id.
          itemTargetId = ownerId || ModuleObjectConstant.OBJECT_INVALID;
          combatAction.target = this.owner;
          posSource = this.owner;
        }

        const itemSpellAction = new GameState.ActionFactory.ActionItemCastSpell();
        itemSpellAction.setParameter(0, ActionParameterType.DWORD, itemTargetId);
        itemSpellAction.setParameter(1, ActionParameterType.DWORD, posSource?.area?.id || this.owner?.area?.id || ModuleObjectConstant.OBJECT_INVALID);
        itemSpellAction.setParameter(2, ActionParameterType.FLOAT, posSource?.position?.x || 0);
        itemSpellAction.setParameter(3, ActionParameterType.FLOAT, posSource?.position?.y || 0);
        itemSpellAction.setParameter(4, ActionParameterType.FLOAT, posSource?.position?.z || 0);
        itemSpellAction.setParameter(5, ActionParameterType.INT, combatAction.spell ? combatAction.spell.id : 0);
        itemSpellAction.setParameter(6, ActionParameterType.INT, combatAction.domainLevel);
        itemSpellAction.setParameter(7, ActionParameterType.FLOAT, 1.0);
        itemSpellAction.setParameter(8, ActionParameterType.INT, combatAction.projectilePath);
        itemSpellAction.setParameter(9, ActionParameterType.INT, -1);
        itemSpellAction.setParameter(10, ActionParameterType.DWORD, combatAction.item?.id || ModuleObjectConstant.OBJECT_INVALID);
        itemSpellAction.setParameter(11, ActionParameterType.STRING, '');
        itemSpellAction.setParameter(12, ActionParameterType.INT, combatAction.activePropertyIndex ?? 0);
        itemSpellAction.isUserAction = combatAction.isUserAction;
        this.owner.actionQueue.unshift(itemSpellAction);
        return ActionStatus.WAITING;
      }

      case CombatActionType.ITEM_EQUIP: {
        // case 6 — pause then RunEquip
        combatRound.pauseRound(this.owner, pauseMs);
        const equipAction = new GameState.ActionFactory.ActionEquipItem();
        equipAction.setParameter(0, ActionParameterType.DWORD, combatAction.item);
        equipAction.setParameter(1, ActionParameterType.INT, combatAction.inventorySlot || 0);
        equipAction.setParameter(2, ActionParameterType.INT, combatAction.equipInstant ? 1 : 0);
        equipAction.isUserAction = combatAction.isUserAction;
        this.owner.actionQueue.unshift(equipAction);
        return ActionStatus.IN_PROGRESS;
      }

      case CombatActionType.ITEM_UNEQUIP: {
        // case 7 — pause then RunUnequip
        combatRound.pauseRound(this.owner, pauseMs);
        const unequipAction = new GameState.ActionFactory.ActionUnequipItem();
        unequipAction.setParameter(0, ActionParameterType.DWORD, combatAction.item);
        unequipAction.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
        unequipAction.setParameter(2, ActionParameterType.INT, combatAction.equipInstant ? 1 : 0);
        unequipAction.isUserAction = combatAction.isUserAction;
        this.owner.actionQueue.unshift(unequipAction);
        return ActionStatus.IN_PROGRESS;
      }

      case CombatActionType.ATTACK_CUTSCENE_MOVE: {
        // combat-dispatch action case 0xC — MoveToPoint/Object then continue combat
        const moveTarget = combatAction.target;
        const pos = combatAction.moveToPosition;
        const run = combatAction.shouldRun ? 1 : 0;
        const areaId = this.owner.area?.id ?? ModuleObjectConstant.OBJECT_INVALID;

        if(moveTarget && isObject(moveTarget)){
          const actionMove = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
          actionMove.setParameter(0, ActionParameterType.FLOAT, moveTarget.position.x);
          actionMove.setParameter(1, ActionParameterType.FLOAT, moveTarget.position.y);
          actionMove.setParameter(2, ActionParameterType.FLOAT, moveTarget.position.z);
          actionMove.setParameter(3, ActionParameterType.DWORD, moveTarget.area?.id ?? areaId);
          actionMove.setParameter(4, ActionParameterType.DWORD, moveTarget.id);
          actionMove.setParameter(5, ActionParameterType.INT, run);
          actionMove.setParameter(6, ActionParameterType.FLOAT, 0.2);
          actionMove.setParameter(7, ActionParameterType.INT, 0);
          actionMove.setParameter(8, ActionParameterType.FLOAT, 30.0);
          this.owner.actionQueue.unshift(actionMove);
        }else if(pos){
          const actionMove = new GameState.ActionFactory.ActionMoveToPoint(undefined, this.groupId);
          actionMove.setParameter(0, ActionParameterType.FLOAT, pos.x);
          actionMove.setParameter(1, ActionParameterType.FLOAT, pos.y);
          actionMove.setParameter(2, ActionParameterType.FLOAT, pos.z);
          actionMove.setParameter(3, ActionParameterType.DWORD, areaId);
          actionMove.setParameter(4, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
          actionMove.setParameter(5, ActionParameterType.INT, run);
          actionMove.setParameter(6, ActionParameterType.FLOAT, 0.2);
          actionMove.setParameter(7, ActionParameterType.INT, 0);
          actionMove.setParameter(8, ActionParameterType.FLOAT, 30.0);
          this.owner.actionQueue.unshift(actionMove);
        }
        return ActionStatus.WAITING;
      }
    }

    return ActionStatus.WAITING;
  }

}
