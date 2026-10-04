/**
 * ProjectilePath enum — NWScript PROJECTILE_PATH_TYPE_* plus KotOR extensions.
 *
 * Path 6 spiral adds +2500 ms hang. Grenade throws use path 11 (ground ballistic).
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
  /** Spiral approach + late hang (+2500 ms flight). */
  SPIRAL         = 6,
  /** Linked / SpellCastAndImpact alt path. */
  LINKED         = 7,
  /** Bounce / ground-check path. */
  BOUNCE         = 8,
  /** Grenade throw — multi-segment ground ballistic (spells.2da projtype=grenade). */
  GRENADE        = 11,
  /** path 7 legacy alias — used when SpellCastAndImpact arg8 != 0. */
  SPELL_IMPACT_ALT = 7,
}
