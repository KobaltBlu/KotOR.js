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
 * Retail ResolveRangedAnimations @ 005b6c40 play gate:
 * CheckActionLengthAtTime && attacker.engaged.
 * Unlike melee, resultsCalculated does not bypass the action-length check.
 */
export function canSyncRangedReaction(opts: {
  attackerEngaged: boolean;
  hasTargetCombatRound: boolean;
  checkActionLengthOk: boolean;
}): boolean {
  return !!(
    opts.hasTargetCombatRound &&
    opts.attackerEngaged &&
    opts.checkActionLengthOk
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
 * Retail ResolveRangedAnimations @ 005b6c40 reaction pick —
 * DODGE (0x271b) only when no landing hit (local_4==0), target has no
 * lightsaber, target is not in a casting-busy anim (FUN_005b55a0), and
 * target.combat_round.engaged. Otherwise READY (0x2711).
 *
 * This is why a melee PC closing on a shooter must not dodge mid-sprint:
 * their round is not engaged until they enter attack range.
 */
export function pickRangedReaction(opts: {
  anyHit: boolean;
  targetLightsaberEquipped: boolean;
  targetCastingBusy: boolean;
  targetEngaged: boolean;
}): number {
  if(
    !opts.anyHit &&
    !opts.targetLightsaberEquipped &&
    !opts.targetCastingBusy &&
    opts.targetEngaged
  ){
    return ModuleCreatureAnimState.DODGE;
  }
  return ModuleCreatureAnimState.READY;
}

/**
 * Retail ResolveRangedAttack local_4 — any AttackList roll in the hit band
 * (results 0–3 / HIT_SUCCESSFUL–AUTOMATIC_HIT). Parry/deflect do not set it.
 */
export function rangedAttackHadLandingHit(
  results: Array<AttackResult | number | undefined | null>
): boolean {
  for(let i = 0; i < results.length; i++){
    const r = results[i];
    if(
      r === AttackResult.HIT_SUCCESSFUL ||
      r === AttackResult.CRITICAL_HIT ||
      r === AttackResult.AUTOMATIC_HIT
    ){
      return true;
    }
  }
  return false;
}

/**
 * Retail FUN_005b55a0 @ 005b55a0 — animation constants that block ranged dodge.
 * Casting (0x271f–0x2724), throw-saber loop (0x274d), inject (0x2756–0x2757),
 * and a few higher specials.
 */
export function isRangedDodgeBlockedAnimation(anim: number): boolean {
  const param = anim | 0;
  if(param < 0x2758){
    if(param < 0x2756){
      if(param < 0x271f){
        return false;
      }
      if(param > 0x2724 && param !== 0x274d){
        return false;
      }
    }
    return true;
  }
  if(param !== 0x28a1 && param !== 11000){
    return false;
  }
  return true;
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
