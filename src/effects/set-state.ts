import { GameEffectType } from "@/enums/effects/GameEffectType";
import { GameEffectDurationType } from "@/enums/effects/GameEffectDurationType";
import { GameEffectSubType } from "@/enums/effects/GameEffectSubType";
import { GameEffectSetStateType } from "@/enums/effects/GameEffectSetStateType";
import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";
import { CombatFeatType } from "@/enums/combat/CombatFeatType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import { GameState } from "@/GameState";
import { BitWise } from "@/utility/BitWise";
import { hasImmunityType } from "@/effects/haste-slow";
import type { GameEffect } from "@/effects/GameEffect";
import type { ModuleCreature } from "@/module/ModuleCreature";

/**
 * Retail OnApplySetState / OnApplySetStateInternal /
 * OnRemoveSetState / RecomputeAmbientAnimationState.
 *
 * Outer EffectSetState handles immunities + priority; Internal does clear /
 * pause / child VFX / animation. Shared by K1 and K2 (same effect opcodes).
 */

/** IMMUNITY_TYPE_* used by OnApplySetState */
export const IMMUNITY_MIND = 1;
export const IMMUNITY_FEAR = 4;
export const IMMUNITY_PARALYZE = 6;
export const IMMUNITY_STUN = 0x0c;
export const IMMUNITY_SLEEP = 0x0d;
export const IMMUNITY_CONFUSED = 0x10;
export const IMMUNITY_KNOCKDOWN = 0x1c;
/** K2 — EffectDroidConfused (always checked; no cutscene int1 bypass) */
export const IMMUNITY_DROID_CONFUSED = 0x21;

/** VFX ids from OnApplySetStateInternal */
export const VFX_DROID_STUN = 0x3ef;
export const VFX_STUN = 0x7d2;

/**
 * Retail OnApplySetState always applies SETAISTATE −0x101 before Internal —
 * activity &= 0xFEFF (clears bit 0x100).
 */
export const SET_STATE_OUTER_AI_ACTIVITY_MASK = 0xfeff;

export function getActiveSetStateType(creature: ModuleCreature): number {
  let highest = 0;
  const effects = creature.effects || [];
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e?.applied || e.type !== GameEffectType.EffectSetState) continue;
    const state = e.getInt(0) | 0;
    if(state > highest) highest = state;
  }
  return highest;
}

export function isSetStateImmune(
  creature: ModuleCreature,
  state: number,
  ignoreImmunity: boolean,
  versus?: ModuleCreature
): boolean {
  switch(state){
    case GameEffectSetStateType.CONFUSED:
      return hasImmunityType(creature, IMMUNITY_CONFUSED, versus);
    case GameEffectSetStateType.FRIGHTENED:
      return hasImmunityType(creature, IMMUNITY_FEAR, versus);
    case GameEffectSetStateType.CUT_SCENE_STUNNED:
      if(ignoreImmunity) return false;
      return hasImmunityType(creature, IMMUNITY_STUN, versus)
        || !!creature.getHasFeat?.(CombatFeatType.FORCE_IMMUNITY_STUN)
        || !!creature.getHasFeat?.(CombatFeatType.FORCE_IMMUNITY_PARALYSIS);
    case GameEffectSetStateType.CUT_SCENE_PARALYZE:
      if(ignoreImmunity) return false;
      return hasImmunityType(creature, IMMUNITY_PARALYZE, versus)
        || !!creature.getHasFeat?.(CombatFeatType.FORCE_IMMUNITY_PARALYSIS);
    case GameEffectSetStateType.SLEEP:
      return hasImmunityType(creature, IMMUNITY_SLEEP, versus);
    case GameEffectSetStateType.CUT_SCENE_HORRIFIED:
      if(ignoreImmunity) return false;
      return !!creature.getHasFeat?.(CombatFeatType.FORCE_IMMUNITY_FEAR);
    case GameEffectSetStateType.KNOCKDOWN:
      if(ignoreImmunity) return false;
      return hasImmunityType(creature, IMMUNITY_KNOCKDOWN, versus);
    case GameEffectSetStateType.DROID_CONFUSED:
      // Retail no int1 cutscene bypass
      return hasImmunityType(creature, IMMUNITY_DROID_CONFUSED, versus);
    case GameEffectSetStateType.MIND_TRICK:
      if(ignoreImmunity) return false;
      return hasImmunityType(creature, IMMUNITY_MIND, versus);
    default:
      return false;
  }
}

export function animForSetState(state: number): ModuleCreatureAnimState {
  switch(state){
    case GameEffectSetStateType.SLEEP:
      return ModuleCreatureAnimState.SLEEP;
    case GameEffectSetStateType.CUT_SCENE_PARALYZE:
      return ModuleCreatureAnimState.PARALYZED;
    case GameEffectSetStateType.CHOKE:
    case GameEffectSetStateType.CRUSH:
    case GameEffectSetStateType.HELD:
      // Crush/Held share choke-like lock pose; ambient set separately.
      return ModuleCreatureAnimState.CHOKE;
    case GameEffectSetStateType.KNOCKDOWN:
      return ModuleCreatureAnimState.KNOCKED_DOWN;
    case GameEffectSetStateType.WHIRLWIND:
      return ModuleCreatureAnimState.WHIRLWIND;
    case GameEffectSetStateType.DROID_STUN:
      return ModuleCreatureAnimState.DEACTIVATE;
    case GameEffectSetStateType.CUT_SCENE_HORRIFIED:
      return ModuleCreatureAnimState.SPASM;
    case GameEffectSetStateType.CUT_SCENE_STUNNED:
    case GameEffectSetStateType.MIND_TRICK:
    case GameEffectSetStateType.DROID_SCRAMBLE:
    case GameEffectSetStateType.DROID_CONFUSED:
    case GameEffectSetStateType.CONFUSED:
    case GameEffectSetStateType.FRIGHTENED:
    case GameEffectSetStateType.FORCEPUSH:
    default:
      return ModuleCreatureAnimState.PAUSE;
  }
}

function copyMeta(from: GameEffect, to: GameEffect){
  to.setCreator(from.getCreator() || from.creator);
  to.setSpellId(from.getSpellId());
  to.setDurationType(from.getDurationType() || GameEffectDurationType.TEMPORARY);
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
    if(e?.type === GameEffectType.EffectSetStateInternal){
      creature.removeEffect(e);
    }
  }
}

/**
 * Keep a single Internal matching the highest active outer SetState.
 * Mirrors retail priority + OnRemoveSetState re-apply.
 */
export function rebalanceSetState(creature: ModuleCreature, trigger?: GameEffect){
  if(!BitWise.InstanceOfObject(creature, ModuleObjectType.ModuleCreature)){
    return;
  }

  let highest = 0;
  let highestEffect: GameEffect | undefined;
  const effects = creature.effects || [];
  for(let i = 0; i < effects.length; i++){
    const e = effects[i];
    if(!e?.applied || e.type !== GameEffectType.EffectSetState) continue;
    const state = e.getInt(0) | 0;
    if(state > highest){
      highest = state;
      highestEffect = e;
    }
  }
  // addEffect calls onApply before push — count the applying outer
  if(
    trigger?.applied &&
    trigger.type === GameEffectType.EffectSetState &&
    effects.indexOf(trigger) < 0
  ){
    const state = trigger.getInt(0) | 0;
    if(state > highest){
      highest = state;
      highestEffect = trigger;
    }
  }

  const currentInternal = effects.find(
    e => e?.applied && e.type === GameEffectType.EffectSetStateInternal
  );
  const currentState = currentInternal ? (currentInternal.getInt(0) | 0) : 0;

  if(highest <= 0){
    if(currentInternal) removeInternals(creature);
    return;
  }

  if(currentState === highest && currentInternal){
    return;
  }

  removeInternals(creature);

  const internal = new GameState.GameEffectFactory.EffectSetStateInternal();
  if(highestEffect) copyMeta(highestEffect, internal);
  else {
    internal.setDurationType(GameEffectDurationType.TEMPORARY);
    internal.setSkipOnLoad(true);
  }
  internal.setInt(0, highest);
  creature.addEffect(internal, internal.getDurationType(), internal.duration);
}
