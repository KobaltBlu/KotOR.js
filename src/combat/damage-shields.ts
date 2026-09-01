import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { EffectDamage } from "@/effects/EffectDamage";
import type { EffectDamageShield } from "@/effects/EffectDamageShield";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { resolveDamageBonusCode, damageTypeFlagToChannel } from "@/combat/damage-bonus";

/**
 * Retail ResolveDamageShields.
 * Called when combat damage lands (int[19] mitigated). Shield damage sets int[19]=0
 * so shields do not recurse.
 */
export function resolveDamageShields(defender: ModuleCreature, attacker: ModuleCreature){
  if(!defender || !attacker || defender === attacker) return;
  if(attacker.plot) return;

  const effects = defender.effects || [];
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(e?.type !== GameEffectType.EffectDamageShield) continue;

    const shield = e as EffectDamageShield;
    let amount = shield.getFlatAmount?.() ?? (e.getInt(0) || 0);
    const diceCode = shield.getDiceBonusCode?.() ?? (e.getInt(1) || 0);
    if(diceCode > 0){
      amount += resolveDamageBonusCode(diceCode);
    }
    if(amount < 1) amount = 1;

    const typeFlags = shield.getDamageTypeFlags?.() ?? (e.getInt(2) || 0);
    const channel = damageTypeFlagToChannel(typeFlags);

    const damageEffect = new EffectDamage();
    damageEffect.setCreator(defender);
    damageEffect.setInt(channel, amount);
    // int[19]=0 → OnApplyDamage will mitigate; shields do not set pre-mitigated flag
    // so retail avoids recurse via calling only when original damage had int[19]!=0.
    // We call resolve only from combat mitigate path; do not re-enter here.
    damageEffect.setInt(19, 0);
    damageEffect.setInt(20, 1); // mark shield-sourced (skip further shield resolve)

    attacker.addEffect(damageEffect, GameEffectDurationType.INSTANT);
  }
}
