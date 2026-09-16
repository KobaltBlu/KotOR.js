import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import type { TalentFeat, TalentSpell } from "@/talents";
import { ICombatAction } from "@/interface/combat/ICombatAction";
import { AttackResult } from "@/enums/combat/AttackResult";
import { ActionType } from "@/enums/actions/ActionType";
import { WeaponType } from "@/enums/combat/WeaponType";

import { isCreature } from "@/module/guards/isCreature";

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
  /**
   * module object.last_hostile_actor_id — set by assign hostile actor on
   * attacked / damage / harmful spell-at. Used by get hostile actor (not
   * lastAttackTarget).
   */
  lastHostileActor: ModuleObject;
  /** Last weapon used in an attack (GetLastWeaponUsed). */
  lastWeaponUsed: ModuleObject;
  /** Raw combat-feat id from last attack; GetLastAttackType maps Flurry/Rapid Shot. */
  lastAttackType: number = 0;
  /** Raw CombatMode from last attack; GetLastAttackMode maps to COMBAT_MODE_*. */
  lastAttackMode: number = 0;
  /** Last associate command issued (GetLastAssociateCommand). */
  lastAssociateCommand: number = 0;
  /**
   * Last damage amounts by DAMAGE_TYPE bit index 0..14
   * (GetDamageDealtByType / GetTotalDamageDealt).
   */
  lastDamageAmounts: number[] = new Array(15).fill(0);

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

  /**
   * Explicit combat-target teardown (SetCombatState(0) / cancelCombat).
   * Not used by ClearAllActions — attack/spell targets are kept so
   * OnEndRound AI (GN_EquipAppropriateWeapon) can still read GetAttackTarget.
   */
  reset(){
    this.initialize();
    this.lastAttemptedAttackTarget = undefined;
    this.lastAttackTarget = undefined;
    this.lastSpellTarget = undefined;
    this.lastAttemptedSpellTarget = undefined;
  }

  clearTarget(target: ModuleObject){
    this.lastAttackTarget = undefined;
    this.object.combatRound.clearActionsByTarget(target);
  }

  /**
   * AddAttackActions / AddAttackAction / queue cutscene attack —
   * sticky attempted target: set only when currently INVALID (unset).
   */
  setAttemptedAttackTargetIfInvalid(target: ModuleObject): void {
    if(!target) return;
    if(!this.lastAttemptedAttackTarget){
      this.lastAttemptedAttackTarget = target;
    }
  }

  getEquippedWeaponType(){
    if(isCreature(this.object)){
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