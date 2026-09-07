/**
 * ModuleCreatureAmbientState enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ModuleCreatureAmbientState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ModuleCreatureAmbientState {
  IDLE =               0,
  READY =              1,
  /**
   * ambient 2: poisoned pause, and also stun / Mind Trick / Droid Scramble
   * (RecomputeAmbientAnimationState maps SetState 4 / 0x12 / 0x13 → 2).
   */
  PAUSE_POISONED =     2,
  DEAD2 =              3,
  DEAD =               4,
  CHOKE =              5,
  WHIRLWIND =          6,
  HORROR =             7,
  DISABLED =           8,
  PRONE_FORCE_PUSHED = 9,
  F2A2 =               10,
  SLEEP =              11,
  PARALYZED =          12,
  PRONE_FORCE_JUMP =   13,
  PRONE_DEAD =         14,
  /** K2 RecomputeAmbient: SetState 0x0E (Knockdown) → ambient 0x0F */
  KNOCKDOWN =          15,
  /** K2 RecomputeAmbientAnimationState: SetState 0x0F → ambient 0x10 */
  CRUSH =              16,
}
