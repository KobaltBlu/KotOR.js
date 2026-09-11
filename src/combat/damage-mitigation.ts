import { GameEffectType } from "@/enums/effects/GameEffectType";
import type { GameEffect } from "@/effects/GameEffect";
import type { ModuleObject } from "@/module/ModuleObject";

/**
 * -shaped damage mitigation (effect apply / GetDamageRoll):
 * Immunity → Resistance → Reduction.
 * Resistance int[0]=flags, int[1]=amount, int[2]=limit (0=infinite).
 * Reduction int[0]=amount, int[1]=bypass power, int[2]=limit.
 * Immunity Increase int[0]=flags, int[1]=percent.
 */

const CHANNEL_COUNT = 15;

export function damageFlagsFromChannels(channels: number[]): number {
  let flags = 0;
  for(let i = 0; i < CHANNEL_COUNT && i < channels.length; i++){
    if(channels[i] >= 0 && channels[i] > 0){
      flags |= (1 << i);
    }
  }
  return flags;
}

export function sumDamageChannels(channels: number[]): number {
  let total = 0;
  for(let i = 0; i < CHANNEL_COUNT && i < channels.length; i++){
    if(channels[i] >= 0){
      total += channels[i];
    }
  }
  return total;
}

function collectEffects(object: ModuleObject, type: GameEffectType): GameEffect[] {
  const effects = object?.effects;
  if(!effects?.length) return [];
  return effects.filter(e => e?.type === type);
}

/**
 * Apply percent immunity for matching damage flags. Returns remaining damage.
 */
export function applyDamageImmunity(
  target: ModuleObject,
  damage: number,
  damageFlags: number
): number {
  if(damage <= 0 || !target) return Math.max(0, damage);

  let percent = 0;
  for(const effect of collectEffects(target, GameEffectType.EffectDamageImmunityIncrease)){
    const flags = effect.getInt(0) || 0;
    if((flags & damageFlags) !== 0){
      percent += effect.getInt(1) || 0;
    }
  }
  for(const effect of collectEffects(target, GameEffectType.EffectDamageImmunityDecrease)){
    const flags = effect.getInt(0) || 0;
    if((flags & damageFlags) !== 0){
      percent -= effect.getInt(1) || 0;
    }
  }

  if(percent <= 0) return damage;
  if(percent >= 100) return 0;
  return Math.max(0, Math.floor(damage * (100 - percent) / 100));
}

/**
 * Best matching DAMAGERESISTANCE; consume limit pool. Returns remaining damage.
 */
export function applyDamageResistance(
  target: ModuleObject,
  damage: number,
  damageFlags: number
): number {
  if(damage <= 0 || !target) return Math.max(0, damage);

  let bestAmount = 0;
  let bestEffect: GameEffect | undefined;

  for(const effect of collectEffects(target, GameEffectType.EffectDamageResistance)){
    const flags = effect.getInt(0) || 0;
    if((flags & damageFlags) === 0) continue;
    const amount = effect.getInt(1) || 0;
    if(amount > bestAmount){
      bestAmount = amount;
      bestEffect = effect;
    }
  }

  if(!bestEffect || bestAmount <= 0) return damage;

  const limit = bestEffect.getInt(2) || 0;
  let absorb = Math.min(bestAmount, damage);

  if(limit > 0){
    absorb = Math.min(absorb, limit);
    const remaining = limit - absorb;
    if(remaining <= 0){
      // Shield HP depleted — drop parent EffectForceShield so its VFX shell
      // (bumped-out progFX) is removed with the resistance package.
      const spellId = bestEffect.getSpellId();
      target.removeEffect(bestEffect);
      if(typeof spellId === 'number' && spellId >= 0){
        for(const effect of collectEffects(target, GameEffectType.EffectForceShield)){
          if(effect.getSpellId() === spellId){
            target.removeEffect(effect);
          }
        }
      }
    }else{
      bestEffect.setInt(2, remaining);
    }
  }

  return Math.max(0, damage - absorb);
}

/**
 * Best DAMAGEREDUCTION; only applies when attackPower < effect bypass power (int[1]).
 */
export function applyDamageReduction(
  target: ModuleObject,
  damage: number,
  attackPower: number
): number {
  if(damage <= 0 || !target) return Math.max(0, damage);

  let bestAmount = 0;
  let bestEffect: GameEffect | undefined;
  let bypassPower = 0;

  for(const effect of collectEffects(target, GameEffectType.EffectDamageReduction)){
    const amount = effect.getInt(0) || 0;
    if(amount > bestAmount){
      bestAmount = amount;
      bestEffect = effect;
      bypassPower = effect.getInt(1) || 0;
    }
  }

  if(!bestEffect || bestAmount <= 0) return damage;
  // : only reduce when attack power is below the effect's bypass power
  if(attackPower >= bypassPower) return damage;

  const limit = bestEffect.getInt(2) || 0;
  let absorb = Math.min(bestAmount, damage);

  if(limit > 0){
    absorb = Math.min(absorb, limit);
    const remaining = limit - absorb;
    if(remaining <= 0){
      target.removeEffect(bestEffect);
    }else{
      bestEffect.setInt(2, remaining);
    }
  }

  return Math.max(0, damage - absorb);
}

/**
 * Full mitigation chain. Returns remaining damage (>= 0).
 */
export function mitigateDamageAmount(
  target: ModuleObject,
  damage: number,
  damageFlags: number,
  attackPower: number = 0
): number {
  let amount = Math.max(0, damage);
  amount = applyDamageImmunity(target, amount, damageFlags);
  amount = applyDamageResistance(target, amount, damageFlags);
  // skips DR when power tier == 6 (magical/max)
  if(attackPower !== 6){
    amount = applyDamageReduction(target, amount, attackPower);
  }
  return Math.max(0, amount);
}

/**
 * Scale channel values so they sum to resolvedTotal (preserves type proportions).
 */
export function scaleDamageChannels(channels: number[], resolvedTotal: number): void {
  const original = sumDamageChannels(channels);
  if(original <= 0){
    for(let i = 0; i < CHANNEL_COUNT && i < channels.length; i++){
      if(channels[i] >= 0) channels[i] = 0;
    }
    return;
  }
  if(resolvedTotal <= 0){
    for(let i = 0; i < CHANNEL_COUNT && i < channels.length; i++){
      if(channels[i] >= 0) channels[i] = 0;
    }
    return;
  }

  let assigned = 0;
  let lastPositive = -1;
  for(let i = 0; i < CHANNEL_COUNT && i < channels.length; i++){
    if(channels[i] < 0) continue;
    if(channels[i] === 0) continue;
    lastPositive = i;
    const scaled = Math.floor(channels[i] * resolvedTotal / original);
    channels[i] = scaled;
    assigned += scaled;
  }
  if(lastPositive >= 0 && assigned !== resolvedTotal){
    channels[lastPositive] += (resolvedTotal - assigned);
  }
}
