import type { ModuleCreature } from "@/module/ModuleCreature";
import type { TalentSpell } from "@/talents/TalentSpell";
import { canTargetItemCastByPerception } from "@/combat/item-property-uses";

/**
 * cast-spell action / AddCastSpellActions spell gates.
 *
 * @file spell-cast-gates.ts
 */

/**
 * Spells.2da `prerequisites` are spell-tree ids (and occasionally feat ids).
 * Cast fails when any listed id is neither a known spell nor an owned feat.
 * Cheat / fake casts skip this (caller responsibility).
 */
export function passesSpellPrerequisiteGate(
  caster: Pick<ModuleCreature, 'getHasSpell' | 'getHasFeat'> | undefined,
  spell: Pick<TalentSpell, 'prerequisites'> | undefined
): boolean {
  if(!caster || !spell) return true;
  const prereqs = spell.prerequisites;
  if(!prereqs?.length) return true;
  for(let i = 0; i < prereqs.length; i++){
    const id = prereqs[i] | 0;
    if(id < 0) continue;
    const hasSpell = typeof caster.getHasSpell === 'function' && caster.getHasSpell(id);
    const hasFeat = typeof caster.getHasFeat === 'function' && caster.getHasFeat(id);
    if(!hasSpell && !hasFeat){
      return false;
    }
  }
  return true;
}

/**
 * Non-cheat casts require the spell id to be known on the caster.
 */
export function passesSpellKnownGate(
  caster: Pick<ModuleCreature, 'getHasSpell'> | undefined,
  spellId: number
): boolean {
  if(!caster || typeof caster.getHasSpell !== 'function') return true;
  const id = spellId | 0;
  if(id < 0) return true;
  return !!caster.getHasSpell(id);
}

/**
 * AddCastSpellActions visibility gate — same bit rules as ItemCastSpell
 * (non-party creatures).
 */
export function canTargetSpellCastByPerception(
  perceptionFlags: number | undefined,
  opts: { isPartyOrPlayerUI?: boolean; isSelf?: boolean } = {}
): boolean {
  return canTargetItemCastByPerception(perceptionFlags, opts);
}

/**
 * Whether the hostile action menu should offer CounterSpell for this target.
 * GetTargetActions: mid-cast (SpellCastRound / live SpellCastInstance).
 */
export function shouldShowCounterSpellAction(opts: {
  restricted?: boolean;
  isSelf?: boolean;
  targetDead?: boolean;
  hasActiveSpellCast?: boolean;
  spellCastRound?: boolean;
}): boolean {
  if(opts.restricted) return false;
  if(opts.isSelf) return false;
  if(opts.targetDead) return false;
  return !!(opts.hasActiveSpellCast || opts.spellCastRound);
}
