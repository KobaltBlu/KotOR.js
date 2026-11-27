import type { GameEffect } from "@engine/effects/GameEffect";
import { GameEffectType } from "@core/enums/effects/GameEffectType";

/**
 * Creature AI-state mask (16 bits). Every bit starts set; SetAIState effects
 * AND their mask in while they last. Death clears the whole mask and
 * resurrection restores it.
 */
export const AI_STATE_ALL = 0xffff;

/** Physical attacks need both bits; without them the attack action fails. */
export const AI_STATE_ATTACK_MASK = 0x84;

/** Force powers (spell talents) need this bit. */
export const AI_STATE_FORCE_POWERS = 0x08;

/** Missing either bit leaves the creature flat-footed. */
export const AI_STATE_ALERT_MASK = 0x06;

/** Applied when Force Push ends: blocks attacks, powers and readiness. */
export const FORCE_PUSH_RECOVERY_AI_STATE = 0xfea1;
export const FORCE_PUSH_RECOVERY_DURATION = 2.55;

type AIStateHost = {
  aiStateMask?: number;
  effects?: GameEffect[];
};

export function getAIStateMask(creature: AIStateHost | undefined): number {
  const mask = creature?.aiStateMask;
  return typeof mask === 'number' ? (mask & AI_STATE_ALL) : AI_STATE_ALL;
}

function hasAllBits(creature: AIStateHost | undefined, bits: number): boolean {
  return (~getAIStateMask(creature) & bits) === 0;
}

export function canAttackByAIState(creature: AIStateHost | undefined): boolean {
  return hasAllBits(creature, AI_STATE_ATTACK_MASK);
}

export function canUseForcePowersByAIState(creature: AIStateHost | undefined): boolean {
  return hasAllBits(creature, AI_STATE_FORCE_POWERS);
}

export function isFlatFootedByAIState(creature: AIStateHost | undefined): boolean {
  return !hasAllBits(creature, AI_STATE_ALERT_MASK);
}

export function applyAIStateMask(creature: AIStateHost, mask: number): void {
  creature.aiStateMask = getAIStateMask(creature) & (mask & AI_STATE_ALL);
}

/**
 * Rebuild the mask from the SetAIState effects still on the creature,
 * leaving out `removed`. A cleared (dead) mask stays cleared.
 */
export function recomputeAIStateMask(creature: AIStateHost, removed?: GameEffect): void {
  if(getAIStateMask(creature) === 0) return;
  let mask = AI_STATE_ALL;
  for(const effect of creature.effects ?? []){
    if(!effect || effect === removed) continue;
    if(effect.type !== GameEffectType.EffectSetAIState) continue;
    mask &= effect.getInt(0) & AI_STATE_ALL;
  }
  creature.aiStateMask = mask;
}

export function clearAIStateMask(creature: AIStateHost): void {
  creature.aiStateMask = 0;
}

export function resetAIStateMask(creature: AIStateHost): void {
  creature.aiStateMask = AI_STATE_ALL;
}
