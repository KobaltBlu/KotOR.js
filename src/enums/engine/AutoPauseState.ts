/**
 * AutoPauseState enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AutoPauseState.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum AutoPauseState {
  Generic = 0,
  EnemySighted = 1,
  CombatRoundEnd = 5,
  ActionMenuUsed = 7,
  NewTargetSelected = 8,
  PartyMemberKilled = 9,
  MineSighted = 11,
}