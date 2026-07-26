/**
 * Retail combat-round pause / ResetCombatAnimations helpers —
 * AIActionPhysicalAttacks @ 005bbbf0,
 * UpdateCombatRoundTimer @ 004faf20,
 * ResetCombatAnimations @ 004f1250.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file combat-round-pause.ts
 */

/**
 * Retail pauses the round for the attack animation length (param 4, the same
 * value AddCutsceneAttackAction stamps as (combatStretch + 3000) / 2), not the
 * whole round. The remainder of the round plays out in combat READY.
 */
export function resolveAttackPauseMs(
  paramAnimationTime: number | undefined,
  actionAnimationTime: number | undefined,
  roundLength: number
): number {
  return Math.max(
    1,
    paramAnimationTime || actionAnimationTime || Math.floor(roundLength / 2)
  );
}

/**
 * Retail ResetCombatAnimations only snaps to GetPauseReadyAnimation when the
 * creature can still fight and the round was not started from a scripted
 * action (field9_0x940) — cutscene poses are left alone.
 */
export function shouldSnapCombatReady(opts: {
  dead: boolean;
  debilitated: boolean;
  resultsCalculated: boolean;
}): boolean {
  return !opts.dead && !opts.debilitated && !opts.resultsCalculated;
}

/**
 * Retail UpdateCombatRoundTimer pause expiry only ends the round when the
 * attack target is gone or dead; otherwise the unpaused timer ends it once it
 * reaches roundLength.
 */
export function shouldEndRoundOnPauseExpiry(opts: {
  hasTarget: boolean;
  targetDead: boolean;
}): boolean {
  return !opts.hasTarget || opts.targetDead;
}
