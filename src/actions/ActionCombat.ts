import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionType } from "../enums/actions/ActionType";
import { CombatActionType } from "../enums/combat/CombatActionType";
import { ProjectilePath } from "../enums/combat/ProjectilePath";
import { ModuleCreature, ModuleObject } from "../module";
import { TalentFeat, TalentSpell } from "../talents";
import { Action, ActionCastSpell, ActionEquipItem, ActionPhysicalAttacks, ActionQueue, ActionUnequipItem } from "./";

export class ActionCombat extends Action {

  constructor( groupId: number = ActionQueue.AUTO_INCREMENT_GROUP_ID ){
    super(groupId);
    this.type = ActionType.ActionCombat;

    //PARAMS
    // 0 - int: (?) 1 or 0

  }
  
  update(delta: number = 0): ActionStatus {
    if(!(this.owner instanceof ModuleCreature)) return ActionStatus.FAILED;

    const combatRound = this.owner.combatRound;
    if(!combatRound) return ActionStatus.COMPLETE;

    const scheduledActionList = combatRound.scheduledActionList;

    if(combatRound.roundPaused) return ActionStatus.IN_PROGRESS;
    if(scheduledActionList.length){
      const combatAction = scheduledActionList.shift();
      if(combatAction){
        combatRound.action = combatAction;
        switch(combatAction.actionType){
          case CombatActionType.ATTACK:
          case CombatActionType.ATTACK_USE_FEAT:
            const attackAction = new ActionPhysicalAttacks(ActionQueue.AUTO_INCREMENT_GROUP_ID);
            attackAction.setParameter(0, ActionParameterType.INT, combatAction.resultsCalculated);
            attackAction.setParameter(1, ActionParameterType.DWORD, combatAction.target.id);
            attackAction.setParameter(2, ActionParameterType.INT, combatAction.actionType);
            attackAction.setParameter(3, ActionParameterType.INT, combatAction.animation);
            attackAction.setParameter(4, ActionParameterType.INT, combatAction.animationTime);
            attackAction.setParameter(5, ActionParameterType.INT, combatAction.numAttacks);
            attackAction.setParameter(6, ActionParameterType.INT, combatAction.feat instanceof TalentFeat ? combatAction.feat.id : 0);
            attackAction.setParameter(7, ActionParameterType.INT, combatAction.resultsCalculated ? combatAction.attackAnimation : 0);
            attackAction.setParameter(8, ActionParameterType.INT, combatAction.resultsCalculated ? combatAction.attackResult : 4);
            attackAction.setParameter(9, ActionParameterType.INT, combatAction.resultsCalculated ? combatAction.attackDamage : 0);
            attackAction.isUserAction = combatAction.isUserAction;
            this.owner.actionQueue.unshift(attackAction);
          break;
          case CombatActionType.CAST_SPELL:
            const spellAction = new ActionCastSpell(ActionQueue.AUTO_INCREMENT_GROUP_ID);
            spellAction.setParameter(0, ActionParameterType.INT, combatAction.spell instanceof TalentSpell ? combatAction.spell.id : 0); //Spell Id
            spellAction.setParameter(1, ActionParameterType.INT, combatAction.spellClassIndex);
            spellAction.setParameter(2, ActionParameterType.INT, combatAction.domainLevel); //DomainLevel
            spellAction.setParameter(3, ActionParameterType.INT, 0);
            spellAction.setParameter(4, ActionParameterType.INT, 0);
            spellAction.setParameter(5, ActionParameterType.DWORD, combatAction.target?.id || ModuleObject.OBJECT_INVALID); //Target Object
            spellAction.setParameter(6, ActionParameterType.FLOAT, combatAction.target.position.x); //Target X
            spellAction.setParameter(7, ActionParameterType.FLOAT, combatAction.target.position.y); //Target Y
            spellAction.setParameter(8, ActionParameterType.FLOAT, combatAction.target.position.z); //Target Z
            spellAction.setParameter(9, ActionParameterType.INT, combatAction.projectilePath); //ProjectilePath
            spellAction.setParameter(10, ActionParameterType.INT, -1);
            spellAction.setParameter(11, ActionParameterType.INT, combatAction.overrideSpell instanceof TalentSpell ? combatAction.overrideSpell.id : -1);
            attackAction.isUserAction = combatAction.isUserAction;
            this.owner.actionQueue.unshift(spellAction);
          break;
          case CombatActionType.ITEM_CAST_SPELL:
            //TODO
          break;
          case CombatActionType.ITEM_EQUIP:
            const equipAction = new ActionEquipItem(ActionQueue.AUTO_INCREMENT_GROUP_ID);
            equipAction.setParameter(0, ActionParameterType.DWORD, combatAction.item?.id || ModuleObject.OBJECT_INVALID);
            equipAction.setParameter(1, ActionParameterType.DWORD, ModuleObject.OBJECT_INVALID);
            equipAction.setParameter(2, ActionParameterType.INT, combatAction.equipInstant ? 1 : 0);
            attackAction.isUserAction = combatAction.isUserAction;
            this.owner.actionQueue.unshift(equipAction);
          break;
          case CombatActionType.ITEM_UNEQUIP:
            const unequipAction = new ActionUnequipItem(ActionQueue.AUTO_INCREMENT_GROUP_ID);
            unequipAction.setParameter(0, ActionParameterType.DWORD, combatAction.item?.id || ModuleObject.OBJECT_INVALID);
            unequipAction.setParameter(1, ActionParameterType.DWORD, ModuleObject.OBJECT_INVALID);
            unequipAction.setParameter(2, ActionParameterType.INT, combatAction.equipInstant ? 1 : 0);
            attackAction.isUserAction = combatAction.isUserAction;
            this.owner.actionQueue.unshift(unequipAction);
          break;
        }

        return ActionStatus.IN_PROGRESS;
      }

    }else{
      return ActionStatus.COMPLETE;
    }
  }

}