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
  /** Indicates that the action has failed to complete */
  FAILED = undefined,

  /** Indicates that the action is currently being executed */
  IN_PROGRESS = 1,

  /** Indicates that the action has successfully completed */
  COMPLETE = 2,

  /** Indicates that the action encountered an error during execution */
  ERROR = 3,

  /** Indicates that the action is waiting to be executed */
  WAITING = 4,
};