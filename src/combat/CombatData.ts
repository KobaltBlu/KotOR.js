import { CombatRoundData } from "./";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleCreature, ModuleObject } from "../module";

export class CombatData {
  object: ModuleObject;
  
  combatRoundData: CombatRoundData;
  
  lastAttemptedAttackTarget: ModuleObject;
  lastAttackTarget: ModuleObject;
  lastSpellTarget: ModuleObject;
  lastAttemptedSpellTarget: ModuleObject;
  lastSpellAttacker: ModuleObject;
  lastAttackAction: ActionType;

  lastCombatFeatUsed: any;
  lastForcePowerUsed: any;
  lastAttackResult: any;
  combatQueue: any[];
  combatAction: any;
  _lastAttackObject: any;
  _lastAttackAction: number;
  _lastForcePowerUsed: number;
  _lastForcePowerSuccess: number;
  initiative: number;
  lastDamager: any;
  lastAttacker: any;

  //combat
  combatActionTimer: number;
  combatState: boolean;

  constructor(object: ModuleObject){
    this.object = object;
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

    return 0;
  }

}