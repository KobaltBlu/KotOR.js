import { CombatAttackDamage } from "@/combat/CombatAttackDamage";
import type { ModuleCreature, ModuleItem, ModuleObject } from "@/module";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFStruct } from "@/resource/GFFStruct";
import { DamageType } from "@/enums/combat/DamageType";
import { EffectDamage } from "@/effects";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { AttackResult } from "@/enums/combat/AttackResult";
import { TalentFeat } from "@/talents";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { Dice } from "@/utility/Dice";
import { DiceType } from "@/enums/combat/DiceType";

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
  /**
   * The attack group for the attack
   */
  attackGroup: number = 0;

  /**
   * The animation length for the attack
   */
  animationLength: number = 1500;

  /**
   * The missed by object for the attack
   */
  missedBy: ModuleObject = undefined;

  /**
   * The attack result for the attack
   */
  attackResult: AttackResult = AttackResult.MISS;

  /**
   * The reaction object for the attack
   */
  reactObject: ModuleObject = undefined;

  /**
   * The reaction delay for the attack
   */
  reaxnDelay: number = 0;

  /**
   * The reaction animation for the attack
   */
  reaxnAnimation: number = 10001;

  /**
   * The reaction animation length for the attack
   */
  reaxnAnimLength: number = 0;

  /**
   * Whether the attack is concealed
   */
  concealment: boolean = false;

  /**
   * Whether the attack is a type attack
   */
  attackType: boolean = false;

  /**
   * The attack mode for the attack
   */
  attackMode: number = 0;

  /**
   * Whether the attack is a ranged attack
   */
  rangedAttack: boolean = false;

  /**
   * Whether the attack is a sneak attack
   */
  sneakAttack: boolean = false;

  /**
   * The weapon attack type for the attack
   */
  weaponAttackType: number = 0;

  /**
   * The ranged target X coordinate
   */
  rangedTargetX: number = 0;

  /**
   * The ranged target Y coordinate
   */
  rangedTargetY: number = 0;

  /**
   * The ranged target Z coordinate
   */
  rangedTargetZ: number = 0;

  /**
   * The damage list for the attack
   */
  damageList: CombatAttackDamage[] = new Array(15);

  /**
   * The killing blow for the attack
   */
  killingBlow: boolean = false;

  /**
   * The coup de grace for the attack
   */
  coupDeGrace: boolean = false;

  /**
   * The critical threat for the attack
   */
  criticalThreat: number = 0;

  /**
   * The attack deflected for the attack
   */
  attackDeflected: number = 0;

  /**
   * The ammo item that is being used for the attack
   */
  ammoItem: ModuleObject = undefined;

  /**
   * The debug text for the attack
   */
  attackDebugText: CExoLocString;

  /**
   * The debug text for the damage
   */
  DamageDebugText: CExoLocString;

  /**
   * The weapon that is being used for the attack
   */
  attackWeapon: ModuleItem;

  /**
   * Milliseconds remaining before damage/feedback should apply.
   */
  damageApplyDelay: number = -1;

  /**
   * Whether damage/feedback has already been signaled for this attack.
   */
  damageApplied: boolean = false;

  /**
   * Constructor for the CombatAttackData class
   */
  constructor(){
    this.damageList = new Array(15);
    for(let i = 0; i < 15; i++){
      this.damageList[i] = new CombatAttackDamage();
    }
  }

  /**
   * Calculate the damage for the combat attack data
   * @param creature - The creature to calculate the damage for
   * @param isCritial - Whether the attack is a critical hit
   * @param feat - The feat that is being used for the attack
   */
  calculateDamage(creature: ModuleCreature, isCritial: boolean = false, feat?: TalentFeat){
    const critMultiplier = isCritial
      ? creature.combatRound.getCriticalHitMultiplier(this.attackWeapon, feat, creature)
      : 1;

    // Unarmed: roll weapon dice once per critical-hit multiplier
    if(!this.attackWeapon){
      for(let i = 0; i < critMultiplier; i++){
        this.damageList[DamageType.BLUDGEONING].addDamage(Dice.roll(1, DiceType.d4));
      }
      const strMod = CombatAttackData.GetAbilityMod(creature.getSTR());
      for(let i = 0; i < critMultiplier; i++){
        this.damageList[DamageType.PHYSICAL].addDamage(strMod);
      }
      this.ensureMinimumDamage();
      this.updateKillingBlow();
      return;
    }

    this.rangedAttack = !!this.attackWeapon.isRangedWeapon();

    // Roll weapon dice once per critical-hit multiplier
    if(!creature.isSimpleCreature()){
      for(let i = 0; i < critMultiplier; i++){
        this.damageList[this.attackWeapon.getBaseDamageType()].addDamage(this.attackWeapon.getBaseDamage());
      }
      if(this.attackWeapon.hasDamageBonus()){
        for(let i = 0; i < critMultiplier; i++){
          this.damageList[this.attackWeapon.getDamageBonusType()].addDamage(this.attackWeapon.getDamageBonus());
        }
      }

      // Active special-attack feat damage bonus only
      const specialDamage = feat?.getDamageBonus?.() || 0;
      if(specialDamage > 0){
        for(let i = 0; i < critMultiplier; i++){
          this.damageList[DamageType.BASE].addDamage(specialDamage);
        }
      }

      const specBonus = this.calculateWeaponSpecBonus(creature, this.attackWeapon);
      if(specBonus > 0){
        for(let i = 0; i < critMultiplier; i++){
          this.damageList[DamageType.BASE].addDamage(specBonus);
        }
      }
    }else{
      for(let i = 0; i < critMultiplier; i++){
        this.damageList[this.attackWeapon.getBaseDamageType()].addDamage(this.attackWeapon.getMonsterDamage());
      }
      if(this.attackWeapon.hasDamageBonus()){
        for(let i = 0; i < critMultiplier; i++){
          this.damageList[this.attackWeapon.getDamageBonusType()].addDamage(this.attackWeapon.getDamageBonus());
        }
      }
    }

    // STR mod for non-ranged attacks (full amount per crit multiplier)
    if(!this.rangedAttack){
      const strMod = CombatAttackData.GetAbilityMod(creature.getSTR());
      for(let i = 0; i < critMultiplier; i++){
        this.damageList[DamageType.PHYSICAL].addDamage(strMod);
      }
    }

    // Sneak Attack: Nd6 for the highest known sneak feat
    if(this.sneakAttack){
      let sneakDice = 0;
      for(let i = CombatFeatType.SNEAK_ATTACK_10D6; i >= CombatFeatType.SNEAK_ATTACK_1D6; i--){
        if(creature.getHasFeat(i)){
          sneakDice = i - CombatFeatType.SNEAK_ATTACK_1D6 + 1;
          break;
        }
      }
      if(sneakDice > 0){
        this.damageList[DamageType.BASE].addDamage(Dice.roll(sneakDice, DiceType.d6));
      }
    }

    this.ensureMinimumDamage();
    this.updateKillingBlow();
  }

  private ensureMinimumDamage(){
    // Floor resolved damage to at least 1 before resist/reduction
    if(this.getTotalDamage() < 1){
      this.damageList[DamageType.BASE].setDamage(1);
    }
  }

  private updateKillingBlow(){
    if(this.reactObject && this.getTotalDamage() >= this.reactObject.getHP()){
      this.killingBlow = true;
    }
  }

  /**
   * Calculate the weapon specialization bonus
   * @param creature - The creature to calculate the weapon specialization bonus for
   * @param weapon - The weapon to calculate the weapon specialization bonus for
   * @returns The weapon specialization bonus
   */
  calculateWeaponSpecBonus(creature: ModuleCreature, weapon: ModuleItem): number {
    let bonus = 0;
    if(!creature){ return 0; }
    
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

  /**
   * Apply the damage effect to the target creature
   * @param owner - The owner of the damage effect
   * @param target - The target creature to apply the damage effect to
   */
  applyDamageEffectToCreature(owner: ModuleCreature, target: ModuleCreature){
    if(!target) return;
    const damageEffect = new EffectDamage();
    damageEffect.setCreator(owner);

    for(let i = 0; i < 15; i++){
      const damage = this.damageList[i];
      damageEffect.setInt(i, damage.damageValue);
    }

    target.addEffect(damageEffect, GameEffectDurationType.INSTANT);
    this.damageApplied = true;
  }

  /**
   * Get the total damage of the combat attack data
   * @returns The total damage
   */
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

  /**
   * Reset the combat attack data
   */
  reset(){
    this.killingBlow = false;
    this.reactObject = undefined;
    this.attackWeapon = undefined;
    this.attackResult = AttackResult.MISS;
    this.rangedAttack = false;
    this.damageApplyDelay = -1;
    this.damageApplied = false;
    for(let i = 0; i < this.damageList.length; i++){
      this.damageList[i].reset();
    }
  }

  /**
   * Convert the combat attack data to a GFF struct
   * @param structIdx - The index of the struct
   * @returns The GFF struct
   */
  toStruct(structIdx: number = -1){
    const struct = new GFFStruct(structIdx);

    return struct;
  }

  static GetAbilityMod(abilityScore: number = 10): number {
    return Math.floor((abilityScore - 10) / 2);
  }

}
