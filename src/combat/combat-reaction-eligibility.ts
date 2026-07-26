import { AttackResult } from '@/enums/combat/AttackResult';
import { ModuleCreatureAnimState } from '@/enums/module/ModuleCreatureAnimState';

/**
 * Whether ResolveMeleeAnimations should sync a defender reaction.
 * CutsceneAttack starts non-engaged (no infinitePause pairing) but still
 * force-reacts when resultsCalculated — matching retail param_5 intent
 * without requiring this.engaged.
 */
export function canSyncMeleeReaction(opts: {
  engaged: boolean;
  resultsCalculated: boolean;
  hasTargetCombatRound: boolean;
  checkActionLengthOk: boolean;
  attackResult: AttackResult;
  targetAnimIndex: number;
  targetLastAttackIsAttacker: boolean;
}): boolean {
  const forceCutsceneReact = !!opts.resultsCalculated;
  const engagedCanReact = !!(
    opts.hasTargetCombatRound &&
    (opts.engaged || forceCutsceneReact) &&
    (
      forceCutsceneReact ||
      opts.checkActionLengthOk ||
      opts.attackResult === AttackResult.HIT_SUCCESSFUL ||
      opts.attackResult === AttackResult.CRITICAL_HIT ||
      opts.attackResult === AttackResult.AUTOMATIC_HIT ||
      opts.attackResult === AttackResult.PARRIED ||
      opts.attackResult === AttackResult.DEFLECTED
    )
  );
  const unengagedCanReact = !(
    opts.engaged
  ) && !forceCutsceneReact && (
    (
      opts.targetAnimIndex === ModuleCreatureAnimState.IDLE ||
      opts.targetAnimIndex === ModuleCreatureAnimState.READY
    ) &&
    opts.targetLastAttackIsAttacker
  );
  return engagedCanReact || unengagedCanReact;
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
