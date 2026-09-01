import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { Dice } from "@/utility/Dice";
import { DiceType } from "@/enums/combat/DiceType";
import { CombatRound } from "@/combat/CombatRound";
import {
  getSavingThrowEffectBonus,
} from "@/effects/effect-bonuses";
import { hasImmunityType } from "@/effects/haste-slow";
import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleObject } from "@/module/ModuleObject";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";

/** SAVING_THROW_* */
export const SAVING_THROW_ALL = 0;
export const SAVING_THROW_FORTITUDE = 1;
export const SAVING_THROW_REFLEX = 2;
export const SAVING_THROW_WILL = 3;

/**
 * Conditioning feat line — retail GetBase*SavingThrow .
 * Master (22) +3, Improved (21) +2, Conditioning (13) +1; applies to all three saves.
 */
export function getConditioningSaveBonus(creature: ModuleCreature): number {
  if(creature.getHasFeat?.(CombatFeatType.MASTER_CONDITIONING)) return 3;
  if(creature.getHasFeat?.(CombatFeatType.IMPROVED_CONDITIONING)) return 2;
  if(creature.getHasFeat?.(CombatFeatType.CONDITIONING)) return 1;
  return 0;
}

/** Class table sum for one save kind (retail Get*SaveBonus). */
export function getClassSavingThrowBonus(
  creature: ModuleCreature,
  kind: typeof SAVING_THROW_FORTITUDE | typeof SAVING_THROW_REFLEX | typeof SAVING_THROW_WILL
): number {
  let total = 0;
  const classes = creature.classes || [];
  for(let i = 0; i < classes.length; i++){
    const cls = classes[i];
    if(!cls) continue;
    if(kind === SAVING_THROW_FORTITUDE){
      total += cls.getFortSaveBonus?.() || 0;
    }else if(kind === SAVING_THROW_REFLEX){
      total += cls.getRefSaveBonus?.() || 0;
    }else{
      total += cls.getWillSaveBonus?.() || 0;
    }
  }
  return total + getConditioningSaveBonus(creature);
}

/**
 * Retail GetFort/Ref/WillSavingThrow base (no effects) — ability + GFF bonus + class/feats.
 * Reflex clamps positive DEX when debilitated ().
 */
export function getCreatureSavingThrowBase(
  creature: ModuleCreature,
  kind: typeof SAVING_THROW_FORTITUDE | typeof SAVING_THROW_REFLEX | typeof SAVING_THROW_WILL
): number {
  let abilityMod = 0;
  let gffBonus = 0;
  if(kind === SAVING_THROW_FORTITUDE){
    abilityMod = CombatRound.GetMod(creature.getCON());
    gffBonus = creature.fortitudeSaveThrow | 0;
  }else if(kind === SAVING_THROW_REFLEX){
    abilityMod = CombatRound.GetMod(creature.getDEX());
    if(creature.isDebilitated?.() && abilityMod > 0){
      abilityMod = 0;
    }
    gffBonus = creature.reflexSaveThrow | 0;
  }else{
    abilityMod = CombatRound.GetMod(creature.getWIS());
    gffBonus = creature.willSaveThrow | 0;
  }
  return abilityMod + gffBonus + getClassSavingThrowBonus(creature, kind);
}

/**
 * Map failed-roll SAVING_THROW_TYPE_* → IMMUNITY_TYPE_* (SavingThrowRoll).
 * Returns 0 when no immunity check applies.
 */
export function savingThrowTypeToImmunity(
  saveType: number,
  lastSpellSchool?: number
): number {
  switch(saveType | 0){
    case 10: return 1;
    case 12: return 2;
    case 5: return 3;
    case 8: return 4;
    case 14: return 5;
    case 4:
      if(lastSpellSchool === 1 || lastSpellSchool === 2) return 0x20;
      return 0;
    default: return 0;
  }
}

/**
 * Retail SavingThrowRoll.
 * @returns 0 fail, 1 success, 2 immune
 */
export function savingThrowRoll(
  object: ModuleObject,
  kind: typeof SAVING_THROW_FORTITUDE | typeof SAVING_THROW_REFLEX | typeof SAVING_THROW_WILL,
  nDC = 0,
  nSaveType = 0,
  oVersus?: ModuleObject
): number {
  if(!BitWise.InstanceOfObject(object, ModuleObjectType.ModuleCreature)){
    // Doors / placeables: GFF bonus only + d20 (no class/ability)
    const base =
      kind === SAVING_THROW_FORTITUDE ? (object.fortitudeSaveThrow | 0) :
      kind === SAVING_THROW_REFLEX ? (object.reflexSaveThrow | 0) :
      (object.willSaveThrow | 0);
    const roll = Dice.roll(1, DiceType.d20);
    return (roll + base) >= (nDC | 0) ? 1 : 0;
  }

  const creature = object as ModuleCreature;
  const versus = BitWise.InstanceOfObject(oVersus, ModuleObjectType.ModuleCreature)
    ? (oVersus as ModuleCreature)
    : undefined;

  const base = getCreatureSavingThrowBase(creature, kind);
  let effectBonus = getSavingThrowEffectBonus(creature, kind, nSaveType | 0, versus);
  if(effectBonus > 20) effectBonus = 20;

  const roll = Dice.roll(1, DiceType.d20);
  const total = roll + effectBonus + base;

  if(total >= (nDC | 0)){
    return 1;
  }

  const spellId = creature.combatData?.lastForcePowerUsed?.id
    ?? (creature as any).lastSpellId;
  let spellSchool: number | undefined;
  if(typeof spellId === 'number' && spellId >= 0){
    const spellRow = (GameState as any).SWRuleSet?.spells?.[spellId]
      ?? (GameState as any).TwoDAManager?.datatables?.get?.('spells')?.rows?.[spellId];
    const school = spellRow?.school ?? spellRow?.School;
    if(school !== undefined && school !== ''){
      spellSchool = parseInt(school, 10);
    }
  }
  const immunityType = savingThrowTypeToImmunity(nSaveType | 0, spellSchool);
  if(immunityType && hasImmunityType(creature, immunityType, versus)){
    return 2;
  }
  return 0;
}
