import { GameEffectType } from "@core/enums/effects/GameEffectType";
import type { GameEffect } from "@engine/effects/GameEffect";

/**
 * ExecuteCommandVersusEffect.
 * Sets race / alignment / trap-versus integers at type-specific slots.
 *
 * @file versus-effect.ts
 */

/** VersusRacialTypeEffect — set racialtypes row on the effect. */
export function versusRacialTypeEffect(effect: GameEffect | undefined, racialType: number): GameEffect | undefined {
  if(!effect) return effect;
  const t = effect.type;
  // Attack / Damage / AC / Skill: race at int[2]
  if(
    t === GameEffectType.EffectAttackIncrease ||
    t === GameEffectType.EffectAttackDecrease ||
    t === GameEffectType.EffectDamageIncrease ||
    t === GameEffectType.EffectDamageDecrease ||
    t === GameEffectType.EffectACIncrease ||
    t === GameEffectType.EffectACDecrease ||
    t === GameEffectType.EffectSkillIncrease ||
    t === GameEffectType.EffectSkillDecrease
  ){
    effect.setInt(2, racialType);
    return effect;
  }
  // Sanctuary / Invis / Conceal / Immunity: race at int[1]
  if(
    t === GameEffectType.EffectSanctuary ||
    t === GameEffectType.EffectInvisibility ||
    t === GameEffectType.EffectConcealment ||
    t === GameEffectType.EffectImmunity
  ){
    effect.setInt(1, racialType);
    return effect;
  }
  // Saving throw: race at int[3]
  if(
    t === GameEffectType.EffectSavingThrowIncrease ||
    t === GameEffectType.EffectSavingThrowDecrease
  ){
    effect.setInt(3, racialType);
    return effect;
  }
  return effect;
}

/** VersusAlignmentEffect — law/chaos + good/evil. */
export function versusAlignmentEffect(
  effect: GameEffect | undefined,
  lawChaos: number,
  goodEvil: number
): GameEffect | undefined {
  if(!effect) return effect;
  const t = effect.type;
  if(
    t === GameEffectType.EffectAttackIncrease ||
    t === GameEffectType.EffectAttackDecrease ||
    t === GameEffectType.EffectDamageIncrease ||
    t === GameEffectType.EffectDamageDecrease ||
    t === GameEffectType.EffectACIncrease ||
    t === GameEffectType.EffectACDecrease ||
    t === GameEffectType.EffectSkillIncrease ||
    t === GameEffectType.EffectSkillDecrease
  ){
    effect.setInt(3, lawChaos);
    effect.setInt(4, goodEvil);
    return effect;
  }
  if(
    t === GameEffectType.EffectSanctuary ||
    t === GameEffectType.EffectInvisibility ||
    t === GameEffectType.EffectConcealment ||
    t === GameEffectType.EffectImmunity
  ){
    // Conceal/Immunity also write race slot then align at 2/3 for Conceal
    if(t === GameEffectType.EffectConcealment || t === GameEffectType.EffectImmunity){
      effect.setInt(2, lawChaos);
      effect.setInt(3, goodEvil);
    }else{
      effect.setInt(3, goodEvil);
    }
    return effect;
  }
  if(
    t === GameEffectType.EffectSavingThrowIncrease ||
    t === GameEffectType.EffectSavingThrowDecrease
  ){
    effect.setInt(4, lawChaos);
    effect.setInt(5, goodEvil);
    return effect;
  }
  return effect;
}

/**
 * VersusTrapEffect — marks supported bonus effects as trap-versus.
 * Saving-throw layout already uses type ints; stamp int[6]=1 as trap flag
 * for attack/AC/skill style effects (consumers that ignore unknown ints are fine).
 */
export function versusTrapEffect(effect: GameEffect | undefined): GameEffect | undefined {
  if(!effect) return effect;
  const t = effect.type;
  if(
    t === GameEffectType.EffectAttackIncrease ||
    t === GameEffectType.EffectAttackDecrease ||
    t === GameEffectType.EffectACIncrease ||
    t === GameEffectType.EffectACDecrease ||
    t === GameEffectType.EffectSkillIncrease ||
    t === GameEffectType.EffectSkillDecrease ||
    t === GameEffectType.EffectSavingThrowIncrease ||
    t === GameEffectType.EffectSavingThrowDecrease
  ){
    effect.setInt(6, 1);
  }
  return effect;
}
