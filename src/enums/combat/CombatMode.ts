/**
 * Retail CSWSCreature combat mode (field49_0x4d2) ↔ SetActivity bits.
 *
 * @file CombatMode.ts
 * @see SetCombatMode @ 0050ee80, SetActivity @ 004f00a0
 */
export enum CombatMode {
  NONE = 0,
  /** Activity bit 0x400 */
  MODE_1 = 1,
  /** Activity bit 0x100 */
  MODE_2 = 2,
  /** Activity bit 0x200 */
  MODE_3 = 3,
  /** Counterspell stance — activity bit 0x800 */
  COUNTERSPELL = 4,
  /** Activity bit 0x1000 (requires empty main hand) */
  MODE_5 = 5,
  /** Activity bit 0x2000 (requires ranged main hand) */
  MODE_6 = 6,
}

/** Activity bit for each combat mode (0x3f00 group). */
export const COMBAT_MODE_ACTIVITY_BIT: Record<number, number> = {
  [CombatMode.MODE_1]: 0x400,
  [CombatMode.MODE_2]: 0x100,
  [CombatMode.MODE_3]: 0x200,
  [CombatMode.COUNTERSPELL]: 0x800,
  [CombatMode.MODE_5]: 0x1000,
  [CombatMode.MODE_6]: 0x2000,
};

/** Mutually exclusive combat-mode activity mask (SetActivity 0x3f00 group). */
export const COMBAT_MODE_ACTIVITY_MASK = 0x3f00;
