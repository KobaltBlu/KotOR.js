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
 * MELEE_COMBAT_WIELD / FLOURISH-family fireforget g*w1 rows.
 * Partial enum map 2=132,3=214,4=173; else FLOURISH table.
 */
export function meleeCombatWieldAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 1:
      return 91;
    case 2:
      return 132;
    case 3:
      return 214;
    case 4:
      return 173;
    case 5:
      return 222;
    case 6:
      return 136;
    case 7:
    case 9:
      return 244;
    case 8:
    default:
      return 373;
  }
}

/** Same table as FLOURISH server ID 10246. */
export function flourishAnimationRow(weaponType: number): number {
  switch(weaponType){
    case 1:
      return 91;
    case 2:
      return 132;
    case 3:
      return 173;
    case 4:
      return 214;
    case 5:
      return 222;
    case 6:
      return 136;
    case 7:
    case 9:
      return 244;
    case 8:
    default:
      return 373;
  }
}
