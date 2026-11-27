import { ModuleCreatureAnimState } from "@core/enums/module/ModuleCreatureAnimState";

/**
 * spells.2da CastAnim → animation IDs.
 *
 * The engine only reads the CastAnim column; the same code drives both the
 * conjure and the cast phase (ConjAnim is ignored).
 */

/** Parsed spells.2da CastAnim code. */
export enum SpellCastAnimCode {
  NONE = 0,
  SELF = 1,
  DARK = 2,
  UP = 3,
  AREA = 4,
  TOUCH = 6,
  THROW = 7,
  JUMP = 8,
  MONSTER = 9,
  /** TSL only. */
  FURY = 10,
  /** TSL only. */
  CRUSH = 11,
  /** TSL only. */
  MONSTER_FURY = 12,
}

const CAST_ANIM_CODES: Record<string, SpellCastAnimCode> = {
  dark: SpellCastAnimCode.DARK,
  self: SpellCastAnimCode.SELF,
  up: SpellCastAnimCode.UP,
  area: SpellCastAnimCode.AREA,
  point: SpellCastAnimCode.TOUCH,
  touch: SpellCastAnimCode.TOUCH,
  throw: SpellCastAnimCode.THROW,
  jump: SpellCastAnimCode.JUMP,
  monster: SpellCastAnimCode.MONSTER,
  fury: SpellCastAnimCode.FURY,
  crush: SpellCastAnimCode.CRUSH,
  monsterfury: SpellCastAnimCode.MONSTER_FURY,
};

/** Case-insensitive CastAnim label → code (unknown labels → NONE). */
export function parseSpellCastAnim(castanim: string | number | undefined): SpellCastAnimCode {
  if(typeof castanim === 'number') return castanim as SpellCastAnimCode;
  const a = String(castanim ?? '').toLowerCase().trim();
  return CAST_ANIM_CODES[a] ?? SpellCastAnimCode.NONE;
}

/** Conjure-phase anim. */
export function getSpellConjureAnimState(castanim: string | number | undefined): ModuleCreatureAnimState {
  switch(parseSpellCastAnim(castanim)){
    case SpellCastAnimCode.DARK: return ModuleCreatureAnimState.CASTOUT2;
    case SpellCastAnimCode.UP: return ModuleCreatureAnimState.CASTOUT3;
    case SpellCastAnimCode.THROW: return ModuleCreatureAnimState.THROW_SABER;
    default: return ModuleCreatureAnimState.CASTOUT1;
  }
}

/**
 * Cast-phase anim.
 * Returns 0 when no animation is set (jump / monster).
 */
export function getSpellCastAnimState(castanim: string | number | undefined): ModuleCreatureAnimState | 0 {
  switch(parseSpellCastAnim(castanim)){
    case SpellCastAnimCode.SELF: return ModuleCreatureAnimState.CASTOUT1_LP;
    case SpellCastAnimCode.DARK: return ModuleCreatureAnimState.CASTOUT2_LP;
    case SpellCastAnimCode.UP: return ModuleCreatureAnimState.CASTOUT3_LP;
    case SpellCastAnimCode.AREA: return ModuleCreatureAnimState.CASTOUT4_LP;
    case SpellCastAnimCode.JUMP:
    case SpellCastAnimCode.MONSTER:
      return 0;
    case SpellCastAnimCode.FURY: return ModuleCreatureAnimState.CAST_FURY;
    case SpellCastAnimCode.CRUSH: return ModuleCreatureAnimState.CAST_CRUSH;
    case SpellCastAnimCode.MONSTER_FURY: return ModuleCreatureAnimState.CAST_MONSTER_FURY;
    // throw, touch/point and anything unrecognised
    default: return ModuleCreatureAnimState.THROW_SABER_LP;
  }
}

/** Instant-cast path uses ATTACK (0x2719) for 1500 ms. */
export const INSTANT_CAST_ANIM = ModuleCreatureAnimState.ATTACK;
export const INSTANT_CAST_PAUSE_MS = 1500;
