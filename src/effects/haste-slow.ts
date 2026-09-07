import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
import { GameState } from "@/GameState";
import type { GameEffect } from "@/effects/GameEffect";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { BitWise } from "@/utility/BitWise";

/**
 * effect apply / effect remove.
 * Net-balance HASTE(+1) vs SLOW(-1), then sync HASTEINTERNAL / SLOWINTERNAL children.
 */

function copyMeta(from: GameEffect, to: GameEffect){
  to.setCreator(from.getCreator() || from.creator);
  to.setSpellId(from.getSpellId());
  to.setDurationType(from.getDurationType());
  to.setDuration(from.duration);
  to.setExpireDay(from.expireDay);
  to.setExpireTime(from.expireTime);
  to.setSubType(GameEffectSubType.MAGICAL);
  to.setSkipOnLoad(true);
}

function removeInternals(creature: ModuleCreature){
  const effects = creature.effects ? creature.effects.slice() : [];
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e) continue;
    if(
      e.type === GameEffectType.EffectHasteInternal ||
      e.type === GameEffectType.EffectSlowInternal
    ){
      creature.removeEffect(e);
    }
  }
  creature.isHasted = false;
  creature.isSlowed = false;
}

export function hasImmunityType(
  creature: ModuleCreature,
  immunityType: number,
  versus?: ModuleCreature
): boolean {
  if(!creature || immunityType <= 0 || immunityType >= 0x21) return false;
  // Prefer CombatRound GetEffectImmunity (race/align filters) when available
  if(creature.combatRound?.hasEffectImmunity){
    return creature.combatRound.hasEffectImmunity(creature, immunityType, versus);
  }
  const effects = creature.effects || [];
  const raceCount = GameState.SWRuleSet?.racialTypeCount ?? 0;
  for(let i = 0; i < effects.length; i++){
    const effect = effects[i];
    if(effect?.type !== GameEffectType.EffectImmunity) continue;
    const type = effect.getInt(0);
    if(type !== 0 && type !== immunityType) continue;
    const race = effect.getInt(1);
    if(race !== raceCount && versus && race !== (versus.getRace?.() ?? versus.race)) continue;
    return true;
  }
  return false;
}

export function rebalanceHasteSlow(creature: ModuleCreature, trigger?: GameEffect){
  if(!BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature)){
    return;
  }

  let net = 0;
  const effects = creature.effects || [];
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e?.applied) continue;
    if(e.type === GameEffectType.EffectHaste) net += 1;
    else if(e.type === GameEffectType.EffectSlow) net -= 1;
  }
  // addEffect calls onApply before pushing — count the applying outer effect
  if(trigger?.applied && effects.indexOf(trigger) < 0){
    if(trigger.type === GameEffectType.EffectHaste) net += 1;
    else if(trigger.type === GameEffectType.EffectSlow) net -= 1;
  }
  if(net > 1) net = 1;
  if(net < -1) net = -1;

  const hasHasteInt = effects.some(e => e?.type === GameEffectType.EffectHasteInternal);
  const hasSlowInt = effects.some(e => e?.type === GameEffectType.EffectSlowInternal);

  if(net === 0){
    if(hasHasteInt || hasSlowInt) removeInternals(creature);
    return;
  }

  if(net === 1){
    if(hasSlowInt) removeInternals(creature);
    if(!creature.effects.some(e => e?.type === GameEffectType.EffectHasteInternal)){
      const internal = new GameState.GameEffectFactory.EffectHasteInternal();
      if(trigger) copyMeta(trigger, internal);
      else {
        internal.setDurationType(GameEffectDurationType.TEMPORARY);
        internal.setSkipOnLoad(true);
      }
      creature.addEffect(internal, internal.getDurationType(), internal.duration);
    }
    return;
  }

  if(hasHasteInt) removeInternals(creature);
  if(!creature.effects.some(e => e?.type === GameEffectType.EffectSlowInternal)){
    const internal = new GameState.GameEffectFactory.EffectSlowInternal();
    if(trigger) copyMeta(trigger, internal);
    else {
      internal.setDurationType(GameEffectDurationType.TEMPORARY);
      internal.setSkipOnLoad(true);
    }
    creature.addEffect(internal, internal.getDurationType(), internal.duration);
  }
}
