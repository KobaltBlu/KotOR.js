import { AttackResult } from '@/enums/combat/AttackResult';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';

/**
 * Retail ResolveMeleeAnimations @ 005b7470 reaction gate:
 * target has combatRound && attacker.engaged &&
 * (CheckActionLengthAtTime || resultsCalculated).
 * resultsCalculated (param_5) only bypasses the action-length check —
 * reactions still require engaged.
 */
export function canSyncMeleeReaction(opts: {
  engaged: boolean;
  resultsCalculated: boolean;
  hasTargetCombatRound: boolean;
  checkActionLengthOk: boolean;
}): boolean {
  return !!(
    opts.hasTargetCombatRound &&
    opts.engaged &&
    (opts.checkActionLengthOk || opts.resultsCalculated)
  );
}

/**
 * Retail ResolveMeleeAnimations reaction pick — hits → DAMAGE (0x271e),
 * parry/deflect → PARRY, miss/resist/fail → DODGE.
 */
export function pickMeleeReaction(result: AttackResult): number {
  if(
    result === AttackResult.HIT_SUCCESSFUL ||
    result === AttackResult.CRITICAL_HIT ||
    result === AttackResult.AUTOMATIC_HIT
  ){
    return ModuleCreatureAnimState.DAMAGE;
  }
  if(
    result === AttackResult.PARRIED ||
    result === AttackResult.DEFLECTED
  ){
    return ModuleCreatureAnimState.PARRY;
  }
  if(
    result === AttackResult.MISS ||
    result === AttackResult.ATTACK_RESISTED ||
    result === AttackResult.ATTACK_FAILED
  ){
    return ModuleCreatureAnimState.DODGE;
  }
  return ModuleCreatureAnimState.READY;
}

/**
 * How to drive the defender reaction clip.
 * Mapped combatanimations clip is preferred; otherwise retail SetAnimation(constant).
 * Never flip only `index` when mapped is missing — that leaves a stale ATTACK clip.
 */
export type MeleeReactionPlayback =
  | { mode: 'mapped' }
  | { mode: 'setAnimationState' };

export function resolveMeleeReactionPlayback(
  mappedClip: unknown
): MeleeReactionPlayback {
  return mappedClip ? { mode: 'mapped' } : { mode: 'setAnimationState' };
}
