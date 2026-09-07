import { GameState } from "@/GameState";

/**
 * Spell cast range from ranges.2da (K1/K2 identical rows).
 *
 * | Letter | Row | Label | Primary |
 * |--------|-----|---------------|---------|
 * | P | 0 | SpellRngPers | 0 |
 * | T | 1 | SpellRngTouch | 2.25 |
 * | S | 2 | SpellRngShrt | 10 |
 * | M | 3 | SpellRngMed | 15 |
 * | L | 4 | SpellRngLng | 28 |
 * | W | 19 | SpellRngThrow | 15 |
 *
 * resolve spell range remaps `P` → `T` before
 * reading primary_ranges (approach / MoveTo distance). Targeting for personal
 * powers is still forced onto the caster by ForceMenu / TalentSpell.
 */

const SPELL_RANGE_ROW: Record<string, number> = {
  P: 0,
  T: 1,
  S: 2,
  M: 3,
  L: 4,
  W: 19,
};

/** Fallbacks when ranges.2da is not loaded (match CSV). */
const SPELL_RANGE_FALLBACK: Record<string, number> = {
  P: 0,
  T: 2.25,
  S: 10,
  M: 15,
  L: 28,
  W: 15,
};

/** resolve spell range: personal uses Touch primary for distance. */
export function normalizeSpellRangeLetter(rangeLetter: string): string {
  const key = (rangeLetter || '').toUpperCase();
  return key === 'P' ? 'T' : key;
}

export function getSpellRangeRowIndex(rangeLetter: string): number {
  const key = normalizeSpellRangeLetter(rangeLetter);
  return Object.prototype.hasOwnProperty.call(SPELL_RANGE_ROW, key)
    ? SPELL_RANGE_ROW[key]
    : -1;
}

/**
 * Primary cast range for a spells.2da `range` letter.
 * Personal (`P`) uses Touch primary (resolve spell range).
 */
export function resolveSpellCastRange(rangeLetter: string): number {
  const key = normalizeSpellRangeLetter(rangeLetter);
  const rowIndex = SPELL_RANGE_ROW[key];
  if(rowIndex !== undefined){
    const row = GameState.SWRuleSet?.ranges?.[rowIndex];
    if(row && typeof row.primaryRange === 'number'){
      return row.primaryRange;
    }
    return SPELL_RANGE_FALLBACK[key] ?? 0;
  }
  return SPELL_RANGE_FALLBACK[key] ?? 0;
}

/**
 * Whether caster is in cast range of target.
 * Same-object always in range; otherwise distance < primary (P uses Touch).
 */
export function isWithinSpellCastRange(
  rangeLetter: string,
  distance: number,
  sameObject: boolean
): boolean {
  if(sameObject) return true;
  const max = resolveSpellCastRange(rangeLetter);
  if(max <= 0) return false;
  return distance < max;
}

/** Counter-spell engage distance — SpellRngMed (row 3). */
export function getCounterSpellRange(): number {
  return resolveSpellCastRange('M') || 15.0;
}
