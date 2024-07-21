import { CombatAttackDamage } from "./CombatAttackDamage";
import type { ModuleCreature, ModuleItem, ModuleObject } from "../module";
import { CExoLocString } from "../resource/CExoLocString";
import { GFFStruct } from "../resource/GFFStruct";
import { DamageType } from "../enums/combat/DamageType";
import { EffectDamage } from "../effects";
import { GameEffectDurationType } from "../enums/effects/GameEffectDurationType";
import { AttackResult } from "../enums/combat/AttackResult";
import { TalentFeat } from "../talents";
import { CombatFeatType } from "../enums/combat/CombatFeatType";
import { WeaponWield } from "../enums/combat/WeaponWield";
import { Dice } from "../utility/Dice";
import { DiceType } from "../enums/combat/DiceType";

/**
 * CombatAttackData class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CombatAttackData.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CombatAttackData {
  attackGroup: number = 0;
  animationLength: number = 1500;
  missedBy: ModuleObject;
  attackResult: AttackResult = AttackResult.MISS;
  reactObject: ModuleObject;
  reaxnDelay: number = 0;
  reaxnAnimation: number = 10001;
  reaxnAnimLength: number = 0;
  concealment: boolean = false;
  attackType: boolean = false;
  attackMode: number = 0;
  rangedAttack: boolean = false;
  sneakAttack: boolean = false;
  weaponAttackType: number = 0;
  rangedTargetX: number = 0;
  rangedTargetY: number = 0;
  rangedTargetZ: number = 0;
  damageList: CombatAttackDamage[] = new Array(15);
  killingBlow: boolean = false;
  coupDeGrace: boolean = false;
  criticalThreat: number = 0;
  attackDeflected: number = 0;
  ammoItem: ModuleObject;
  attackDebugText: CExoLocString;
  DamageDebugText: CExoLocString;

  attackWeapon: ModuleItem;

  constructor(){
    this.damageList = new Array(15);
    for(let i = 0; i < 15; i++){
      this.damageList[i] = new CombatAttackDamage();
    }
  }

  calculateDamage(creature: ModuleCreature, isCritial: boolean = false, feat?: TalentFeat){
    /**
     * Unarmed Strike
     */
    if(!this.attackWeapon){
      let damageMultiplier = isCritial ? 2.0 : 1.0;
      const nDamage = Dice.roll(1, DiceType.d4);
      this.damageList[DamageType.BLUDGEONING].addDamage(nDamage * damageMultiplier);

      return;
    };

    const damageMultiplier = isCritial ? this.attackWeapon.baseItem.criticalHitMultiplier : 1.0;

    if(!creature.isSimpleCreature()){
      this.damageList[this.attackWeapon.getBaseDamageType()].addDamage(this.attackWeapon.getBaseDamage() * damageMultiplier);
      if(this.attackWeapon.hasDamageBonus()){
        this.damageList[this.attackWeapon.getDamageBonusType()].addDamage(this.attackWeapon.getDamageBonus() * damageMultiplier);
      }

      if( 
        creature.getHasFeat(CombatFeatType.POWER_ATTACK) || 
        creature.getHasFeat(CombatFeatType.POWER_BLAST)
      ){
        this.damageList[DamageType.BASE].addDamage(5 * damageMultiplier);
      }

      if( 
        creature.getHasFeat(CombatFeatType.IMPROVED_POWER_ATTACK) || 
        creature.getHasFeat(CombatFeatType.IMPROVED_POWER_BLAST)
      ){
        this.damageList[DamageType.BASE].addDamage(8 * damageMultiplier);
      }

      if( 
        creature.getHasFeat(CombatFeatType.MASTER_POWER_ATTACK) || 
        creature.getHasFeat(CombatFeatType.MASTER_POWER_BLAST) 
      ){
        this.damageList[DamageType.BASE].addDamage(10 * damageMultiplier);
      }

      let specBonus = this.calculateWeaponSpecBonus(creature, this.attackWeapon);
      if(specBonus > 0){
        this.damageList[DamageType.BASE].addDamage(specBonus * damageMultiplier);
      }

    }else{
      this.damageList[this.attackWeapon.getBaseDamageType()].addDamage(this.attackWeapon.getMonsterDamage() * damageMultiplier);
      if(this.attackWeapon.hasDamageBonus()){
        this.damageList[this.attackWeapon.getDamageBonusType()].addDamage(this.attackWeapon.getDamageBonus() * damageMultiplier);
      }
    }

    //Add strength MOD to melee damage
    if(this.attackWeapon.getWeaponType() == 1){
      this.damageList[DamageType.PHYSICAL].addDamage( Math.floor(( creature.getSTR() - 10) / 2) );
    }

    if(this.getTotalDamage() >= this.reactObject.getHP()){
      this.killingBlow = true;
    }

  }

  calculateWeaponSpecBonus(creature: ModuleCreature, weapon: ModuleItem): number {
    let bonus = 0;
    if(!creature){ return; }
    
    switch(weapon.getWeaponWield()){
      case WeaponWield.BLASTER_PISTOL:
        if(creature.getHasFeat(CombatFeatType.WEAPON_SPEC_BLASTER)){
          bonus += 2;
        }
      break;
      case WeaponWield.BLASTER_RIFLE:
        if(creature.getHasFeat(CombatFeatType.WEAPON_SPEC_BLASTER_RIFLE)){
          bonus += 2;
        }
      break;
      case WeaponWield.BLASTER_HEAVY:
        if(creature.getHasFeat(CombatFeatType.WEAPON_SPEC_HEAVY_WEAPONS)){
          bonus += 2;
        }
      break;
      case WeaponWield.ONE_HANDED_SWORD:
      case WeaponWield.TWO_HANDED_SWORD:
      case WeaponWield.STUN_BATON:
        if(weapon.baseItemId == 8 || weapon.baseItemId == 9 || weapon.baseItemId == 10){
          if(creature.getHasFeat(CombatFeatType.WEAPON_SPEC_LIGHTSABER)){
            bonus += 2;
          }
        }else if(creature.getHasFeat(CombatFeatType.WEAPON_SPEC_MELEE_WEAPONS)){
          bonus += 2;
        }
      break;
    }
    return bonus;
  }

  applyDamageEffectToCreature(owner: ModuleCreature, target: ModuleCreature){
    if(!target) return;
    const damageEffect = new EffectDamage();
    damageEffect.setCreator(owner);

    for(let i = 0; i < 15; i++){
      const damage = this.damageList[i];
      damageEffect.setInt(i, damage.damageValue);
    }

    target.addEffect(damageEffect, GameEffectDurationType.INSTANT);
  }

  getTotalDamage(): number {
    let amount = 0;
    for(let i = 0; i < this.damageList.length; i++){
      const damage = this.damageList[i];
      if(damage.damageValue > 0){
        amount += damage.damageValue;
      }
    }
    return amount;
  }

  reset(){
    this.killingBlow = false;
    this.reactObject = undefined;
    this.attackWeapon = undefined;
    this.attackResult = AttackResult.MISS;
    for(let i = 0; i < this.damageList.length; i++){
      this.damageList[i].reset();
    }
  }

  toStruct(structIdx: number = -1){
    const struct = new GFFStruct(structIdx);

    return struct;
  }

}