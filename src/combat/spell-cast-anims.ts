import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";

/**
 * Map spells.2da ConjAnim / CastAnim labels to animation IDs.
 */

/** Conjure-phase anim → SetAnimation. */
export function getSpellConjureAnimState(conjanim: string | undefined): ModuleCreatureAnimState {
  const a = String(conjanim ?? '').toLowerCase().trim();
  if(a === 'up' || a === '3') return ModuleCreatureAnimState.CASTOUT3;
  if(a === 'throw' || a === '7') return ModuleCreatureAnimState.THROW_SABER;
  if(a === 'dual' || a === '2' || a === 'out2') return ModuleCreatureAnimState.CASTOUT2;
  return ModuleCreatureAnimState.CASTOUT1;
}

/**
 * Cast-phase anim.
 * Returns 0 when skips SetAnimation (castanim 8 / 9).
 */
export function getSpellCastAnimState(castanim: string | undefined): ModuleCreatureAnimState | 0 {
  const a = String(castanim ?? '').toLowerCase().trim();
  if(a === '8' || a === '9' || a === 'none') return 0;
  if(a === 'up' || a === '3') return ModuleCreatureAnimState.CASTOUT3_LP;
  if(a === 'throw' || a === '7') return ModuleCreatureAnimState.THROW_SABER_LP;
  if(a === 'dual' || a === 'area' || a === '2' || a === 'out2'){
    return ModuleCreatureAnimState.CASTOUT2_LP;
  }
  if(a === '4') return ModuleCreatureAnimState.CASTOUT4_LP;
  // self / hand / 1 / default → CASTOUT1_LP
  return ModuleCreatureAnimState.CASTOUT1_LP;
}

/** Instant-cast path uses ATTACK (0x2719) for 1500 ms. */
export const INSTANT_CAST_ANIM = ModuleCreatureAnimState.ATTACK;
export const INSTANT_CAST_PAUSE_MS = 1500;
