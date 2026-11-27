import { GameEffect } from "@/effects/GameEffect";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";
import { DamageType } from "@/enums/combat/DamageType";
import { GameState } from "@/GameState";

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
  static readonly DAMAGE_SLOT_COUNT = 15;

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
    //intList[13] : -1 or Base Damage Amount
    //intList[14] : -1 or Physical Damage Amount
    //intList[15] : reserved
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
    const damageSlots = this.getDamageSlots();
    this.applyDamageImmunity(damageSlots);
    this.applyDamageResistance(damageSlots);
    this.applyDamageReduction(damageSlots);

    if(GameState.CheatConsoleManager && GameState.CheatConsoleManager.shouldApplyOnePunch(this.creator, this.object)){
      return GameState.CheatConsoleManager.getOnePunchDamage(this.object);
    }

    const totalDamage = damageSlots.reduce((sum, value) => sum + value, 0);
    return Math.min(Math.max(totalDamage, 0), 10000);
  }

  getDamageSlots(){
    const slots = new Array(EffectDamage.DAMAGE_SLOT_COUNT).fill(0);
    for(let i = 0; i < EffectDamage.DAMAGE_SLOT_COUNT; i++){
      const amount = this.getInt(i);
      slots[i] = Number.isFinite(amount) ? Math.max(amount, 0) : 0;
    }
    return slots;
  }

  getDamageFlagForSlot(slot: number){
    if(slot >= 0 && slot <= DamageType.ENERGY){
      return 1 << slot;
    }

    if(slot == DamageType.PHYSICAL){
      return (1 << DamageType.BLUDGEONING) | (1 << DamageType.PIERCING) | (1 << DamageType.SLASHING);
    }

    return 0;
  }

  effectMatchesDamageSlot(mask: number, slot: number){
    const flag = this.getDamageFlagForSlot(slot);
    if(flag == 0){
      return false;
    }
    return (mask & flag) !== 0;
  }

  applyDamageImmunity(damageSlots: number[]){
    if(!this.object){ return; }
    for(const effect of this.object.effects.slice()){
      if(effect.type != GameEffectType.EffectDamageImmunityIncrease){
        continue;
      }

      const mask = effect.getInt(0);
      const percent = Math.max(effect.getInt(1), 0);
      if(percent <= 0){
        continue;
      }

      for(let slot = 0; slot < damageSlots.length; slot++){
        if(damageSlots[slot] <= 0){
          continue;
        }
        if(this.effectMatchesDamageSlot(mask, slot)){
          damageSlots[slot] = Math.max(Math.floor(damageSlots[slot] * (100 - percent) / 100), 0);
        }
      }
    }
  }

  applyDamageResistance(damageSlots: number[]){
    if(!this.object){ return; }
    for(const effect of this.object.effects.slice()){
      if(effect.type != GameEffectType.EffectDamageResistance){
        continue;
      }

      const mask = effect.getInt(0);
      const resistAmount = Math.max(effect.getInt(1), 0);
      let remainingLimit = effect.getInt(2);
      if(resistAmount <= 0){
        continue;
      }

      for(let slot = 0; slot < damageSlots.length; slot++){
        if(damageSlots[slot] <= 0){
          continue;
        }
        if(!this.effectMatchesDamageSlot(mask, slot)){
          continue;
        }

        let reducibleAmount = Math.min(damageSlots[slot], resistAmount);
        if(remainingLimit > 0){
          reducibleAmount = Math.min(reducibleAmount, remainingLimit);
          remainingLimit -= reducibleAmount;
        }

        damageSlots[slot] = Math.max(damageSlots[slot] - reducibleAmount, 0);
        if(effect.getInt(2) > 0){
          effect.setInt(2, Math.max(remainingLimit, 0));
          if(effect.getInt(2) <= 0){
            this.object.removeEffect(effect);
            break;
          }
        }
      }
    }
  }

  applyDamageReduction(damageSlots: number[]){
    if(!this.object){ return; }

    const physicalSlots = [
      DamageType.BLUDGEONING,
      DamageType.PIERCING,
      DamageType.SLASHING,
      DamageType.BASE,
      DamageType.PHYSICAL,
    ];

    for(const effect of this.object.effects.slice()){
      if(effect.type != GameEffectType.EffectDamageReduction){
        continue;
      }

      let reductionRemaining = Math.max(effect.getInt(0), 0);
      let remainingLimit = effect.getInt(2);
      if(reductionRemaining <= 0){
        continue;
      }

      for(let j = 0; j < physicalSlots.length && reductionRemaining > 0; j++){
        const slot = physicalSlots[j];
        if(damageSlots[slot] <= 0){
          continue;
        }

        let reducibleAmount = Math.min(damageSlots[slot], reductionRemaining);
        if(remainingLimit > 0){
          reducibleAmount = Math.min(reducibleAmount, remainingLimit);
          remainingLimit -= reducibleAmount;
        }

        damageSlots[slot] = Math.max(damageSlots[slot] - reducibleAmount, 0);
        reductionRemaining -= reducibleAmount;

        if(effect.getInt(2) > 0){
          effect.setInt(2, Math.max(remainingLimit, 0));
          if(effect.getInt(2) <= 0){
            this.object.removeEffect(effect);
            break;
          }
        }
      }
    }
  }

  getDamageType(){
    return this.getInt(17);
  }

  getDamagePower(){
    return this.getInt(18);
  }

}
