/**
 * AutoPauseState enum.
 *
 * Retail statusType / reason bytes passed to SetAutoPaused / SetPaused /
 * SetPauseReason (sparse codes, not a compact 0..n index).
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AutoPauseState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum AutoPauseState {
  /** Generic / NWScript SetPause — overlay path uses default TLK 1508. */
  Generic = 0,
  /** Enemy Sighted auto-pause (hides LBL_PRESS). */
  EnemySighted = 1,
  /**
   * Manual / combat pause overlay (TB_PAUSE, pause key via SetPausedByCombat(..., 4)).
   * Not an Autopause Options bit.
   */
  Manual = 4,
  /** End Of Combat Round. */
  CombatRoundEnd = 5,
  /** Action Menu. */
  ActionMenuUsed = 7,
  /** New Target Selected. */
  NewTargetSelected = 8,
  /** Party Killed. */
  PartyMemberKilled = 9,
  /** Present in SetPauseReason only (no SetAutoPaused call site in retail). */
  UnusedReason10 = 10,
  /** Mine Sighted auto-pause (hides LBL_PRESS). */
  MineSighted = 11,
}
