import { CombatAttackDamage } from "@/combat/CombatAttackDamage";
import type { ModuleCreature, ModuleItem, ModuleObject } from "@/module";
import { CExoLocString } from "@/resource/CExoLocString";
import { GFFStruct } from "@/resource/GFFStruct";
import { GFFField } from "@/resource/GFFField";
import { GFFDataType } from "@/enums/resource/GFFDataType";
import { ModuleObjectConstant } from "@/enums/module/ModuleObjectConstant";
import { DamageType } from "@/enums/combat/DamageType";
import { EffectDamage } from "@/effects/EffectDamage";
import type { GameEffect } from "@/effects/GameEffect";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { AttackResult } from "@/enums/combat/AttackResult";
import type { TalentFeat } from "@/talents/TalentFeat";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { WeaponWield } from "@/enums/combat/WeaponWield";
import { Dice } from "@/utility/Dice";
import { DiceType } from "@/enums/combat/DiceType";
import {
  damageFlagsFromChannels,
  mitigateDamageAmount,
  scaleDamageChannels,
} from "@/combat/damage-mitigation";
import { getDamageIncreaseBonusesByChannel } from "@/effects/effect-bonuses";
import type { EffectDamageShield } from "@/effects/EffectDamageShield";
import { GameEffectType } from "@/enums/effects/GameEffectType";
import { ModuleItemProperty } from "@/enums/module/ModuleItemProperty";
import { CombatMode } from "@/enums/combat/CombatMode";
import {
  damageTypeFlagToChannel,
  resolveDamageBonusCode,
} from "@/combat/damage-bonus";
import {
  getWeaponMaxDice,
  weightWeaponDiceRoll,
} from "@/combat/diff-settings";
import { GameState } from "@/GameState";
import {
  lookupCombatObjectById,
  normalizeCombatObjectId,
} from "@/combat/resolve-combat-object-id";

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
  /** Saved MissedBy DWORD for deferred resolve. */
  missedByObjectId: number = 0;

  /**
   * The attack result for the attack
   */
  attackResult: AttackResult = AttackResult.MISS;

  /**
   * The reaction object for the attack
   */
  reactObject: ModuleObject = undefined;
  /** Saved ReactObject DWORD for deferred resolve. */
  reactObjectId: number = 0;

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
   * On-hit effects queued by Resolve*SpecialAttack (e.g. Crit Strike stun).
   * Applied with damage at impact time (retail attack effect list @ +0x88).
   */
  pendingOnHitEffects: GameEffect[] = [];

  /**
   * Attack roll total (d20 + modifiers) for status-summary feedback.
   * Retail Attack-data fields packed as CC ints[2].
   */
  toHitTotal: number = 0;

  /**
   * Target defense / AC for status-summary feedback (CC ints[3]).
   */
  targetDefense: number = 0;

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
  /** Saved AmmoItem DWORD for deferred resolve. */
  ammoItemObjectId: number = 0;

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
   * SetState type stamped by OnApplySetStateInternal
   * (FORCEPUSH=9) for attack-summary feedback.
   */
  setStateType: number = 0;

  /**
   * True when a SetState effect was applied during this attack.
   */
  setStateApplied: boolean = false;

  /**
   * Whether the traveling bolt / ShotSound has been spawned at muzzle time.
   */
  projectileSpawned: boolean = false;

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
        const unarmedRoll = Dice.roll(1, DiceType.d4);
        const weighted = weightWeaponDiceRoll(
          unarmedRoll,
          4,
          creature,
          this.reactObject
        );
        this.damageList[DamageType.BLUDGEONING].addDamage(weighted);
      }
      const strMod = CombatAttackData.GetAbilityMod(creature.getSTR());
      for(let i = 0; i < critMultiplier; i++){
        this.damageList[DamageType.PHYSICAL].addDamage(strMod);
      }
      const unarmedChannels = getDamageIncreaseBonusesByChannel(creature);
      for(let ch = 0; ch < unarmedChannels.length; ch++){
        const amount = unarmedChannels[ch];
        if(amount){
          this.damageList[ch].addDamage(amount);
        }
      }
      this.ensureMinimumDamage();
      this.updateKillingBlow();
      return;
    }

    this.rangedAttack = !!this.attackWeapon.isRangedWeapon();

    // Roll weapon dice once per critical-hit multiplier
    if(!creature.isSimpleCreature()){
      const maxDice = getWeaponMaxDice(this.attackWeapon);
      for(let i = 0; i < critMultiplier; i++){
        const baseRoll = this.attackWeapon.getBaseDamage();
        const weighted = weightWeaponDiceRoll(
          baseRoll,
          maxDice,
          creature,
          this.reactObject
        );
        this.damageList[this.attackWeapon.getBaseDamageType()].addDamage(weighted);
      }
      if(this.attackWeapon.hasDamageBonus()){
        for(let i = 0; i < critMultiplier; i++){
          this.damageList[this.attackWeapon.getDamageBonusType()].addDamage(this.attackWeapon.getDamageBonus());
        }
      }

      // Retail GetDamageBonus — combat-mode Power Attack (mode 2=+5, 3=+10)
      // plus ResolveSpecialAttackDamageBonus (feat attack_type).
      const modeDamage = CombatAttackData.getCombatModeDamageBonus(creature);
      const specialDamage = (feat?.getDamageBonus?.() || 0) + modeDamage;
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

      // Retail GetDamageRoll Massive Criticals (IP 0x31) — once on crit, not × multiplier
      if(isCritial){
        const massive = CombatAttackData.getMassiveCriticalBonus(this.attackWeapon);
        if(massive > 0){
          this.damageList[DamageType.BASE].addDamage(massive);
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

    // EffectDamageIncrease / Decrease via iprp_damagecost (DAMAGE_BONUS_*)
    const effectChannels = getDamageIncreaseBonusesByChannel(creature, {
      critMultiplier,
    });
    for(let ch = 0; ch < effectChannels.length; ch++){
      const amount = effectChannels[ch];
      if(amount){
        this.damageList[ch].addDamage(amount);
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
   * Retail ResolveDamage resultsCalculated path — SetBaseDamage + SetDamage.
   * SetBaseDamage writes damage_list[0xE] (PHYSICAL); SetDamage writes the
   * weapon GetDamageFlags channel (flags 1 when unarmed).
   */
  setScriptedCutsceneDamage(amount: number, weapon?: ModuleItem){
    const scripted = amount | 0;
    if(scripted < 0) return;

    // SetBaseDamage @ 004d2030
    const base = this.damageList[DamageType.PHYSICAL];
    if(base.damageValue > 0){
      base.addDamage(scripted);
    }else{
      base.setDamage(scripted);
    }

    // SetDamage(GetDamageFlags, amount) @ 004d2070 / GetDamageFlags @ 004ed5e0
    const flags = (weapon?.getDamageFlags?.() ?? 0) | 0;
    const channel = damageTypeFlagToChannel(flags || 1);
    this.damageList[channel].setDamage(scripted);
  }

  /**
   * Apply the damage effect to the target creature
   * @param owner - The owner of the damage effect
   * @param target - The target creature to apply the damage effect to
   * @param opts.scriptedResults - CutsceneAttack: skip mitigate / on-hit effects
   */
  applyDamageEffectToCreature(
    owner: ModuleCreature,
    target: ModuleCreature,
    opts?: { scriptedResults?: boolean }
  ){
    if(!target) return;

    const scripted = !!opts?.scriptedResults;

    // Retail GetDamageRoll: Immunity → Resistance → Reduction before packaging.
    // SignalMeleeDamage sets int[19]=1 so OnApplyDamage skips a second pass.
    // Scripted ResolveDamage stamps raw amount (no mitigate); EffectDamage still
    // zeroes plot on apply.
    if(!scripted){
      if(target.plot){
        for(let i = 0; i < 15; i++){
          this.damageList[i].setDamage(0);
        }
      }else{
        const channels: number[] = new Array(15);
        for(let i = 0; i < 15; i++){
          channels[i] = this.damageList[i].damageValue;
        }
        const flags = damageFlagsFromChannels(channels);
        const mitigated = mitigateDamageAmount(target, this.getTotalDamage(), flags, 0);
        scaleDamageChannels(channels, mitigated);
        for(let i = 0; i < 15; i++){
          this.damageList[i].setDamage(channels[i]);
        }
      }
    }

    const damageEffect = new EffectDamage();
    damageEffect.setCreator(owner);

    for(let i = 0; i < 15; i++){
      const damage = this.damageList[i];
      damageEffect.setInt(i, damage.damageValue);
    }
    damageEffect.setInt(19, 1);

    target.addEffect(damageEffect, GameEffectDurationType.INSTANT);
    // Retail ResolveDamageShields after mitigated combat damage
    if(owner && !target.plot && this.getTotalDamage() > 0){
      CombatAttackData.resolveDamageShields(target, owner);
    }
    // Retail Signal*Damage applies queued special-attack effects (SETSTATE stun, etc.)
    // Scripted ResolveDamage skips ResolveOnHitEffect — do not apply pending on-hit.
    if(!scripted){
      for(let i = 0; i < this.pendingOnHitEffects.length; i++){
        const onHit = this.pendingOnHitEffects[i];
        if(onHit) target.addEffect(onHit);
      }
    }
    this.pendingOnHitEffects.length = 0;
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
    this.projectileSpawned = false;
    this.pendingOnHitEffects.length = 0;
    for(let i = 0; i < this.damageList.length; i++){
      this.damageList[i].reset();
    }
  }

  /**
   * Convert the combat attack data to a GFF struct
   * Retail SaveData (list element type 0xAAEE)
   * @param structIdx - The index of the struct
   * @returns The GFF struct
   */
  toStruct(structIdx: number = 0xAAEE){
    const struct = new GFFStruct(structIdx);
    struct.addField(new GFFField(GFFDataType.BYTE, 'AttackGroup')).setValue(this.attackGroup || 0);
    struct.addField(new GFFField(GFFDataType.WORD, 'AnimationLength')).setValue(this.animationLength || 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'MissedBy')).setValue(
      this.missedBy?.id ?? ModuleObjectConstant.OBJECT_INVALID
    );
    struct.addField(new GFFField(GFFDataType.BYTE, 'AttackResult')).setValue(this.attackResult || 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'ReactObject')).setValue(
      this.reactObject?.id ?? ModuleObjectConstant.OBJECT_INVALID
    );
    struct.addField(new GFFField(GFFDataType.WORD, 'ReaxnDelay')).setValue(this.reaxnDelay || 0);
    struct.addField(new GFFField(GFFDataType.WORD, 'ReaxnAnimation')).setValue(this.reaxnAnimation || 0);
    struct.addField(new GFFField(GFFDataType.WORD, 'ReaxnAnimLength')).setValue(this.reaxnAnimLength || 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'Concealment')).setValue(this.concealment ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.WORD, 'AttackType')).setValue(this.attackType ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'AttackMode')).setValue(this.attackMode || 0);
    struct.addField(new GFFField(GFFDataType.INT, 'RangedAttack')).setValue(this.rangedAttack ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.INT, 'SneakAttack')).setValue(this.sneakAttack ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'WeaponAttackType')).setValue(this.weaponAttackType || 0);
    struct.addField(new GFFField(GFFDataType.FLOAT, 'RangedTargetX')).setValue(this.rangedTargetX || 0);
    struct.addField(new GFFField(GFFDataType.FLOAT, 'RangedTargetY')).setValue(this.rangedTargetY || 0);
    struct.addField(new GFFField(GFFDataType.FLOAT, 'RangedTargetZ')).setValue(this.rangedTargetZ || 0);

    const damageList = struct.addField(new GFFField(GFFDataType.LIST, 'DamageList'));
    for(let i = 0; i < 15; i++){
      const dmgStruct = new GFFStruct(0xDAEE);
      const val = this.damageList[i]?.damageValue ?? -1;
      dmgStruct.addField(new GFFField(GFFDataType.SHORT, 'DamageValue')).setValue(val);
      damageList.addChildStruct(dmgStruct);
    }

    struct.addField(new GFFField(GFFDataType.BYTE, 'KillingBlow')).setValue(this.killingBlow ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'CoupDeGrace')).setValue(this.coupDeGrace ? 1 : 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'CriticalThreat')).setValue(this.criticalThreat || 0);
    struct.addField(new GFFField(GFFDataType.BYTE, 'AttackDeflected')).setValue(this.attackDeflected || 0);
    struct.addField(new GFFField(GFFDataType.DWORD, 'AmmoItem')).setValue(
      this.ammoItem?.id ?? ModuleObjectConstant.OBJECT_INVALID
    );
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'AttackDebugText')).setValue('');
    struct.addField(new GFFField(GFFDataType.CEXOSTRING, 'DamageDebugText')).setValue('');
    return struct;
  }

  /**
   * Retail LoadData 
   */
  fromStruct(struct: GFFStruct){
    if(!struct) return;
    const get = (label: string, fallback: number = 0) =>
      struct.hasField(label) ? struct.getFieldByLabel(label).getValue() : fallback;

    this.attackGroup = get('AttackGroup');
    this.animationLength = get('AnimationLength', 1500);
    this.attackResult = get('AttackResult', AttackResult.MISS);
    this.reaxnDelay = get('ReaxnDelay');
    this.reaxnAnimation = get('ReaxnAnimation', 10001);
    this.reaxnAnimLength = get('ReaxnAnimLength');
    this.concealment = !!get('Concealment');
    this.attackType = !!get('AttackType');
    this.attackMode = get('AttackMode');
    this.rangedAttack = !!get('RangedAttack');
    this.sneakAttack = !!get('SneakAttack');
    this.weaponAttackType = get('WeaponAttackType');
    this.rangedTargetX = get('RangedTargetX');
    this.rangedTargetY = get('RangedTargetY');
    this.rangedTargetZ = get('RangedTargetZ');
    this.killingBlow = !!get('KillingBlow');
    this.coupDeGrace = !!get('CoupDeGrace');
    this.criticalThreat = get('CriticalThreat');
    this.attackDeflected = get('AttackDeflected');

    const missedById = get('MissedBy', ModuleObjectConstant.OBJECT_INVALID);
    const reactId = get('ReactObject', ModuleObjectConstant.OBJECT_INVALID);
    const ammoId = get('AmmoItem', ModuleObjectConstant.OBJECT_INVALID);
    this.missedByObjectId = normalizeCombatObjectId(missedById);
    this.reactObjectId = normalizeCombatObjectId(reactId);
    this.ammoItemObjectId = normalizeCombatObjectId(ammoId);
    this.missedBy = lookupCombatObjectById(this.missedByObjectId);
    this.reactObject = lookupCombatObjectById(this.reactObjectId);
    this.ammoItem = lookupCombatObjectById(this.ammoItemObjectId);

    if(struct.hasField('DamageList')){
      const list = struct.getFieldByLabel('DamageList').getChildStructs();
      for(let i = 0; i < 15; i++){
        if(!this.damageList[i]) this.damageList[i] = new CombatAttackDamage();
        if(list[i]?.hasField('DamageValue')){
          this.damageList[i].setDamage(list[i].getFieldByLabel('DamageValue').getValue());
        }else{
          this.damageList[i].reset();
        }
      }
    }
  }

  /**
   * Re-resolve MissedBy / ReactObject / AmmoItem after all creatures are registered.
   */
  resolveObjectReferences(){
    if(this.missedByObjectId && !this.missedBy){
      this.missedBy = lookupCombatObjectById(this.missedByObjectId);
    }
    if(this.reactObjectId && !this.reactObject){
      this.reactObject = lookupCombatObjectById(this.reactObjectId);
    }
    if(this.ammoItemObjectId && !this.ammoItem){
      this.ammoItem = lookupCombatObjectById(this.ammoItemObjectId);
    }
  }

  static GetAbilityMod(abilityScore: number = 10): number {
    return Math.floor((abilityScore - 10) / 2);
  }

  /** Retail GetDamageBonus combat-mode branch — modes 2/3. */
  static getCombatModeDamageBonus(creature: ModuleCreature): number {
    if(creature.combatMode === CombatMode.MODE_2) return 5;
    if(creature.combatMode === CombatMode.MODE_3) return 10;
    return 0;
  }

  /** Retail Massive Criticals item property (0x31) via iprp_damagecost. */
  static getMassiveCriticalBonus(weapon: ModuleItem | undefined): number {
    if(!weapon?.properties) return 0;
    for(let i = 0; i < weapon.properties.length; i++){
      const property = weapon.properties[i];
      if(!property?.isUseable?.() || !property.is?.(ModuleItemProperty.Massive_Criticals)){
        continue;
      }
      return resolveDamageBonusCode(property.costValue | 0);
    }
    return 0;
  }

  /** Retail ResolveDamageShields after mitigated combat damage lands. */
  static resolveDamageShields(defender: ModuleCreature, attacker: ModuleCreature){
    if(!defender || !attacker || defender === attacker || attacker.plot) return;

    const effects = defender.effects || [];
    for(let i = 0; i < effects.length; i++){
      const effect = effects[i];
      if(effect?.type !== GameEffectType.EffectDamageShield) continue;

      const shield = effect as EffectDamageShield;
      let amount = shield.getFlatAmount?.() ?? (effect.getInt(0) || 0);
      const diceCode = shield.getDiceBonusCode?.() ?? (effect.getInt(1) || 0);
      if(diceCode > 0){
        amount += resolveDamageBonusCode(diceCode);
      }
      if(amount < 1) amount = 1;

      const typeFlags = shield.getDamageTypeFlags?.() ?? (effect.getInt(2) || 0);
      const damageEffect = new EffectDamage();
      damageEffect.setCreator(defender);
      damageEffect.setInt(damageTypeFlagToChannel(typeFlags), amount);
      damageEffect.setInt(19, 0);
      damageEffect.setInt(20, 1);
      attacker.addEffect(damageEffect, GameEffectDurationType.INSTANT);
    }
  }

}
