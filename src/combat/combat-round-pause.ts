/**
 * Retail combat-round pause / ResetCombatAnimations helpers.
 */

/**
 * Retail pauses the round for the attack animation length (the same
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
 * action — cutscene poses are left alone.
 * Living scripted DEAD (e.g. Min1HP + ActionPlayAnimation) must not snap to READY.
 */
export function shouldSnapCombatReady(opts: {
  dead: boolean;
  debilitated: boolean;
  resultsCalculated: boolean;
  scriptedDead?: boolean;
}): boolean {
  return !opts.dead && !opts.debilitated && !opts.resultsCalculated && !opts.scriptedDead;
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
