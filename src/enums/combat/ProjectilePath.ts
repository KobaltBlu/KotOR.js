/**
 * ProjectilePath enum — NWScript PROJECTILE_PATH_TYPE_* plus KotOR path 6 (grenade).
 *
 * @file ProjectilePath.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ProjectilePath {
  DEFAULT        = 0,
  HOMING         = 1,
  BALLISTIC      = 2,
  HIGH_BALLISTIC = 3,
  ACCELERATING   = 4,
  /** Retail SpellCastAndImpact / CalculateLastSpellProjectileTime path 6 (+2500 ms). */
  GRENADE        = 6,
  /** Retail path 7 — used when SpellCastAndImpact arg8 != 0. */
  SPELL_IMPACT_ALT = 7,
}
