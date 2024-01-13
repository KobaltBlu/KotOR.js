import { GameEffect } from "./GameEffect";
import { GameEffectType } from "../enums/effects/GameEffectType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { BitWise } from "../utility/BitWise";

/**
 * EffectDamage class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file EffectDamage.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class EffectDamage extends GameEffect {
  constructor(){
    super();
    this.type = GameEffectType.EffectDamage;
    
    this.setNumIntegers(21);
    this.intList.fill(-1, 0, 16);

    //intList[0] : -1 or Bludgeoning Damage Amount
    //intList[1] : -1 or Piercing Damage Amount
    //intList[2] : -1 or Slashing Damage Amount
    //intList[3] : -1 or Universal Damage Amount
    //intList[4] : -1 or Acid Damage Amount
    //intList[5] : -1 or Cold Damage Amount
    //intList[6] : -1 or Lightside Damage Amount
    //intList[7] : -1 or Electrical Damage Amount
    //intList[8] : -1 or Fire Damage Amount
    //intList[9] : -1 or Darkside Damage Amount
    //intList[10] : -1 or Sonic Damage Amount
    //intList[11] : -1 or Ion Damage Amount
    //intList[12] : -1 or Energy Damage Amount
    //intList[13] : -1 or Poison Damage Amount
    //intList[14] : -1 or Base Damage Amount
    //intList[15] : -1 or Physical Damage Amount    
    //intList[16] : 1000
    //intList[17] : Damage Type
    //intList[18] : Damage Power

  }

  onApply(){
    if(this.applied)
      return;
      
    super.onApply();
    
    if(BitWise.InstanceOf(this.object?.objectType, ModuleObjectType.ModuleObject)){
      this.object.subtractHP(this.getDamageAmount());
      this.object.combatData.lastDamager = this.creator;
      this.object.combatData.lastAttacker = this.creator;
    }
  }

  getDamageAmount(){
    return Math.min(Math.max(this.getInt(14), 1), 10000);
  }

  getDamageType(){
    return this.getInt(17);
  }

  getDamagePower(){
    return this.getInt(18);
  }

}
