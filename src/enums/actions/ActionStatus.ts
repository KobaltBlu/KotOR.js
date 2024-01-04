/**
 * ActionStatus enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionStatus.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ActionStatus {
  FAILED = undefined,
  IN_PROGRESS = 1,
  COMPLETE = 2,
  ERROR = 3,
  WAITING = 4,
};