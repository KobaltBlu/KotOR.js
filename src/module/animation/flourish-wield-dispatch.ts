/**
 * animations.2da row indices for flourish-related server IDs.
 * MELEE_WIELD (10157) / MELEE_COMBAT_WIELD (10158) from ModuleCreatureAnimState comments
 * and PlayerFlourishWeapons @ 005f4460.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file flourish-wield-dispatch.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/** MELEE_WIELD → G*F1 overlay rows (overlay=1). */
export function meleeWieldAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 2:
      return 377; // G2F1
    case 4:
      return 376; // G4F1
    case 1:
    case 3:
    case 5:
    case 6:
    case 7:
    case 8:
    case 9:
    default:
      return 378; // G3F1
  }
}

/**
 * FLOURISH (10246) / MELEE_COMBAT_WIELD (10158) fireforget g*w1 rows.
 * Same table for both (research §9.2). Combat weapon type → animations.2da row.
 */
export function flourishAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 1:
      return 91;   // g1w1
    case 2:
      return 132;  // g2w1 — single saber / one-hand sword
    case 3:
      return 173;  // g3w1 — double-blade
    case 4:
      return 214;  // g4w1 — dual wield
    case 5:
      return 222;  // g5w1
    case 6:
      return 136;  // c3a2 (ranged dual)
    case 7:
    case 9:
      return 244;  // g7w1
    case 8:
    default:
      return 373;  // equip
  }
}

/** Same g*w1 table as FLOURISH. */
export function meleeCombatWieldAnimationRow(weaponType: number): number {
  return flourishAnimationRow(weaponType);
}
