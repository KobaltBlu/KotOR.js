/**
 * Combat message TLK string IDs and fallbacks.
 *
 * Reva: CSWGuiMainInterface::SetCombatMessage @ 0x00687700 (k1_win_gog_swkotor.exe)
 * - Uses TLK string ID (param_1) to set combat_mode_message_label text
 * - Special IDs: 0xbaf3 (47859) purple, 0xa5ec/0xa5ed/0xa5ee (42476-42478) green, 0xbc50 (48208) clear/default
 *
 * KotOR 1 dialog.tlk combat strings - IDs may vary; fallbacks used when TLK returns empty.
 */
import { AttackResult } from "../enums/combat/AttackResult";

/** Duration to show combat message before auto-hiding (ms). Matches round feedback timing. */
export const COMBAT_MESSAGE_DURATION_MS = 2500;

/** TLK ID for "clear" / no message (Reva: 0xbc50 = 48208) */
export const TLK_COMBAT_CLEAR = 48208;

/** AttackResult -> { tlkId, fallback } for combat menu display */
export const COMBAT_MESSAGE_BY_ATTACK_RESULT: Record<number, { tlkId: number; fallback: string }> = {
  [AttackResult.HIT_SUCCESSFUL]: { tlkId: 0, fallback: "Hit" },
  [AttackResult.CRITICAL_HIT]: { tlkId: 0, fallback: "Critical Hit" },
  [AttackResult.AUTOMATIC_HIT]: { tlkId: 0, fallback: "Hit" },
  [AttackResult.MISS]: { tlkId: 0, fallback: "Miss" },
  [AttackResult.ATTACK_RESISTED]: { tlkId: 0, fallback: "Resisted" },
  [AttackResult.ATTACK_FAILED]: { tlkId: 0, fallback: "Attack Failed" },
  [AttackResult.PARRIED]: { tlkId: 0, fallback: "Parried" },
  [AttackResult.DEFLECTED]: { tlkId: 0, fallback: "Deflected" },
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
  if (!entry) return "";
  if (entry.tlkId > 0) {
    const tlk = tlkGetStringById(entry.tlkId);
    if (tlk?.Value?.trim()) return tlk.Value;
  }
  return entry.fallback;
}
