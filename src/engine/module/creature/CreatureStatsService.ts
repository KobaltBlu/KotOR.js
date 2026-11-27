import { GameEffectType } from '@core/enums/effects/GameEffectType';
import { isFlatFootedByAIState } from "@engine/module/creature/ai-state";
import { WeaponType } from '@core/enums/combat/WeaponType';
import { WeaponWield } from '@core/enums/combat/WeaponWield';
import { CombatFeatType } from '@core/enums/combat/CombatFeatType';
import { ExperienceType } from '@engine/enums/engine/ExperienceType';
import { UIIconTimerType } from '@engine/enums/engine/UIIconTimerType';
import { SkillType } from '@core/enums/nwscript/SkillType';
import { CExoLocString } from '@core/resource/CExoLocString';
import { Dice } from '@core/utility/Dice';
import { DiceType } from '@core/enums/combat/DiceType';
import {
  getAbilityEffectBonus,
  getAttackEffectBonus,
  getForceResistanceBonus,
  getSavingThrowEffectBonus,
} from '@engine/effects/effect-bonuses';
import { isCreatureBlind } from '@engine/effects/EffectBlindness';
import { hasImmunityType } from '@engine/effects/haste-slow';
import { getAbilityModifier } from '@engine/rules/skill-points';
import {
  combineSavingThrow,
  rollSavingThrow,
  savingThrowTypeToImmunity,
} from '@engine/module/savingThrow/savingThrowMath';
import type { SWCreatureAppearance } from '@engine/rules/SWCreatureAppearance';
import { TalentFeat } from '@engine/talents/TalentFeat';
import { TalentObject } from '@engine/talents/TalentObject';
import { TalentSkill } from '@engine/talents/TalentSkill';
import { TalentSpell } from '@engine/talents/TalentSpell';
import { TalentObjectType } from '@engine/enums/engine/TalentObjectType';
import { CombatRound } from '@engine/combat';
import { GameState } from '@engine/runtime/GameState';
import type { Creature } from '@engine/module/Creature';
import { GameObject } from '@engine/module/GameObject';
import { isCreature } from '@engine/module/guards/isCreature';
import { isDoor } from '@engine/module/guards/isDoor';
import { isPlaceable } from '@engine/module/guards/isPlaceable';
import type { GameObject as GameObjectType } from '@engine/module/GameObject';
import {
  getDefaultRuntimeContext,
  type GameObjectRuntimeContext,
} from '@engine/runtime/context';

export class CreatureStatsService {
  constructor(
    private readonly host: Creature,
    private readonly runtime: GameObjectRuntimeContext = getDefaultRuntimeContext(),
  ) {}

  updateRegen(delta = 0){
    this.host.regenTimer -= delta;
    if(this.host.regenTimer <= 0){
      this.host.regenTimer = this.host.regenTimerMax;

      const regeneration = this.runtime.getSWRuleSet?.()?.regenerations?.[
        this.host.combatData.combatState ? 0 : 1
      ];
      if(regeneration){
        if(Number.isFinite(regeneration.forceregen)){
          this.host.addFP(Math.abs(regeneration.forceregen));
        }

        if(Number.isFinite(regeneration.healthregen) && !GameState.PartyManager.DisableHealthRegen){
          this.host.addHP(Math.abs(regeneration.healthregen));
        }
      }
    }
  }

  getXP(){
    return this.host.experience;
  }

  setXP(value = 0){
    this.host.experience = value;
  }

  addXP(value = 0, xpType: ExperienceType = ExperienceType.PLOT){
    this.host.experience += parseInt(value.toString());
    if(this.host.isPartyMember()){
      GameState.UINotificationManager.EnableUINotificationIconType(xpType == ExperienceType.PLOT ? UIIconTimerType.PLOT_XP_RECEIVED : UIIconTimerType.STEALTH_XP_RECEIVED);
    }
  }

  getSubraceIndex(){
    return this.host.subraceIndex;
  }

  setHP(nAmount = 0){
    // Keep currentHitPoints consistent with getHP for every subrace.
    // Default: getHP = maxHitPoints + currentHitPoints - hitPoints
    // Wookiee/Beast: getHP = hitPoints + currentHitPoints
    // EffectDeath setHP(-11) used only the default inversion, so beast NPCs
    // (e.g. Calo on Taris) stayed at positive HP with EffectDeath applied
    // GetIsObjectValid stayed true and k_ptar_ramp never started tar08_ramp.
    switch(this.host.subraceIndex){
      case 1: // WOOKIE
      case 2: // BEAST
        this.host.currentHitPoints = nAmount - this.host.hitPoints;
        break;
      default:
        this.host.currentHitPoints = nAmount - (this.host.maxHitPoints - this.host.hitPoints);
        break;
    }
  }

  addHP(nAmount = 0, ignoreMaxHitPoints = false){
    if(ignoreMaxHitPoints){
      this.host.currentHitPoints += nAmount;
    }else{
      let currentHP = this.host.getHP();
      if(currentHP < this.host.getMaxHP()){
        if(currentHP + nAmount > this.host.getMaxHP()){
          this.host.currentHitPoints += nAmount + (this.host.getMaxHP() - (currentHP + nAmount));
        }else{
          this.host.currentHitPoints += nAmount;
        }
      }
    }

    if(this.host.min1HP && this.host.getHP() < 1)
      this.host.setHP(1);
  }

  subtractHP(nAmount = 0){
    this.host.currentHitPoints -= nAmount;
    if(this.host.min1HP && this.host.getHP() < 1)
      this.host.setHP(1);
  }

  getHP(){
    switch(this.host.subraceIndex){
      case 0: //NONE
        return (this.host.maxHitPoints + this.host.currentHitPoints) - this.host.hitPoints;
      case 1: //WOOKIE
      case 2: //BEAST
        return this.host.hitPoints + this.host.currentHitPoints;
      default:
        return (this.host.maxHitPoints + this.host.currentHitPoints) - this.host.hitPoints;
    }
  }

  getMaxHP(){
    return this.host.maxHitPoints;
  }

  setMaxHP(nAmount = 0){
    return this.host.maxHitPoints = nAmount;
  }

  setMinOneHP(bMinOneHP = false){
    this.host.min1HP = bMinOneHP ? true : false;
  }

  getFP(){
    return (this.host.temporaryForce || 0) + (this.host.currentForce || 0);
  }

  getMaxFP(){
    return this.host.maxForcePoints;
  }

  setFP(nAmount = 0){
    this.host.temporaryForce = 0;
    this.host.currentForce = Math.max(0, nAmount);
  }

  addFP(nAmount = 0, ignoreMaxForcePoints = false){
    if(nAmount <= 0) return;
    if(ignoreMaxForcePoints){
      this.host.currentForce += nAmount;
    }else{
      const room = Math.max(0, this.host.getMaxFP() - this.host.getFP());
      this.host.currentForce += Math.min(nAmount, room);
    }
    if(this.host.getFP() < 0) this.host.setFP(0);
  }

  subtractFP(nAmount = 0){
    if(nAmount <= 0) return;
    let remaining = nAmount;
    if(this.host.temporaryForce > 0){
      if(remaining <= this.host.temporaryForce){
        this.host.temporaryForce -= remaining;
        return;
      }
      remaining -= this.host.temporaryForce;
      this.host.temporaryForce = 0;
    }
    this.host.currentForce -= remaining;
    if(this.host.currentForce < 0) this.host.currentForce = 0;
  }

  getAdjustedForcePointCost(spell: { forcepoints?: number; goodEvil?: string }): number {
    const base = typeof spell?.forcepoints === 'number' ? spell.forcepoints : (parseInt(String(spell?.forcepoints)) || 0);
    if(base <= 0) return 0;
    // NPCs outside party use base cost (arg2 == 0)
    if(!this.host.isPartyMember() && !this.host.isPC){
      return base;
    }
    const alignment = spell?.goodEvil || '-';
    if(alignment !== 'G' && alignment !== 'E'){
      return base;
    }
    const rowIndex = Math.min(10, Math.max(0, Math.floor(this.host.getGoodEvil() / 10)));
    const row = this.runtime.getSWRuleSet?.().forceAdjustments[rowIndex];
    if(!row) return base;
    const mult = alignment === 'G' ? row.goodcost : row.evilcost;
    if(!isFinite(mult) || mult <= 0) return base;
    return Math.max(0, Math.floor(base * mult));
  }

  getForceMenuResource(): number {
    if(this.host.bodyFuel){
      return this.host.getHP();
    }
    return this.host.getFP();
  }

  unreadySpell(spell: { forcepoints?: number; goodEvil?: string } | null | undefined): boolean {
    if(!spell) return false;
    const cost = this.host.getAdjustedForcePointCost(spell);
    if(cost > 0){
      this.host.subtractFP(cost);
    }
    return true;
  }

  getForceSpellClassIndex(): number {
    const limit = Math.min(2, this.host.classes?.length || 0);
    for(let i = 0; i < limit; i++){
      const id = this.host.classes[i]?.id | 0;
      if(id === 3 || id === 4 || id === 5){
        return i;
      }
    }
    return 0;
  }

  getCameraHeight(){
    if(this.host.model && this.host.model.camerahook){
      return this.host.model.camerahook.position.z;
    }else{
      return 1.5;
    }
  }

  getAC(){
    return this.host.getArmorClassVersus(undefined, false);
  }

  getArmorClassVersus(attacker?: Creature, touch = false): number {
    let ac = 10;

    for(let i = 0; i < this.host.classes.length; i++){
      ac += this.host.classes[i].getACBonus() || 0;
    }

    // creaturesize.2da acattachmod by appearance.sizecategory
    const sizeCat = this.host.getAppearance()?.sizecategory ?? 3;
    const sizeRow = this.runtime.getSWRuleSet?.()?.creatureSizes?.[sizeCat];
    if(sizeRow && typeof sizeRow.acattachmod === 'number' && sizeRow.acattachmod !== -1){
      ac += sizeRow.acattachmod;
    }

    if(!touch){
      ac += this.host.naturalAC || 0;

      const armor = this.host.equipment.ARMOR;
      ac += armor?.getACBonus() || 0;

      // Shield / off-hand AC item (non-weapon with AC)
      const leftHand = this.host.equipment.LEFTHAND;
      if(leftHand && leftHand.getWeaponType() == WeaponType.INVALID){
        ac += leftHand.getACBonus() || 0;
      }
    }

    // Flat-footed / can't see attacker: deny positive DEX (negative still hurts).
    // : GetInvisible(attacker, defender) || !(SEEN bit) → no GetDEXMod / dodge field.
    // A dazed AI state (e.g. just after Force Push) is flat-footed against everyone.
    const loseDex =
      isFlatFootedByAIState(this.host as any) ||
      (
        !!attacker &&
        (this.host.isInvisibleToObserver(attacker) || !this.host.hasSeenObject(attacker))
      );

    const armor = this.host.equipment.ARMOR;
    let dexBonus = Math.floor((this.host.getDEX() - 10) / 2);
    if(this.host.isDebilitated()){
      dexBonus = Math.min(dexBonus, 0);
    }
    if(armor){
      const maxDex = armor.baseItem?.dexBonus;
      if(typeof maxDex == 'number' && maxDex >= 0){
        dexBonus = Math.min(dexBonus, maxDex);
      }
    }
    if(loseDex){
      dexBonus = Math.min(dexBonus, 0);
    }
    ac += dexBonus;

    // Effect AC bonuses. int0=modifyType, int1=value
    // Touch: skip armor/shield enchantment (types 2–3); dodge/natural/deflection apply.
    let dodgeBonus = 0;
    let naturalBonus = 0;
    let armorEffect = 0;
    let shieldEffect = 0;
    let deflectEffect = 0;
    for(let i = 0; i < this.host.effects.length; i++){
      const effect = this.host.effects[i];
      if(
        effect.type != GameEffectType.EffectACIncrease &&
        effect.type != GameEffectType.EffectACDecrease
      ) continue;
      const modType = effect.getInt(0);
      const value = effect.getInt(1) || 0;
      const signed = effect.type == GameEffectType.EffectACIncrease ? value : -value;
      switch(modType){
        case 0: dodgeBonus += signed; break;     // AC_DODGE_BONUS
        case 1: naturalBonus += signed; break;   // AC_NATURAL_BONUS
        case 2: // AC_ARMOUR_ENCHANTMENT (max)
          if(!touch) armorEffect = Math.max(armorEffect, signed);
          break;
        case 3: // AC_SHIELD_ENCHANTMENT (max)
          if(!touch) shieldEffect = Math.max(shieldEffect, signed);
          break;
        case 4: deflectEffect = Math.max(deflectEffect, signed); break;
        default: dodgeBonus += signed; break;
      }
    }
    // applies effect dodge even when DEX is denied; natural effects apply on touch.
    ac += dodgeBonus + naturalBonus + armorEffect + shieldEffect + deflectEffect;

    // Dueling AC feat mod (GetTotalACFeatMod) — one-handed with free off-hand
    const rightHand = this.host.equipment.RIGHTHAND;
    const leftHand = this.host.equipment.LEFTHAND;
    if(
      rightHand && !leftHand &&
      (rightHand.getWeaponWield() == WeaponWield.ONE_HANDED_SWORD ||
        rightHand.getWeaponWield() == WeaponWield.BLASTER_PISTOL ||
        rightHand.getWeaponWield() == WeaponWield.STUN_BATON)
    ){
      if(this.host.getHasFeat(CombatFeatType.MASTER_DUELING)) ac += 3;
      else if(this.host.getHasFeat(CombatFeatType.ADVANCED_DUELING)) ac += 2;
      else if(this.host.getHasFeat(CombatFeatType.DUELING)) ac += 1;
    }

    if(this.host.isDebilitated()){
      ac -= 4;
    }

    return ac;
  }

  doTouchAttack(target: GameObject, ranged = false): number {
    if(!target) return 0;
    if(
      isDoor(target) ||
      isPlaceable(target)
    ){
      return 1;
    }
    if(!isCreature(target)){
      return 0;
    }
    const defender = target as Creature;

    // Concealment → miss (ResolveDefensiveEffects subset)
    let conceal = 0;
    for(let i = 0; i < defender.effects.length; i++){
      const e = defender.effects[i];
      if(e?.type === GameEffectType.EffectConcealment){
        conceal = Math.max(conceal, e.getInt(0) || 0);
      }
    }
    if(conceal > 0 && (Math.floor(Math.random() * 100) + 1) <= conceal){
      return 0;
    }

    const atkBonus =
      this.host.getBaseAttackBonus() +
      Math.floor(((ranged ? this.host.getDEX() : this.host.getSTR()) - 10) / 2) +
      getAttackEffectBonus(this.host);
    const touchAC = defender.getArmorClassVersus(this.host, true);
    const roll = Dice.rollD20(1);

    if(roll === 1) return 0;
    if(roll === 20){
      const confirm = Dice.rollD20(1);
      return (confirm + atkBonus) >= touchAC ? 2 : 1;
    }
    return (roll + atkBonus) >= touchAC ? 1 : 0;
  }

  getSTR(calculateBonuses = true){
    if(!calculateBonuses){
      return this.host.str;
    }else{
      return this.host.str +
      (this.host.equipment.HEAD?.getSTRBonus() || 0) +
      (this.host.equipment.ARMOR?.getSTRBonus() || 0) +
      (this.host.equipment.ARMS?.getSTRBonus() || 0) +
      (this.host.equipment.RIGHTHAND?.getSTRBonus() || 0) +
      (this.host.equipment.LEFTHAND?.getSTRBonus() || 0) +
      (this.host.equipment.LEFTARMBAND?.getSTRBonus() || 0) +
      (this.host.equipment.RIGHTARMBAND?.getSTRBonus() || 0) +
      (this.host.equipment.IMPLANT?.getSTRBonus() || 0) +
      (this.host.equipment.BELT?.getSTRBonus() || 0) +
      (this.host.equipment.CLAW1?.getSTRBonus() || 0) +
      (this.host.equipment.CLAW2?.getSTRBonus() || 0) +
      (this.host.equipment.HIDE?.getSTRBonus() || 0) +
      getAbilityEffectBonus(this.host, 0);
    }
  }

  getDEX(calculateBonuses = true){
    if(!calculateBonuses){
      return this.host.dex;
    }else{
      return this.host.dex +
      (this.host.equipment.HEAD?.getDEXBonus() || 0) +
      (this.host.equipment.ARMOR?.getDEXBonus() || 0) +
      (this.host.equipment.ARMS?.getDEXBonus() || 0) +
      (this.host.equipment.RIGHTHAND?.getDEXBonus() || 0) +
      (this.host.equipment.LEFTHAND?.getDEXBonus() || 0) +
      (this.host.equipment.LEFTARMBAND?.getDEXBonus() || 0) +
      (this.host.equipment.RIGHTARMBAND?.getDEXBonus() || 0) +
      (this.host.equipment.IMPLANT?.getDEXBonus() || 0) +
      (this.host.equipment.BELT?.getDEXBonus() || 0) +
      (this.host.equipment.CLAW1?.getDEXBonus() || 0) +
      (this.host.equipment.CLAW2?.getDEXBonus() || 0) +
      (this.host.equipment.HIDE?.getDEXBonus() || 0) +
      getAbilityEffectBonus(this.host, 1);
    }
  }

  getCON(calculateBonuses = true){
    if(!calculateBonuses){
      return this.host.con;
    }else{
      return this.host.con +
      (this.host.equipment.HEAD?.getCONBonus() || 0) +
      (this.host.equipment.ARMOR?.getCONBonus() || 0) +
      (this.host.equipment.ARMS?.getCONBonus() || 0) +
      (this.host.equipment.RIGHTHAND?.getCONBonus() || 0) +
      (this.host.equipment.LEFTHAND?.getCONBonus() || 0) +
      (this.host.equipment.LEFTARMBAND?.getCONBonus() || 0) +
      (this.host.equipment.RIGHTARMBAND?.getCONBonus() || 0) +
      (this.host.equipment.IMPLANT?.getCONBonus() || 0) +
      (this.host.equipment.BELT?.getCONBonus() || 0) +
      (this.host.equipment.CLAW1?.getCONBonus() || 0) +
      (this.host.equipment.CLAW2?.getCONBonus() || 0) +
      (this.host.equipment.HIDE?.getCONBonus() || 0) +
      getAbilityEffectBonus(this.host, 2);
    }
  }

  getCHA(calculateBonuses = true){
    if(!calculateBonuses){
      return this.host.cha;
    }else{
      return this.host.cha +
      (this.host.equipment.HEAD?.getCHABonus() || 0) +
      (this.host.equipment.ARMOR?.getCHABonus() || 0) +
      (this.host.equipment.ARMS?.getCHABonus() || 0) +
      (this.host.equipment.RIGHTHAND?.getCHABonus() || 0) +
      (this.host.equipment.LEFTHAND?.getCHABonus() || 0) +
      (this.host.equipment.LEFTARMBAND?.getCHABonus() || 0) +
      (this.host.equipment.RIGHTARMBAND?.getCHABonus() || 0) +
      (this.host.equipment.IMPLANT?.getCHABonus() || 0) +
      (this.host.equipment.BELT?.getCHABonus() || 0) +
      (this.host.equipment.CLAW1?.getCHABonus() || 0) +
      (this.host.equipment.CLAW2?.getCHABonus() || 0) +
      (this.host.equipment.HIDE?.getCHABonus() || 0) +
      getAbilityEffectBonus(this.host, 5);
    }
  }

  getWIS(calculateBonuses = true){
    if(!calculateBonuses){
      return this.host.wis;
    }else{
      return this.host.wis +
      (this.host.equipment.HEAD?.getWISBonus() || 0) +
      (this.host.equipment.ARMOR?.getWISBonus() || 0) +
      (this.host.equipment.ARMS?.getWISBonus() || 0) +
      (this.host.equipment.RIGHTHAND?.getWISBonus() || 0) +
      (this.host.equipment.LEFTHAND?.getWISBonus() || 0) +
      (this.host.equipment.LEFTARMBAND?.getWISBonus() || 0) +
      (this.host.equipment.RIGHTARMBAND?.getWISBonus() || 0) +
      (this.host.equipment.IMPLANT?.getWISBonus() || 0) +
      (this.host.equipment.BELT?.getWISBonus() || 0) +
      (this.host.equipment.CLAW1?.getWISBonus() || 0) +
      (this.host.equipment.CLAW2?.getWISBonus() || 0) +
      (this.host.equipment.HIDE?.getWISBonus() || 0) +
      getAbilityEffectBonus(this.host, 4);
    }
  }

  getFortitudeSave(){
    return combineSavingThrow(this.getCreatureSavingThrowBase(1), getSavingThrowEffectBonus(this.host, 1));
  }

  getReflexSave(){
    return combineSavingThrow(this.getCreatureSavingThrowBase(2), getSavingThrowEffectBonus(this.host, 2));
  }

  getWillSave(){
    return combineSavingThrow(this.getCreatureSavingThrowBase(3), getSavingThrowEffectBonus(this.host, 3));
  }

  fortitudeSave(nDC = 0, nSaveType = 0, oVersus: GameObject = undefined){
    return this.savingThrowRoll(1, nDC, nSaveType, oVersus);
  }

  reflexSave(nDC = 0, nSaveType = 0, oVersus: GameObject = undefined){
    return this.savingThrowRoll(2, nDC, nSaveType, oVersus);
  }

  willSave(nDC = 0, nSaveType = 0, oVersus: GameObject = undefined){
    return this.savingThrowRoll(3, nDC, nSaveType, oVersus);
  }

  private getConditioningSaveBonus(): number {
    if(this.host.getHasFeat?.(CombatFeatType.MASTER_CONDITIONING)) return 3;
    if(this.host.getHasFeat?.(CombatFeatType.IMPROVED_CONDITIONING)) return 2;
    if(this.host.getHasFeat?.(CombatFeatType.CONDITIONING)) return 1;
    return 0;
  }

  private getClassSavingThrowBonus(kind: number): number {
    let total = 0;
    const classes = this.host.classes || [];
    for(let i = 0; i < classes.length; i++){
      const creatureClass = classes[i];
      if(!creatureClass) continue;
      if(kind === 1){
        total += creatureClass.getFortSaveBonus?.() || 0;
      }else if(kind === 2){
        total += creatureClass.getRefSaveBonus?.() || 0;
      }else{
        total += creatureClass.getWillSaveBonus?.() || 0;
      }
    }
    return total + this.getConditioningSaveBonus();
  }

  private getCreatureSavingThrowBase(kind: number): number {
    let abilityMod = 0;
    let gffBonus = 0;
    if(kind === 1){
      abilityMod = CombatRound.GetMod(this.host.getCON());
      gffBonus = this.host.fortitudeSaveThrow | 0;
    }else if(kind === 2){
      abilityMod = CombatRound.GetMod(this.host.getDEX());
      if(this.host.isDebilitated?.() && abilityMod > 0){
        abilityMod = 0;
      }
      gffBonus = this.host.reflexSaveThrow | 0;
    }else{
      abilityMod = CombatRound.GetMod(this.host.getWIS());
      gffBonus = this.host.willSaveThrow | 0;
    }
    return abilityMod + gffBonus + this.getClassSavingThrowBonus(kind);
  }

  private savingThrowRoll(
    kind: number,
    nDC: number,
    nSaveType: number,
    oVersus?: GameObject
  ): number {
    const versus = isCreature(oVersus) ? oVersus : undefined;
    const base = this.getCreatureSavingThrowBase(kind);
    let effectBonus = getSavingThrowEffectBonus(this.host, kind, nSaveType | 0, versus);
    if(effectBonus > 20) effectBonus = 20;
    const d20 = Dice.roll(1, DiceType.d20);
    if(rollSavingThrow(combineSavingThrow(base, effectBonus), nDC, d20)){
      return 1;
    }

    const spellId = this.host.combatData?.lastForcePowerUsed?.id
      ?? (this.host as any).lastSpellId;
    let spellSchool: number | undefined;
    if(typeof spellId === 'number' && spellId >= 0){
      const spellRow = (GameState as any).SWRuleSet?.spells?.[spellId]
        ?? (GameState as any).TwoDAManager?.datatables?.get?.('spells')?.rows?.[spellId];
      const school = spellRow?.school ?? spellRow?.School;
      if(school !== undefined && school !== ''){
        spellSchool = parseInt(school, 10);
      }
    }
    const immunityType = savingThrowTypeToImmunity(nSaveType, spellSchool);
    if(immunityType && hasImmunityType(this.host, immunityType, versus)){
      return 2;
    }
    return 0;
  }

  getINT(calculateBonuses = true){
    if(!calculateBonuses){
      return this.host.int;
    }else{
      return this.host.int +
      (this.host.equipment.HEAD?.getINTBonus() || 0) +
      (this.host.equipment.ARMOR?.getINTBonus() || 0) +
      (this.host.equipment.ARMS?.getINTBonus() || 0) +
      (this.host.equipment.RIGHTHAND?.getINTBonus() || 0) +
      (this.host.equipment.LEFTHAND?.getINTBonus() || 0) +
      (this.host.equipment.LEFTARMBAND?.getINTBonus() || 0) +
      (this.host.equipment.RIGHTARMBAND?.getINTBonus() || 0) +
      (this.host.equipment.IMPLANT?.getINTBonus() || 0) +
      (this.host.equipment.BELT?.getINTBonus() || 0) +
      (this.host.equipment.CLAW1?.getINTBonus() || 0) +
      (this.host.equipment.CLAW2?.getINTBonus() || 0) +
      (this.host.equipment.HIDE?.getINTBonus() || 0) +
      getAbilityEffectBonus(this.host, 3);
    }
  }

  getSpellSaveDC(){
    const wisMod = Math.floor((this.host.getWIS() - 10) / 2);
    const chaMod = Math.floor((this.host.getCHA() - 10) / 2);
    let dc = 5 + this.host.getTotalClassLevel() + wisMod + chaMod;
    if(this.host.getHasFeat(CombatFeatType.FORCE_FOCUS_MASTERY)){
      return dc + 4;
    }
    if(this.host.getHasFeat(CombatFeatType.FORCE_FOCUS_ADVANCED)){
      return dc + 2;
    }
    if(this.host.getHasFeat(CombatFeatType.FORCE_FOCUS)){
      return dc + 1;
    }
    return dc;
  }

  getSpellCasterLevel(){
    let level = 0;
    for(let i = 0; i < this.host.classes.length; i++){
      if(this.host.classes[i].spellcaster){
        level += this.host.classes[i].level;
      }
    }
    return level;
  }

  getIsPC(){
    return this.host.isPC;
  }

  getPortraitId(){
    return this.host.portraitId;
  }

  getPortraitResRef(){
    if(!this.host.portrait) return '';
    return this.host.portrait.getPortraitGoodEvil(this.host.goodEvil);
  }

  getWalkRateId(){
    return this.host.walkRate;
  }

  getMovementRate(){
    return this.host.getWalkRateId() | 0;
  }

  getName(){
    return this.host.firstName instanceof CExoLocString ? this.host.firstName.getValue() : (this.host.firstName || '');
  }

  getAppearance(): SWCreatureAppearance | undefined {
    return this.host.creatureAppearance;
  }

  getHitDistance(){
    return this.host.creatureAppearance?.hitdist ?? 1;
  }

  getHitRadius(){
    return this.host.creatureAppearance?.hitradius ?? 1;
  }

  getCreaturePersonalSpace(){
    return this.host.creatureAppearance?.creperspace ?? 1;
  }

  getPathPersonalSpace(){
    return this.host.creatureAppearance?.perspace ?? 1;
  }

  getMainClass(){
    if(!this.host.classes.length)
      return false;

    return this.host.classes[this.host.classes.length - 1];
  }

  getTotalClassLevel(subtractNegatives = false){
    let total = 0;
    for(let i = 0, len = this.host.classes.length; i < len; i++){
      const cls = this.host.classes[i];
      let lv = cls.level || 0;
      if(subtractNegatives){
        lv = Math.max(0, lv - (cls.negativeLevels || 0));
      }
      total += lv;
    }
    return total;
  }

  getForceItemMask(): number {
    let mask = 0;
    const slots = this.host.equipment;
    if(!slots) return 0;
    const items = [
      slots.HEAD, slots.ARMOR, slots.ARMS, slots.RIGHTHAND, slots.LEFTHAND,
      slots.LEFTARMBAND, slots.RIGHTARMBAND, slots.IMPLANT, slots.BELT,
      slots.RIGHTHAND2, slots.LEFTHAND2,
    ];
    for(let i = 0; i < items.length; i++){
      const item = items[i];
      if(!item) continue;
      const t = item.baseItemId | 0;
      switch(t){
        case 0x1f: mask |= 0x01; break;
        case 0x20: mask |= 0x02; break;
        case 0x21: mask |= 0x04; break;
        case 0x22: mask |= 0x08; break;
        case 0x23: mask |= 0x10; break;
        case 0x24: mask |= 0x20; break;
        case 0x27:
        case 0x28:
        case 0x29: mask |= 0x40; break;
      }
    }
    return mask;
  }

  getClassLevel(nClass = 0, subtractNegatives = false){
    for(let i = 0, len = this.host.classes.length; i < len; i++){
      if(this.host.classes[i].id == nClass){
        let lv = this.host.classes[i].level || 0;
        if(subtractNegatives){
          lv = Math.max(0, lv - (this.host.classes[i].negativeLevels || 0));
        }
        return lv;
      }
    }
    return 0;
  }

  canLevelUp(){
    let level = this.host.getTotalClassLevel();
    const xp = this.runtime.getSWRuleSet?.()?.expTable?.expList?.[level];
    if(typeof xp === 'number'){
      return this.host.getXP() >= xp;
    }
    return false;
  }

  getEffectiveLevel(){
    let level = 0;
    const expList = this.runtime.getSWRuleSet?.()?.expTable?.expList;
    if(expList?.length){
      for(let i = 0; i < expList.length; i++){
        if(this.host.getXP() >= (expList[i] | 0)){
          level = i;
        }
      }
    }
    return level;
  }

  getBaseAttackBonus(){
    // Class BAB only; ability mods are applied in the attack-roll resolver
    let bab = 0;
    for(let i = 0, len = this.host.classes.length; i < len; i++){
      bab += this.host.classes[i].getBaseAttackBonus();
    }
    return bab;
  }

  getFeats(){
    return this.host.feats || [];
  }

  getFeat(id = 0){
    let feats = this.host.getFeats();
    for(let i = 0, len = feats.length; i < len; i++){
      if(feats[i].id == id){
        return feats[i];
      }
    }
    return null;
  }

  addFeat(feat: number|TalentFeat = 0){
    if(feat instanceof TalentFeat){
      if(!this.host.getFeat(feat.id)){
        this.host.feats.push(feat);
      }
    }else{
      if(!this.host.getFeat(feat)){
        this.host.feats.push(new TalentFeat(feat));
      }
    }
  }

  getHasFeat(id: number = 0){
    let feats = this.host.getFeats();
    for(let i = 0, len = feats.length; i < len; i++){
      if(feats[i].id == id){
        return true;
      }
    }
    // bonus_feats list from EffectBonusFeat
    if(this.host.effects?.length){
      for(let i = 0; i < this.host.effects.length; i++){
        const e = this.host.effects[i];
        if(e?.type === GameEffectType.EffectBonusFeat && e.getInt(0) === id){
          return true;
        }
      }
    }
    return false;
  }

  getFeatRemainingUses(id: number = 0): number {
    if(!this.host.getHasFeat(id)){
      return 0;
    }
    return 100;
  }

  getHasSkill(value: number){
    return this.host.skills[value].rank > 0;
  }

  getCanUseSkill(value: number): boolean {
    // aliases the mine subskills 100–102 to Demolitions.
    const skillId = value === 100 || value === 101 || value === 102
      ? 1
      : value;
    const skill = this.host.skills[skillId];
    if(!skill) return false;
    if(!skill.isUntrained()){
      // stores ranks as signed bytes; 0xff is -1, not 255 ranks.
      return ((skill.rank << 24) >> 24) > 0;
    }
    if(skill.canAllClassesUse()){
      return true;
    }
    for(let i = 0; i < this.host.classes.length; i++){
      const classSkill = skill.classData.get(this.host.classes[i].skillstable);
      if(classSkill?.isClassSkill){
        return true;
      }
    }
    return false;
  }

  getSkillRank(value: number, raw: boolean = false){
    const skills = this.host.skills;
    if(!skills || value < 0 || value >= skills.length){
      return 0;
    }

    const skill = skills[value] as TalentSkill;
    let rank = ((skill.rank << 24) >> 24);

    if(raw){
      return CreatureStatsService.clampSkillRank(rank);
    }

    // Trained-only skills with no ranks contribute nothing.
    if(!skill.isUntrained?.() && rank === 0){
      return 0;
    }

    // Effect skill increase / decrease
    if(this.host.effects?.length){
      for(let i = 0; i < this.host.effects.length; i++){
        const e = this.host.effects[i];
        if(e?.type === GameEffectType.EffectSkillIncrease && e.getInt(0) === value){
          rank += e.getInt(1) || 0;
        }else if(e?.type === GameEffectType.EffectSkillDecrease){
          const id = e.getInt(0);
          if(id === value || id === 0xff){
            rank -= e.getInt(1) || 0;
          }
        }
      }
    }

    const keyRaw = skill.getKeyAbility?.() || skill.keyAbility || '';
    const keyNum = parseInt(String(keyRaw), 10);
    const key = Number.isNaN(keyNum) ? String(keyRaw).toLowerCase() : keyNum;

    switch(key){
      case 0:
      case 'str':
        rank += getAbilityModifier(this.host.getSTR());
        if(isCreatureBlind(this.host)) rank -= 4;
        break;
      case 1:
      case 'dex': {
        const dexMod = getAbilityModifier(this.host.getDEX());
        if(this.host.isDebilitated?.()){
          rank += dexMod < 0 ? dexMod : 0;
        }else{
          rank += dexMod;
        }
        if(isCreatureBlind(this.host)) rank -= 4;
        break;
      }
      case 2:
      case 'con':
        rank += getAbilityModifier(this.host.getCON());
        break;
      case 3:
      case 'int':
        rank += getAbilityModifier(this.host.getINT());
        break;
      case 4:
      case 'wis':
        rank += getAbilityModifier(this.host.getWIS());
        break;
      case 5:
      case 'cha':
        rank += getAbilityModifier(this.host.getCHA());
        break;
      default:
        break;
    }

    if(skill.hasArmorCheckPenalty?.() || skill.armorCheckPenalty){
      rank += (this.host.combatInformation?.armorCheckPen | 0);
    }

    rank += this.getSkillFeatBonus(value);

    return CreatureStatsService.clampSkillRank(rank);
  }

  private static clampSkillRank(rank: number): number {
    if(rank > 0x7e) return 0x7f;
    if(rank < -0x7e) return -0x7f;
    return rank | 0;
  }

  private getSkillFeatBonus(skillId: number): number {
    const has = (id: number) => !!this.host.getHasFeat?.(id);

    switch(skillId){
      case SkillType.COMPUTER_USE:
        if(has(CombatFeatType.GEAR_HEAD_MASTER)) return 3;
        if(has(CombatFeatType.GEAR_HEAD_ADEPT)) return 2;
        if(has(CombatFeatType.GEAR_HEAD)) return 1;
        return 0;
      case SkillType.DEMOLITIONS:
      case SkillType.STEALTH:
        if(has(CombatFeatType.MASTER_CAUTION)) return 3;
        if(has(CombatFeatType.IMPROVED_CAUTION)) return 2;
        if(has(CombatFeatType.CAUTIOUS)) return 1;
        return 0;
      case SkillType.AWARENESS:
      case SkillType.PERSUADE:
      case SkillType.TREAT_INJURY:
        if(has(CombatFeatType.MASTER__EMPATHY)) return 3;
        if(has(CombatFeatType.IMPROVED_EMPATHY)) return 2;
        if(has(CombatFeatType.EMPATHY)) return 1;
        return 0;
      case SkillType.REPAIR:
      case SkillType.SECURITY:
        if(has(CombatFeatType.GEAR_HEAD_MASTER)) return 3;
        if(has(CombatFeatType.GEAR_HEAD_ADEPT)) return 2;
        if(has(CombatFeatType.GEAR_HEAD)) return 1;
        return 0;
      default:
        return 0;
    }
  }

  getSkillLevel(value: number){
    return this.host.getSkillRank(value, false);
  }

  getHasSpell(id = 0){
    return (this.host.getSpell(id) instanceof TalentSpell) ? true : false;
  }

  setCurrentForm(formId = 0){
    if(formId && !this.host.getHasSpell(formId)) return;
    this.host.currentForm = formId || 0;
  }

  getCurrentForm(){
    return this.host.currentForm || 0;
  }

  isFormActive(formId = 0){
    if(!formId || this.host.currentForm != formId) return false;
    if(formId >= 258 && formId <= 264){
      const right = this.host.equipment?.RIGHTHAND;
      const left = this.host.equipment?.LEFTHAND;
      return !!(right?.isLightsaber?.() || left?.isLightsaber?.());
    }
    return true;
  }

  getSpell(id = 0){
    for(let i = 0; i < this.host.classes.length; i++){
      let cls = this.host.classes[i];
      let spells = cls.getSpells();
      for(let j = 0, len = spells.length; j < len; j++){
        let spell = spells[j];
        if(spell.id == id)
          return spell;
      }
    }

    if(typeof this.host.equipment.RIGHTARMBAND != 'undefined'){
      let spells = this.host.equipment.RIGHTARMBAND.getSpells();
      for(let i = 0, len = spells.length; i < len; i++){
        if(spells[i].id == id){
          return spells[i];
        }
      }
    }

    if(typeof this.host.equipment.LEFTARMBAND != 'undefined'){
      let spells = this.host.equipment.LEFTARMBAND.getSpells();
      for(let i = 0, len = spells.length; i < len; i++){
        if(spells[i].id == id){
          return spells[i];
        }
      }
    }

    return undefined;
  }

  hasTalent(talent: TalentObject){
    if(typeof talent == 'undefined') return false;
    if((talent.objectType & TalentObjectType.TalentSpell) !== 0){
      return this.host.getHasSpell(talent.id) ? true : false;
    }
    if((talent.objectType & TalentObjectType.TalentFeat) !== 0){
      return this.host.getHasFeat(talent.id) ? true : false;
    }
    if((talent.objectType & TalentObjectType.TalentSkill) !== 0){
      return this.host.getHasSkill(talent.id) ? true : false;
    }
    return false;
  }

  getTalents(){

    let talents: TalentObject[] = [];

    //Merge Spell Talents from all classs
    for(let i = 0; i < this.host.classes.length; i++){
      talents = talents.concat(this.host.classes[i].getSpells());
    }

    //Merge Feat Talents
    talents = talents.concat(this.host.feats);
    //Merge Skill Talents
    talents = talents.concat(this.host.skills);

    return talents;

  }

  getSpells(): TalentSpell[] {
    const spells: TalentSpell[] = [];

    for(let i = 0, len = this.host.classes.length; i < len; i++){
      spells.push(...this.host.classes[i].getSpells());
    }

    if(typeof this.host.equipment.RIGHTARMBAND != 'undefined'){
      spells.push(...this.host.equipment.RIGHTARMBAND.getSpells());
    }

    if(typeof this.host.equipment.LEFTARMBAND != 'undefined'){
      spells.push(...this.host.equipment.LEFTARMBAND.getSpells());
    }

    return spells;
  }

  getClassSpells(){
    const spells = [];

    for(let i = 0, len = this.host.classes.length; i < len; i++){
      spells.push(...this.host.classes[i].getSpells());
    }

    return spells;
  }

  getRandomTalent(category = 0, category2 = 0){

    let talents = this.host.getTalents().filter( (talent: TalentObject) => talent.category == category || talent.category == category2 );
    let talent = talents[Math.floor(Math.random()*talents.length)];
    //console.log('getRandomTalent', talent);
    return talent;

  }

  getTalentBest(nCategory = 0, nCRMax = 0, nInclusion = 0, nExcludeType = -1, nExcludeId = -1){
    let talents = this.host.getTalents().filter( (talent: TalentObject) => ( talent.category > -1 && ( (talent.category & nCategory) == nCategory ) && talent.maxCR <= nCRMax ) );
    talents.sort((a: TalentObject, b: TalentObject) => (a.maxCR > b.maxCR) ? 1 : -1);
    //console.log('getTalentBest', talents);
    if(talents.length){
      return talents[0];
    }
    return undefined;
  }

  isSimpleCreature(){
    if(!this.host.creatureAppearance) return false;
    return this.host.creatureAppearance.modeltype === 'S' || this.host.creatureAppearance.modeltype === 'L';
  }

  getRace(){
    return this.host.race;
  }

  getSubRace(){
    return this.host.subrace;
  }

  getGender(){
    return this.host.gender;
  }
}
