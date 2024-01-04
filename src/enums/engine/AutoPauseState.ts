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
  CombatRoundEnd = 1,
  EnemySighted = 2,
  MineSighted = 3,
  PartyMemberKilled = 4,
  ActionMenuUsed = 5,
  NewTargetSelected = 6,
}