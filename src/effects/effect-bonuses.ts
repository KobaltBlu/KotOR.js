import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { GameEffect } from "@/effects/GameEffect";
import type { ModuleObject } from "@/module";
import { GameState } from "@/GameState";
import {
  damageTypeFlagToChannel,
  resolveDamageBonusCode,
} from "@/combat/damage-bonus";

/**
 * Query helpers for effect lists. Most buff effects store values in ints
 * and are consumed at check time (retail OnApply often only validates).
 */

export function getEffectBonusSum(
  object: ModuleObject,
  incType: GameEffectType,
  decType: GameEffectType,
  amountIndex: number,
  filter?: (effect: GameEffect) => boolean
): number {
  const effects = object?.effects;
  if(!effects?.length) return 0;
  let total = 0;
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e) continue;
    if(filter && !filter(e)) continue;
    if(e.type === incType){
      total += e.getInt(amountIndex) || 0;
    }else if(e.type === decType){
      total -= e.getInt(amountIndex) || 0;
    }
  }
  return total;
}

/** Ability: int[0]=ABILITY_*, int[1]=amount */
export function getAbilityEffectBonus(object: ModuleObject, abilityId: number): number {
  return getEffectBonusSum(
    object,
    GameEffectType.EffectAbilityIncrease,
    GameEffectType.EffectAbilityDecrease,
    1,
    (e) => e.getInt(0) === abilityId
  );
}

/**
 * Saving throw effect bonus — retail GetTotalEffectBonus type 3.
 * int[0]=amount, int[1]=SAVING_THROW_* (0=ALL), int[2]=SAVING_THROW_TYPE_*,
 * int[3]=racialtypes row / race_row_count = any, int[5]=alignment (0=any).
 * Cap at 20 is applied by SavingThrowRoll.
 */
export function getSavingThrowEffectBonus(
  object: ModuleObject,
  saveKind: number,
  saveType: number = 0,
  versus?: ModuleObject
): number {
  const effects = object?.effects;
  if(!effects?.length) return 0;

  const raceCount = GameState.SWRuleSet?.racialTypeCount ?? 0;
  let versusRace = raceCount;
  let versusAlign = 0;
  if(versus){
    versusRace = (versus as any).getRace?.() ?? (versus as any).race ?? raceCount;
    const ge = (versus as any).getGoodEvil?.() ?? 50;
    versusAlign = ge < 41 ? 3 : (ge > 59 ? 2 : 1);
  }

  let total = 0;
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e) continue;
    if(
      e.type !== GameEffectType.EffectSavingThrowIncrease &&
      e.type !== GameEffectType.EffectSavingThrowDecrease
    ){
      continue;
    }
    const kind = e.getInt(1) | 0;
    if(kind !== 0 && kind !== saveKind) continue;
    const type = e.getInt(2) | 0;
    if(type !== 0 && type !== (saveType | 0)) continue;
    const race = e.getInt(3);
    if(race !== raceCount && race !== versusRace) continue;
    const align = e.getInt(5) | 0;
    if(align !== 0 && align !== versusAlign) continue;
    const amount = e.getInt(0) || 0;
    if(e.type === GameEffectType.EffectSavingThrowIncrease){
      total += amount;
    }else{
      total -= amount;
    }
  }
  return total;
}

/** Attack: int[0]=bonus */
export function getAttackEffectBonus(object: ModuleObject): number {
  return getEffectBonusSum(
    object,
    GameEffectType.EffectAttackIncrease,
    GameEffectType.EffectAttackDecrease,
    0
  );
}

/** Force resistance amount: int[0]=amount */
export function getForceResistanceBonus(object: ModuleObject): number {
  return getEffectBonusSum(
    object,
    GameEffectType.EffectForceResistanceIncrease,
    GameEffectType.EffectForceResistanceDecrease,
    0
  );
}

/**
 * Sum DamageIncrease / DamageDecrease effects.
 * int[0] = DAMAGE_BONUS_* (iprp_damagecost row); int[1] = DAMAGE_TYPE_* flags.
 * Returns total flat-equivalent for BASE packaging (legacy callers).
 */
export function getDamageIncreaseBonus(object: ModuleObject): number {
  return getDamageIncreaseBonusesByChannel(object).reduce((a, b) => a + b, 0);
}

/**
 * Per-channel EffectDamageIncrease/Decrease amounts (retail GetTotalEffectBonus type 2).
 * Rolls dice codes from iprp_damagecost; physical/elemental go to flag bit indices.
 */
export function getDamageIncreaseBonusesByChannel(
  object: ModuleObject,
  options: { maximize?: boolean; critMultiplier?: number } = {}
): number[] {
  const channels = new Array(16).fill(0);
  const effects = object?.effects;
  if(!effects?.length) return channels;

  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e?.applied) continue;
    if(
      e.type !== GameEffectType.EffectDamageIncrease &&
      e.type !== GameEffectType.EffectDamageDecrease
    ){
      continue;
    }
    const code = e.getInt(0) | 0;
    const amount = resolveDamageBonusCode(code, options);
    if(!amount) continue;
    const channel = damageTypeFlagToChannel(e.getInt(1) | 0);
    if(e.type === GameEffectType.EffectDamageIncrease){
      channels[channel] += amount;
    }else{
      channels[channel] -= amount;
    }
  }
  return channels;
}

/** Detect flags: See Invisible = 0x01, Ultra = 0x02, True Seeing = 0x04 . */
export const DETECT_FLAG_SEE_INVISIBLE = 0x01;
export const DETECT_FLAG_ULTRA_VISION = 0x02;
export const DETECT_FLAG_TRUE_SEEING = 0x04;

export function getDetectFlags(observer: ModuleObject): number {
  let flags = 0;
  const creatureFlags = (observer as any)?.visionFlags;
  if(typeof creatureFlags === 'number'){
    flags |= creatureFlags & (DETECT_FLAG_SEE_INVISIBLE | DETECT_FLAG_ULTRA_VISION | DETECT_FLAG_TRUE_SEEING);
  }
  const effects = observer?.effects;
  if(!effects?.length) return flags;
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e) continue;
    if(e.type === GameEffectType.EffectSeeInvisible){
      flags |= DETECT_FLAG_SEE_INVISIBLE;
    }else if(e.type === GameEffectType.EffectUltraVision){
      flags |= DETECT_FLAG_ULTRA_VISION;
    }else if(e.type === GameEffectType.EffectTrueseeing){
      flags |= DETECT_FLAG_TRUE_SEEING;
    }
  }
  return flags;
}
