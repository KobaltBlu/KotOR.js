/**
 * Combat message TLK string references and string fallbacks for the UI.
 * String IDs are resolved from `dialog.tlk`; if empty, the paired fallback text is shown.
 */
import { AttackResult } from '@/enums/combat/AttackResult';

/** Duration to show combat message before auto-hiding (ms). Matches round feedback timing. */
export const COMBAT_MESSAGE_DURATION_MS = 2500;

/** TLK strref in KotOR 1 `dialog.tlk` used to clear the combat message line. */
export const TLK_COMBAT_CLEAR = 48208;

/** AttackResult -> { tlkId, fallback } for combat menu display */
export const COMBAT_MESSAGE_BY_ATTACK_RESULT: Record<number, { tlkId: number; fallback: string }> = {
  [AttackResult.HIT_SUCCESSFUL]: { tlkId: 0, fallback: 'Hit' },
  [AttackResult.CRITICAL_HIT]: { tlkId: 0, fallback: 'Critical Hit' },
  [AttackResult.AUTOMATIC_HIT]: { tlkId: 0, fallback: 'Hit' },
  [AttackResult.MISS]: { tlkId: 0, fallback: 'Miss' },
  [AttackResult.ATTACK_RESISTED]: { tlkId: 0, fallback: 'Resisted' },
  [AttackResult.ATTACK_FAILED]: { tlkId: 0, fallback: 'Attack Failed' },
  [AttackResult.PARRIED]: { tlkId: 0, fallback: 'Parried' },
  [AttackResult.DEFLECTED]: { tlkId: 0, fallback: 'Deflected' },
};

/**
 * Resolve combat message text from AttackResult.
 * Uses TLK when tlkId > 0 and TLK returns non-empty; otherwise uses fallback.
 */
export function getCombatMessageText(
  attackResult: AttackResult,
  tlkGetStringById: (id: number) => { Value: string }
): string {
  const entry = COMBAT_MESSAGE_BY_ATTACK_RESULT[attackResult];
  if (!entry) return '';
  if (entry.tlkId > 0) {
    const tlk = tlkGetStringById(entry.tlkId);
    if (tlk?.Value?.trim()) return tlk.Value;
  }
  return entry.fallback;
}
