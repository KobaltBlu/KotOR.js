/**
 * AttackResult enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AttackResult.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum AttackResult {
  INVALID         = 0,
  HIT_SUCCESSFUL  = 1,
  CRITICAL_HIT    = 2,
  AUTOMATIC_HIT   = 3,

  MISS            = 4,
  ATTACK_RESISTED = 5,
  ATTACK_FAILED   = 6,

  PARRIED         = 8,
  DEFLECTED       = 9,
}