import type { ModuleCreature, ModuleObject } from "../module";
import type { TalentFeat, TalentSpell } from "../talents";
import { ICombatAction } from "../interface/combat/ICombatAction";
import { AttackResult } from "../enums/combat/AttackResult";
import { ActionType } from "../enums/actions/ActionType";
import { WeaponType } from "../enums/combat/WeaponType";
import { BitWise } from "../utility/BitWise";
import { ModuleObjectType } from "../enums";

/**
 * CombatData class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CombatData.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
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
  combatQueue: ICombatAction[] = [];
  combatAction: ICombatAction;
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

  initialize(){
    this.lastAttackObject = undefined;
    this.lastAttackAction = ActionType.ActionInvalid;
    this.lastForcePowerUsed = undefined;
    this.lastForcePowerSuccess = false;
  }

  reset(){
    this.initialize();
  }

  clearTarget(target: ModuleObject){
    this.lastAttackTarget = undefined;
    this.object.combatRound.clearActionsByTarget(target);
  }

  getEquippedWeaponType(){
    if(BitWise.InstanceOfObject(this.object, ModuleObjectType.ModuleCreature)){
      const owner: ModuleCreature = this.object as any;
      let lWeapon = owner.equipment.LEFTHAND;
      let rWeapon = owner.equipment.RIGHTHAND;
      let claw1 = owner.equipment.CLAW1;
      let claw2 = owner.equipment.CLAW2;
      let claw3 = owner.equipment.CLAW3;

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