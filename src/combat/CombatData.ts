import { CombatRound } from "./";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreature, ModuleObject } from "../module";
import { CombatAction } from "../interface/combat/CombatAction";
import { Action, ActionCastSpell, ActionPhysicalAttacks } from "../actions";
import { TalentFeat, TalentSpell } from "../talents";
import { AttackResult } from "../enums/combat/AttackResult";
import { GameInitializer } from "../GameInitializer";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { WeaponType } from "../enums/combat/WeaponType";

export class CombatData {
  object: ModuleObject;
  
  lastAttemptedAttackTarget: ModuleObject;
  lastAttackTarget: ModuleObject;
  lastSpellTarget: ModuleObject;
  lastAttemptedSpellTarget: ModuleObject;
  lastSpellAttacker: ModuleObject;
  lastAttackAction: ActionType;

  lastCombatFeatUsed: TalentFeat;
  lastForcePowerUsed: TalentSpell;
  lastAttackResult: AttackResult;
  combatQueue: CombatAction[] = [];
  combatAction: CombatAction;
  lastAttackObject: ModuleObject;
  lastForcePowerSuccess: boolean;
  initiative: number;
  lastDamager: ModuleObject;
  lastAttacker: ModuleObject;

  //combat
  combatActionTimer: number;
  combatState: boolean;

  constructor(object: ModuleObject){
    this.object = object;
  }

  update(delta: number = 0){
    this.pruneInvalidCombatActionsInQueue();
    this.validateCurrentCombatAction();
  }

  validateCurrentCombatAction(){
    if(this.combatAction){
      if(this.combatAction.target && this.combatAction.target.isDead()){
        this.clearCombatAction(this.combatAction);
      }
    }
  }

  pruneInvalidCombatActionsInQueue(){
    let index = this.combatQueue.length;
    while(index--){
      const combatAction = this.combatQueue[index];
      if(combatAction && combatAction.target && combatAction.target.isDead()){
        this.object.actionQueue.clearAction(combatAction.action);
        this.combatQueue.splice(index, 1);
      }
    }
  }

  initialize(){
    this.lastAttackObject = undefined;
    this.lastAttackAction = ActionType.ActionInvalid;
    this.lastForcePowerUsed = undefined;
    this.lastForcePowerSuccess = false;
  }

  reset(){
    this.initialize();
    this.clearCombatAction(this.combatAction);
    let index = this.combatQueue.length;
    while(index--){
      const combatAction = this.combatQueue[index];
      if(combatAction){
        this.combatQueue.splice(index, 1);
        this.clearCombatAction(combatAction);
      }
    }
  }

  clearTarget(target: ModuleObject){
    this.lastAttackTarget = undefined;
    this.clearCombatActionsByTarget(target);
  }

  clearCombatActionsByTarget(target: ModuleObject){
    if(this.combatAction && this.combatAction.target == target){
      this.clearCombatAction(this.combatAction);
    }

    let index = this.combatQueue.length;
    while(index--){
      const combatAction = this.combatQueue[index];
      if(combatAction.target == target){
        this.combatQueue.splice(index, 1);
        this.clearCombatAction(combatAction);
      }
    }
  }

  setCombatAction(combatAction: CombatAction){
    if(this.combatAction != combatAction){
      this.combatAction = combatAction;
    }
  }

  clearCombatAction(combatAction: CombatAction = undefined, clearAll: boolean = false){
    if(this.combatAction == combatAction) this.combatAction = undefined;
    if(combatAction){
      this.object.actionQueue.clearAction(combatAction.action);
      if(clearAll){
        let index = this.combatQueue.length;
        while(index--){
          const _combatAction = this.combatQueue[index];
          if(_combatAction == combatAction){
            this.object.actionQueue.clearAction(_combatAction.action);
            this.combatQueue.splice(index, 1);
          }
        }
      }
      return true;
    }
    return false;
  }

  clearCombatActionAtIndex(index: number = 0): boolean {
    const combatAction = this.combatQueue[index];
    if(combatAction){
      this.combatQueue.splice(index, 1);
      this.clearCombatAction(combatAction);
      return true;
    }
    return false;
  }

  getEquippedWeaponType(){
    if(this.object instanceof ModuleCreature){
      let lWeapon = this.object.equipment.LEFTHAND;
      let rWeapon = this.object.equipment.RIGHTHAND;
      let claw1 = this.object.equipment.CLAW1;
      let claw2 = this.object.equipment.CLAW2;
      let claw3 = this.object.equipment.CLAW3;

      if(rWeapon){
        return (rWeapon.getWeaponType());
      }

      if(lWeapon){
        return (lWeapon.getWeaponType());
      }

      if(claw1){
        return (claw1.getWeaponType());
      }

      if(claw2){
        return (claw2.getWeaponType());
      }

      if(claw3){
        return (claw3.getWeaponType());
      }
    }

    return WeaponType.INVALID;
  }

}