import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { Action } from "./Action";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ModuleObjectConstant, ModuleObjectType } from "../enums";
import { BitWise } from "../utility/BitWise";
import { GameState } from "../GameState";
import { ActionQueue } from "./ActionQueue";

/**
 * ActionCombat class.
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
    // 0 - int: (?) 1 or 0

  }
  
  /**
   * Updates the combat action state.
   * 
   * Processes the combat round and executes scheduled combat actions like attacks and spells.
   * Adds appropriate actions to the owner's action queue based on the combat action type.
   * 
   * @param delta - Time elapsed since last update in seconds
   * @returns ActionStatus indicating the current state of the combat action:
   *          - FAILED if owner is not a creature
   *          - COMPLETE if no combat round exists
   *          - IN_PROGRESS if round is paused
   *          - Status from processing scheduled actions
   */
  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)) return ActionStatus.FAILED;

    const combatRound = this.owner.combatRound;
    if(!combatRound) return ActionStatus.COMPLETE;

    const scheduledActionList = combatRound.scheduledActionList;

    if(combatRound.roundPaused) return ActionStatus.IN_PROGRESS;
    if(!scheduledActionList.length){
      return ActionStatus.COMPLETE;
    }
    const combatAction = scheduledActionList.shift();
    if(!combatAction){
      return ActionStatus.COMPLETE;
    }

    combatRound.action = combatAction;
    switch(combatAction.actionType){
      case CombatActionType.ATTACK:
      case CombatActionType.ATTACK_USE_FEAT:
        const attackAction = new GameState.ActionFactory.ActionPhysicalAttacks();
        attackAction.setParameter(0, ActionParameterType.INT, combatAction.resultsCalculated);
        attackAction.setParameter(1, ActionParameterType.DWORD, combatAction.target.id);
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
      break;
      case CombatActionType.CAST_SPELL:
        const spellAction = new GameState.ActionFactory.ActionCastSpell();
        spellAction.setParameter(0, ActionParameterType.INT, combatAction.spell ? combatAction.spell.id : 0); //Spell Id
        spellAction.setParameter(1, ActionParameterType.INT, combatAction.spellClassIndex);
        spellAction.setParameter(2, ActionParameterType.INT, combatAction.domainLevel); //DomainLevel
        spellAction.setParameter(3, ActionParameterType.INT, 0);
        spellAction.setParameter(4, ActionParameterType.INT, 0);
        spellAction.setParameter(5, ActionParameterType.DWORD, combatAction.target?.id || ModuleObjectConstant.OBJECT_INVALID); //Target Object
        spellAction.setParameter(6, ActionParameterType.FLOAT, combatAction.target.position.x); //Target X
        spellAction.setParameter(7, ActionParameterType.FLOAT, combatAction.target.position.y); //Target Y
        spellAction.setParameter(8, ActionParameterType.FLOAT, combatAction.target.position.z); //Target Z
        spellAction.setParameter(9, ActionParameterType.INT, combatAction.projectilePath); //ProjectilePath
        spellAction.setParameter(10, ActionParameterType.INT, -1);
        spellAction.setParameter(11, ActionParameterType.INT, combatAction.overrideSpell ? combatAction.overrideSpell.id : -1);
        attackAction.isUserAction = combatAction.isUserAction;
        this.owner.actionQueue.unshift(spellAction);
      break;
      case CombatActionType.ITEM_CAST_SPELL:
        //TODO
      break;
      case CombatActionType.ITEM_EQUIP:
        const equipAction = new GameState.ActionFactory.ActionEquipItem();
        equipAction.setParameter(0, ActionParameterType.DWORD, combatAction.item?.id || ModuleObjectConstant.OBJECT_INVALID);
        equipAction.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
        equipAction.setParameter(2, ActionParameterType.INT, combatAction.equipInstant ? 1 : 0);
        attackAction.isUserAction = combatAction.isUserAction;
        this.owner.actionQueue.unshift(equipAction);
      break;
      case CombatActionType.ITEM_UNEQUIP:
        const unequipAction = new GameState.ActionFactory.ActionUnequipItem();
        unequipAction.setParameter(0, ActionParameterType.DWORD, combatAction.item?.id || ModuleObjectConstant.OBJECT_INVALID);
        unequipAction.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
        unequipAction.setParameter(2, ActionParameterType.INT, combatAction.equipInstant ? 1 : 0);
        attackAction.isUserAction = combatAction.isUserAction;
        this.owner.actionQueue.unshift(unequipAction);
      break;
    }

    return ActionStatus.IN_PROGRESS;
  }

}