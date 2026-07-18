import { GameState } from "@/GameState";

/**
 * Retail ExcitedDuration.2da row indices (CSWSCreature::SetExcitedState @ 004f3580).
 * DURATION column is remaining timer in milliseconds; only applied when greater than current.
 */
export enum ExcitedDurationRow {
  None = 0,
  Damage = 1,
  SpellCast = 2,
}

/** Retail SetCombatState(true) always refreshes field58_0x4e4 to 8000ms (@ 004f2610). */
export const COMBAT_STATE_DURATION_MS = 8000;

/** Fallback ExcitedDuration.2da DURATION values when 2DA missing. */
const EXCITED_DURATION_FALLBACK_MS: Record<number, number> = {
  [ExcitedDurationRow.None]: 0,
  [ExcitedDurationRow.Damage]: 10000,
  [ExcitedDurationRow.SpellCast]: 10000,
};

/**
 * Look up ExcitedDuration.2da DURATION for a row (ms).
 */
export function getExcitedDurationMs(row: number): number {
  const table = GameState.TwoDAManager?.datatables?.get('excitedduration');
  if(table){
    const entry = typeof table.getByID === 'function' ? table.getByID(row) : table.rows?.[row];
    if(entry){
      const raw = entry.duration ?? entry.DURATION;
      const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
      if(Number.isFinite(n) && n >= 0) return n;
    }
  }
  return EXCITED_DURATION_FALLBACK_MS[row] ?? 0;
}
